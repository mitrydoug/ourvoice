"""Blockchain event indexer — subscribes to new blocks via WebSocket and indexes
``StatementAdded`` and ``StatementEngaged`` events into Meilisearch.

Supports historical backfill via the ``backfill_from`` parameter, which
accepts:
- ISO datetime strings (``2025-01-01``, ``2025-06-15T12:00:00``)
- Relative time deltas (``30d``, ``24h``, ``90m``)
- Explicit block numbers (``block:12345``)
- The keyword ``all`` to replay from genesis

Stale documents (those whose ``lastEngagement`` is older than a configurable
TTL) are periodically evicted from the index.

Can be run standalone (``python -m symvolia.main``) or embedded in the combined
process via the ``run_indexer`` coroutine.
"""

import asyncio
import contextlib
import json
import logging
import os
import re
import time
from collections.abc import Sequence
from datetime import datetime, timedelta, timezone
from importlib.resources import files
from typing import Any

import meilisearch
from web3 import AsyncHTTPProvider, AsyncWeb3, WebSocketProvider

from symvolia.search_query import STOP_WORDS

logger = logging.getLogger(__name__)


# Meilisearch index name for statements.
STATEMENTS_INDEX = "statements"

# Optional semantic similarity support. Meilisearch downloads the configured
# Hugging Face model on first use and stores generated document embeddings.
SEMANTIC_EMBEDDER_NAME = os.getenv("MEILI_SEMANTIC_EMBEDDER_NAME", "statement-text")
SEMANTIC_EMBEDDER_MODEL = os.getenv(
    "MEILI_SEMANTIC_EMBEDDER_MODEL",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
)
SEMANTIC_EMBEDDER_DOCUMENT_TEMPLATE = os.getenv(
    "MEILI_SEMANTIC_EMBEDDER_DOCUMENT_TEMPLATE", "{{doc.statementText}}"
)
MEILI_TASK_TIMEOUT_MS = int(os.getenv("MEILI_TASK_TIMEOUT_MS", "300000"))
MEILI_TASK_POLL_INTERVAL_MS = int(os.getenv("MEILI_TASK_POLL_INTERVAL_MS", "500"))

# Maximum number of blocks to request per ``get_logs`` call during catch-up.
_INDEX_RANGE_BATCH_SIZE = 1000

# Default maximum age (in seconds) for documents without recent engagement.
# Documents whose ``lastEngagement`` is older than this are periodically
# evicted from the search index.  7 days = 604_800 seconds.
DEFAULT_EVICTION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

# How often (in seconds) the eviction sweep runs.
_EVICTION_INTERVAL_SECONDS = 60 * 60  # 1 hour

# Web3.py defaults this queue to 500. Local stress seeding can mine many blocks
# faster than live indexing can drain one header at a time, so keep a larger
# buffer and coalesce queued headers into block-range indexing work.
DEFAULT_WEB3_SUBSCRIPTION_RESPONSE_QUEUE_SIZE = 10_000
_LIVE_HEAD_DRAIN_LIMIT = 5_000
_LIVE_IDLE_POLL_SECONDS = 2.0


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def semantic_search_enabled() -> bool:
    return _env_bool("MEILI_SEMANTIC_SEARCH_ENABLED")


def _load_forum_abi() -> list[dict[str, Any]]:
    """Load the Forum ABI from the package data."""
    abi_path = files("symvolia").joinpath("ForumABI.json")
    return json.loads(abi_path.read_text())["abi"]


def _wait_task(
    index_or_client: Any,
    task_info: Any,
    description: str,
    *,
    raise_on_failure: bool = False,
) -> None:
    """Block until a Meilisearch task completes and log failures.

    Meilisearch operations (add_documents, update_documents,
    update_filterable_attributes, etc.) are enqueued as async server-side
    tasks and return a TaskInfo immediately.  Without waiting, the caller
    has no way to know whether the operation actually succeeded.

    Accepts either a ``meilisearch.Client`` or a ``meilisearch.Index``;
    both expose ``wait_for_task``.
    """
    result = index_or_client.wait_for_task(
        task_info.task_uid,
        timeout_in_ms=MEILI_TASK_TIMEOUT_MS,
        interval_in_ms=MEILI_TASK_POLL_INTERVAL_MS,
    )
    if result.status != "succeeded":
        message = (
            f"Meilisearch task failed [{description}]: "
            f"status={result.status} error={getattr(result, 'error', None)}"
        )
        logger.error(
            message,
        )
        if raise_on_failure:
            raise RuntimeError(message)
    else:
        logger.debug("Meilisearch task succeeded [%s]", description)


def _ensure_index(client: meilisearch.Client) -> None:
    """Create the statements index if it doesn't exist and configure searchable
    attributes."""
    try:
        client.get_index(STATEMENTS_INDEX)
    except meilisearch.errors.MeilisearchApiError:
        task = client.create_index(STATEMENTS_INDEX, {"primaryKey": "id"})
        _wait_task(client, task, "create_index", raise_on_failure=True)

    # Ensure searchable/filterable attributes are configured.
    _wait_task(
        client,
        client.index(STATEMENTS_INDEX).update_searchable_attributes(["statementText"]),
        "update_searchable_attributes",
        raise_on_failure=True,
    )
    _wait_task(
        client,
        client.index(STATEMENTS_INDEX).update_filterable_attributes(
            ["statementId", "lastEngagement", "forumAddress"]
        ),
        "update_filterable_attributes",
        raise_on_failure=True,
    )
    _wait_task(
        client,
        client.index(STATEMENTS_INDEX).update_sortable_attributes(["lastEngagement"]),
        "update_sortable_attributes",
        raise_on_failure=True,
    )

    # Configure stop words so common filler words don't dilute relevance
    # when users search with full sentences (e.g. "similar statements" flow).
    _wait_task(
        client,
        client.index(STATEMENTS_INDEX).update_stop_words(sorted(STOP_WORDS)),
        "update_stop_words",
        raise_on_failure=True,
    )

    if semantic_search_enabled():
        _wait_task(
            client,
            client.index(STATEMENTS_INDEX).update_embedders(
                {
                    SEMANTIC_EMBEDDER_NAME: {
                        "source": "huggingFace",
                        "model": SEMANTIC_EMBEDDER_MODEL,
                        "documentTemplate": SEMANTIC_EMBEDDER_DOCUMENT_TEMPLATE,
                    }
                }
            ),
            "update_embedders",
            raise_on_failure=True,
        )


def ensure_search_index(client: meilisearch.Client) -> None:
    """Ensure the Meilisearch statements index and settings are configured."""
    _ensure_index(client)


# ---------------------------------------------------------------------------
# Backfill helpers
# ---------------------------------------------------------------------------

# Pattern for relative time deltas: e.g. "30d", "24h", "90m"
_DELTA_RE = re.compile(r"^(\d+)([dhm])$", re.IGNORECASE)


def normalize_forum_contract_address(address: str) -> str:
    """Return a checksum-normalized forum contract address."""
    return AsyncWeb3.to_checksum_address(address.strip())


def parse_forum_contract_addresses(values: str | Sequence[str]) -> list[str]:
    """Parse one or more forum contract addresses from CLI/env inputs."""
    raw_values = [values] if isinstance(values, str) else list(values)
    addresses: list[str] = []
    seen: set[str] = set()
    for raw_value in raw_values:
        for candidate in re.split(r"[\s,]+", raw_value.strip()):
            if not candidate:
                continue
            normalized = normalize_forum_contract_address(candidate)
            address_key = normalized.lower()
            if address_key in seen:
                continue
            seen.add(address_key)
            addresses.append(normalized)
    return addresses


def statement_document_id(forum_contract_address: str, statement_id: int) -> str:
    """Build a document ID that remains unique across multiple forums."""
    return f"{forum_contract_address.lower()}-{statement_id}"


def _statement_document_id(forum_contract_address: str, statement_id: int) -> str:
    return statement_document_id(forum_contract_address, statement_id)


def _parse_backfill_param(value: str) -> int | datetime | None:
    """Parse a ``BACKFILL_FROM`` value into a target.

    Returns:
        ``0`` for ``"all"`` (genesis),
        a positive ``int`` for an explicit block number,
        a ``datetime`` for ISO timestamps or relative deltas,
        or ``None`` if *value* is empty / unrecognised.
    """
    value = value.strip()
    if not value:
        return None

    # Keyword: replay everything from the start of the chain.
    if value.lower() == "all":
        return 0

    # Explicit block number: "block:12345"
    if value.lower().startswith("block:"):
        return int(value.split(":", 1)[1])

    # Relative delta: "30d", "24h", "90m"
    m = _DELTA_RE.match(value)
    if m:
        amount, unit = int(m.group(1)), m.group(2).lower()
        delta = {
            "d": timedelta(days=amount),
            "h": timedelta(hours=amount),
            "m": timedelta(minutes=amount),
        }[unit]
        return datetime.now(tz=timezone.utc) - delta

    # ISO datetime: "2025-01-01" or "2025-06-15T12:00:00"
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            dt = datetime.strptime(value, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue

    logger.warning("Unrecognised BACKFILL_FROM value %r — skipping backfill", value)
    return None


async def _find_block_by_timestamp(w3: AsyncWeb3, target_ts: int) -> int:
    """Find the first block whose timestamp >= *target_ts*.

    Bootstraps a block-time estimate from a small local sample, then
    iteratively jumps toward the target — refining the estimate after
    each hop using the actual time span traversed.  Once the remaining
    search window is small enough, finishes with a standard binary
    search.

    Falls back to block ``1`` if the target predates the chain.
    """
    latest = await w3.eth.get_block("latest")
    hi: int = latest["number"]
    if hi == 0:
        return 0

    genesis = await w3.eth.get_block(0)
    if target_ts <= genesis["timestamp"]:
        return 0
    if target_ts >= latest["timestamp"]:
        return hi

    # ── Iterative interpolation ────────────────────────────────────
    # Each hop jumps to where the target *should* be according to the
    # current block-time estimate, then refines the estimate using
    # the lo–hi window that brackets the target.
    lo, lo_ts = 0, genesis["timestamp"]
    hi, hi_ts = hi, latest["timestamp"]

    for _ in range(12):
        if hi - lo <= 16:
            break

        # Estimate block time across the current search window.
        avg_block_time = (hi_ts - lo_ts) / (hi - lo)
        if avg_block_time <= 0:
            break

        # Interpolate where the target should be within [lo, hi].
        blocks_away = int((target_ts - lo_ts) / avg_block_time)
        cand_num = max(lo, min(lo + blocks_away, hi))

        # Avoid stalling on the same block (fall back to midpoint).
        if cand_num == lo or cand_num == hi:
            cand_num = (lo + hi) // 2

        cand_block = await w3.eth.get_block(cand_num)
        cand_ts: int = cand_block["timestamp"]

        # Narrow the search window.
        if cand_ts < target_ts:
            lo, lo_ts = cand_num, cand_ts
        else:
            hi, hi_ts = cand_num, cand_ts

    # ── Binary search over the remaining narrow range ──────────────
    while lo < hi:
        mid = (lo + hi) // 2
        block = await w3.eth.get_block(mid)
        if block["timestamp"] < target_ts:
            lo = mid + 1
        else:
            hi = mid

    return lo


async def _resolve_start_block(w3: AsyncWeb3, backfill_from: str) -> int | None:
    """Convert a ``BACKFILL_FROM`` value to a concrete block number.

    Returns ``None`` when no backfill is requested.
    """
    parsed = _parse_backfill_param(backfill_from)
    if parsed is None:
        return None
    if isinstance(parsed, int):
        return parsed
    # datetime → unix timestamp → binary search
    target_ts = int(parsed.timestamp())
    block = await _find_block_by_timestamp(w3, target_ts)
    logger.info(
        "Resolved backfill timestamp %s to block #%d",
        parsed.isoformat(),
        block,
    )
    return block


async def _latest_chain_block_number(w3: AsyncWeb3) -> int:
    """Return the latest block number from the connected chain."""
    return int((await w3.eth.get_block("latest"))["number"])


@contextlib.asynccontextmanager
async def _read_web3_provider(
    read_node_url: str,
    subscription_node_url: str,
    subscription_w3: AsyncWeb3,
) -> Any:
    """Yield a Web3 client for read RPCs, reusing the subscription client if needed."""
    if read_node_url == subscription_node_url:
        yield subscription_w3
        return

    read_w3 = AsyncWeb3(AsyncHTTPProvider(read_node_url))
    try:
        yield read_w3
    finally:
        await read_w3.provider.disconnect()


async def _initial_index_cursor(w3: AsyncWeb3, backfill_from: str) -> int:
    """Resolve the first block the indexer should scan."""
    start_block = await _resolve_start_block(w3, backfill_from)
    if start_block is not None:
        logger.info("Initial index cursor resolved to block #%d", start_block)
        return start_block

    latest_block = await _latest_chain_block_number(w3)
    cursor = latest_block + 1
    logger.info(
        "No backfill requested; live indexing will start at future block #%d",
        cursor,
    )
    return cursor


async def _engagement_docs(
    w3: AsyncWeb3,
    logs: list[Any],
    forum_contract_address: str,
) -> list[dict[str, Any]]:
    """Build Meilisearch partial-update documents for engagement events.

    Each document sets ``lastEngagement`` to the block timestamp (unix seconds).
    If multiple engagement events arrive in the same batch for the same
    statement, only the latest timestamp is kept.
    """
    # Collect unique block numbers to batch-fetch timestamps.
    block_numbers: set[int] = {log.blockNumber for log in logs}
    block_timestamps: dict[int, int] = {}
    for bn in block_numbers:
        block = await w3.eth.get_block(bn)
        block_timestamps[bn] = block["timestamp"]

    # Deduplicate: keep the latest engagement per statement.
    latest: dict[int, int] = {}  # statementId -> timestamp
    for log in logs:
        sid = log.args.statementId
        ts = block_timestamps[log.blockNumber]
        if sid not in latest or ts > latest[sid]:
            latest[sid] = ts

    return [
        {
            "id": _statement_document_id(forum_contract_address, sid),
            "lastEngagement": ts,
        }
        for sid, ts in latest.items()
    ]


def _coerce_block_number(value: Any) -> int | None:
    """Return an integer block number from Web3 subscription payload values."""
    if value is None:
        return None
    if isinstance(value, str):
        return int(value, 16 if value.startswith("0x") else 10)
    return int(value)


def _subscription_block_number(response: Any) -> int | None:
    """Extract a block number from an ``eth_subscribe('newHeads')`` response."""
    block = None
    if isinstance(response, dict):
        block = response.get("result")
        if not isinstance(block, dict):
            params = response.get("params")
            if isinstance(params, dict):
                block = params.get("result")

    if not isinstance(block, dict):
        return None
    return _coerce_block_number(block.get("number"))


def _subscription_response_queue(subscription_stream: Any) -> Any | None:
    """Return the Web3 provider's raw subscription response queue, if present."""
    try:
        return (
            subscription_stream.provider._request_processor._subscription_response_queue
        )
    except AttributeError:
        return None


def _latest_subscription_block_number(
    subscription_stream: Any,
    first_response: Any | None = None,
) -> int | None:
    """Drain currently queued block headers without blocking.

    ``process_subscriptions()`` can skip internal responses before yielding a
    block header, so using ``anext()`` as a drain can block the indexer. This
    function reads already-buffered raw subscription responses directly and only
    uses them to coalesce the newest block number.
    """
    latest_block_number = (
        _subscription_block_number(first_response)
        if first_response is not None
        else None
    )
    queue = _subscription_response_queue(subscription_stream)
    if queue is None:
        return latest_block_number

    drained = 0

    while drained < _LIVE_HEAD_DRAIN_LIMIT:
        try:
            response = queue.get_nowait()
        except asyncio.QueueEmpty:
            break

        if isinstance(response, Exception):
            raise response

        block_number = _subscription_block_number(response)
        if block_number is not None:
            latest_block_number = block_number
        else:
            logger.debug("Drained non-block subscription response: %r", response)
        drained += 1

    listen_event = getattr(subscription_stream.provider, "_listen_event", None)
    if listen_event is not None and not listen_event.is_set():
        listen_event.set()

    if drained:
        logger.debug(
            "Coalesced %d queued subscription response(s); newest block #%s",
            drained,
            latest_block_number,
        )

    return latest_block_number


async def _block_timestamps(w3: AsyncWeb3, block_numbers: set[int]) -> dict[int, int]:
    """Fetch unix timestamps for a set of block numbers."""
    timestamps: dict[int, int] = {}
    for block_number in block_numbers:
        block = await w3.eth.get_block(block_number)
        timestamps[block_number] = int(block["timestamp"])
    return timestamps


async def _index_forum_block_range(
    w3: AsyncWeb3,
    contract: Any,
    index: Any,
    forum_contract_address: str,
    from_block: int,
    to_block: int,
) -> None:
    """Index tracked events for one forum contract across a block range."""
    added_logs, engaged_logs = await asyncio.gather(
        contract.events.StatementAdded().get_logs(
            from_block=from_block,
            to_block=to_block,
        ),
        contract.events.StatementEngaged().get_logs(
            from_block=from_block,
            to_block=to_block,
        ),
    )

    range_label = (
        f"block #{from_block}"
        if from_block == to_block
        else f"blocks #{from_block}-{to_block}"
    )

    if added_logs:
        added_block_timestamps = await _block_timestamps(
            w3,
            {log.blockNumber for log in added_logs},
        )
        docs = [
            {
                "id": _statement_document_id(
                    forum_contract_address,
                    log.args.id,
                ),
                "statementId": log.args.id,
                "statementText": log.args.statement,
                "forumAddress": forum_contract_address,
                "lastEngagement": added_block_timestamps[log.blockNumber],
            }
            for log in added_logs
        ]
        logger.debug(
            "[live] add_documents(%s) %s:\n%s",
            forum_contract_address,
            range_label,
            json.dumps(docs, indent=2),
        )
        _wait_task(
            index,
            index.add_documents(docs),
            f"live add_documents({forum_contract_address} {range_label})",
        )
        logger.info(
            "Indexed %d statement(s) from contract %s in %s",
            len(docs),
            forum_contract_address,
            range_label,
        )

    if engaged_logs:
        engagement_docs = await _engagement_docs(
            w3,
            engaged_logs,
            forum_contract_address,
        )
        logger.debug(
            "[live] update_documents(%s) %s:\n%s",
            forum_contract_address,
            range_label,
            json.dumps(engagement_docs, indent=2),
        )
        _wait_task(
            index,
            index.update_documents(engagement_docs),
            f"live update_documents({forum_contract_address} {range_label})",
        )
        logger.debug(
            "Updated engagement for %d statement(s) from contract %s in %s",
            len(engagement_docs),
            forum_contract_address,
            range_label,
        )


async def _index_missing_blocks(
    w3: AsyncWeb3,
    contracts: Sequence[tuple[str, Any]],
    index: Any,
    cursor: int,
    target_block: int,
    subscription_stream: Any | None = None,
) -> int:
    """Index all missing blocks from ``cursor`` through ``target_block``.

    Returns the next block that still needs indexing. If a subscription stream
    is available, queued block headers are coalesced between batches so catch-up
    and live indexing share one cursor and the Web3 queue is drained regularly.
    """
    if cursor > target_block:
        logger.debug(
            "No missing blocks to index (cursor=%d, target=%d)",
            cursor,
            target_block,
        )
        return cursor

    while cursor <= target_block:
        batch_end = min(cursor + _INDEX_RANGE_BATCH_SIZE - 1, target_block)
        logger.debug("Scanning blocks %d → %d", cursor, batch_end)

        await asyncio.gather(
            *(
                _index_forum_block_range(
                    w3,
                    contract,
                    index,
                    forum_contract_address,
                    cursor,
                    batch_end,
                )
                for forum_contract_address, contract in contracts
            )
        )
        cursor = batch_end + 1
        if subscription_stream is not None:
            queued_block = _latest_subscription_block_number(subscription_stream)
            if queued_block is not None and queued_block > target_block:
                target_block = queued_block

        latest_chain_block = await _latest_chain_block_number(w3)
        if latest_chain_block > target_block:
            target_block = latest_chain_block

    return cursor


async def _eviction_loop(
    index: Any,
    eviction_max_age_seconds: int,
) -> None:
    """Periodically delete documents whose ``lastEngagement`` is stale.

    Runs forever; safe to cancel.
    """
    while True:
        await asyncio.sleep(_EVICTION_INTERVAL_SECONDS)
        try:
            cutoff = int(time.time()) - eviction_max_age_seconds
            result = index.delete_documents(filter=f"lastEngagement < {cutoff}")
            logger.info(
                "Eviction sweep: submitted task %s (cutoff ts=%d)",
                result.task_uid,
                cutoff,
            )
        except Exception:
            logger.exception("Eviction sweep failed")


async def run_indexers(
    meili_client: meilisearch.Client,
    forum_contract_addresses: Sequence[str],
    ethereum_node_url: str,
    ethereum_read_node_url: str | None = None,
    backfill_from: str = "",
    eviction_max_age_seconds: int = DEFAULT_EVICTION_MAX_AGE_SECONDS,
    web3_subscription_response_queue_size: int = (
        DEFAULT_WEB3_SUBSCRIPTION_RESPONSE_QUEUE_SIZE
    ),
) -> None:
    """Subscribe to new blocks and index tracked events for multiple forums.

    ``backfill_from`` selects the initial block cursor. The same range-indexing
    loop handles historical catch-up and live block headers.

    Documents whose ``lastEngagement`` is older than
    *eviction_max_age_seconds* are periodically removed from the index.

    This coroutine runs indefinitely.  It is safe to cancel via
    ``task.cancel()``.
    """
    normalized_forum_contract_addresses = parse_forum_contract_addresses(
        forum_contract_addresses
    )
    if not normalized_forum_contract_addresses:
        raise ValueError("At least one forum contract address is required")

    forum_abi = _load_forum_abi()
    _ensure_index(meili_client)
    index = meili_client.index(STATEMENTS_INDEX)
    read_node_url = ethereum_read_node_url or ethereum_node_url

    logger.info(
        "Starting indexer for %d contract(s) via %s "
        "(read RPC=%s, eviction TTL=%ds, web3 subscription queue=%d)",
        len(normalized_forum_contract_addresses),
        ethereum_node_url,
        read_node_url,
        eviction_max_age_seconds,
        web3_subscription_response_queue_size,
    )

    # Start the eviction background loop.
    eviction_task = asyncio.create_task(_eviction_loop(index, eviction_max_age_seconds))

    next_block_to_index: int | None = None

    try:
        while True:
            try:
                async with AsyncWeb3(
                    WebSocketProvider(
                        ethereum_node_url,
                        subscription_response_queue_size=(
                            web3_subscription_response_queue_size
                        ),
                    )
                ) as subscription_w3:
                    async with _read_web3_provider(
                        read_node_url,
                        ethereum_node_url,
                        subscription_w3,
                    ) as read_w3:
                        contracts = [
                            (
                                forum_contract_address,
                                read_w3.eth.contract(
                                    address=forum_contract_address,
                                    abi=forum_abi,
                                ),
                            )
                            for forum_contract_address in normalized_forum_contract_addresses
                        ]

                        # Subscribe before catch-up so blocks mined during the
                        # initial range scan are queued and share the same cursor.
                        await subscription_w3.eth.subscribe("newHeads")
                        logger.info("Subscribed to new block headers")
                        subscription_stream = (
                            subscription_w3.socket.process_subscriptions()
                        )

                        if next_block_to_index is None:
                            next_block_to_index = await _initial_index_cursor(
                                read_w3,
                                backfill_from,
                            )
                        else:
                            logger.info(
                                "Resuming index cursor at block #%d",
                                next_block_to_index,
                            )

                        latest_block = await _latest_chain_block_number(read_w3)
                        logger.info(
                            "Initial catch-up target is block #%d (cursor #%d)",
                            latest_block,
                            next_block_to_index,
                        )
                        next_block_to_index = await _index_missing_blocks(
                            read_w3,
                            contracts,
                            index,
                            next_block_to_index,
                            latest_block,
                            subscription_stream,
                        )

                        while True:
                            queued_block = _latest_subscription_block_number(
                                subscription_stream
                            )
                            latest_block = await _latest_chain_block_number(read_w3)
                            target_block = max(
                                latest_block,
                                (
                                    queued_block
                                    if queued_block is not None
                                    else latest_block
                                ),
                            )

                            if next_block_to_index <= target_block:
                                next_block_to_index = await _index_missing_blocks(
                                    read_w3,
                                    contracts,
                                    index,
                                    next_block_to_index,
                                    target_block,
                                    subscription_stream,
                                )
                                continue

                            await asyncio.sleep(_LIVE_IDLE_POLL_SECONDS)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Indexer connection error, reconnecting in 5 seconds…")
                await asyncio.sleep(5)
    except asyncio.CancelledError:
        logger.info("Indexer cancelled, shutting down")
        eviction_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await eviction_task
        raise
