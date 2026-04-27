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

Can be run standalone (``python -m ourvoice.main``) or embedded in the combined
process via the ``run_indexer`` coroutine.
"""

import asyncio
import contextlib
import json
import logging
import re
import time
from collections.abc import Sequence
from datetime import datetime, timedelta, timezone
from importlib.resources import files
from typing import Any

import meilisearch
from web3 import AsyncWeb3, WebSocketProvider

logger = logging.getLogger(__name__)


# Meilisearch index name for statements.
STATEMENTS_INDEX = "statements"

# Maximum number of blocks to request per ``get_logs`` call during backfill.
_BACKFILL_BATCH_SIZE = 1000

# Default maximum age (in seconds) for documents without recent engagement.
# Documents whose ``lastEngagement`` is older than this are periodically
# evicted from the search index.  7 days = 604_800 seconds.
DEFAULT_EVICTION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

# How often (in seconds) the eviction sweep runs.
_EVICTION_INTERVAL_SECONDS = 60 * 60  # 1 hour


def _load_forum_abi() -> list[dict[str, Any]]:
    """Load the Forum ABI from the package data."""
    abi_path = files("ourvoice").joinpath("ForumABI.json")
    return json.loads(abi_path.read_text())["abi"]


def _wait_task(index_or_client: Any, task_info: Any, description: str) -> None:
    """Block until a Meilisearch task completes and log failures.

    Meilisearch operations (add_documents, update_documents,
    update_filterable_attributes, etc.) are enqueued as async server-side
    tasks and return a TaskInfo immediately.  Without waiting, the caller
    has no way to know whether the operation actually succeeded.

    Accepts either a ``meilisearch.Client`` or a ``meilisearch.Index``;
    both expose ``wait_for_task``.
    """
    result = index_or_client.wait_for_task(task_info.task_uid)
    if result.status != "succeeded":
        logger.error(
            "Meilisearch task failed [%s]: status=%s error=%s",
            description,
            result.status,
            getattr(result, "error", None),
        )
    else:
        logger.debug("Meilisearch task succeeded [%s]", description)


def _ensure_index(client: meilisearch.Client) -> None:
    """Create the statements index if it doesn't exist and configure searchable
    attributes."""
    try:
        client.get_index(STATEMENTS_INDEX)
    except meilisearch.errors.MeilisearchApiError:
        task = client.create_index(STATEMENTS_INDEX, {"primaryKey": "id"})
        _wait_task(client, task, "create_index")

    # Ensure searchable/filterable attributes are configured.
    _wait_task(
        client,
        client.index(STATEMENTS_INDEX).update_searchable_attributes(["statementText"]),
        "update_searchable_attributes",
    )
    _wait_task(
        client,
        client.index(STATEMENTS_INDEX).update_filterable_attributes(
            ["statementId", "lastEngagement", "forumAddress"]
        ),
        "update_filterable_attributes",
    )
    _wait_task(
        client,
        client.index(STATEMENTS_INDEX).update_sortable_attributes(["lastEngagement"]),
        "update_sortable_attributes",
    )

    # Configure stop words so common filler words don't dilute relevance
    # when users search with full sentences (e.g. "similar statements" flow).
    client.index(STATEMENTS_INDEX).update_stop_words(
        [
            "a",
            "an",
            "and",
            "are",
            "as",
            "at",
            "be",
            "but",
            "by",
            "do",
            "for",
            "from",
            "has",
            "have",
            "he",
            "her",
            "his",
            "how",
            "i",
            "if",
            "in",
            "is",
            "it",
            "its",
            "let",
            "my",
            "not",
            "of",
            "on",
            "or",
            "our",
            "own",
            "she",
            "so",
            "than",
            "that",
            "the",
            "their",
            "them",
            "then",
            "there",
            "these",
            "they",
            "this",
            "to",
            "too",
            "us",
            "very",
            "was",
            "we",
            "were",
            "what",
            "when",
            "which",
            "who",
            "will",
            "with",
            "would",
            "you",
            "your",
            "can",
            "could",
            "did",
            "does",
            "had",
            "may",
            "might",
            "must",
            "need",
            "shall",
            "should",
        ]
    )


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


def _statement_document_id(forum_contract_address: str, statement_id: int) -> str:
    """Build a document ID that remains unique across multiple forums."""
    return f"{forum_contract_address.lower()}-{statement_id}"


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


async def _backfill(
    w3: AsyncWeb3,
    contract: Any,
    index: Any,
    from_block: int,
    forum_contract_address: str,
) -> None:
    """Fetch historical ``StatementAdded`` and ``StatementEngaged`` events and
    index them."""
    latest_block: int = (await w3.eth.get_block("latest"))["number"]
    if from_block > latest_block:
        logger.info(
            "Backfill: start block %d > latest %d, nothing to do",
            from_block,
            latest_block,
        )
        return

    logger.info(
        "Backfill: scanning blocks %d → %d for contract %s…",
        from_block,
        latest_block,
        forum_contract_address,
    )

    total_added = 0
    total_engaged = 0
    cursor = from_block
    while cursor <= latest_block:
        end = min(cursor + _BACKFILL_BATCH_SIZE - 1, latest_block)

        # --- StatementAdded events ---
        added_logs = await contract.events.StatementAdded().get_logs(
            from_block=cursor,
            to_block=end,
        )
        if added_logs:
            # Resolve block timestamps so each document gets a
            # lastEngagement value (prevents premature eviction).
            added_block_nums: set[int] = {log.blockNumber for log in added_logs}
            added_block_ts: dict[int, int] = {}
            for bn in added_block_nums:
                blk = await w3.eth.get_block(bn)
                added_block_ts[bn] = blk["timestamp"]

            docs = [
                {
                    "id": _statement_document_id(forum_contract_address, log.args.id),
                    "statementId": log.args.id,
                    "statementText": log.args.statement,
                    "forumAddress": forum_contract_address,
                    "lastEngagement": added_block_ts[log.blockNumber],
                }
                for log in added_logs
            ]
            logger.debug(
                "[backfill] add_documents(%s):\n%s",
                forum_contract_address,
                json.dumps(docs, indent=2),
            )
            _wait_task(
                index,
                index.add_documents(docs),
                f"backfill add_documents({forum_contract_address})",
            )
            total_added += len(docs)

        # --- StatementEngaged events ---
        engaged_logs = await contract.events.StatementEngaged().get_logs(
            from_block=cursor,
            to_block=end,
        )
        if engaged_logs:
            # Resolve block timestamps for each engagement event.
            engagement_updates = await _engagement_docs(
                w3,
                engaged_logs,
                forum_contract_address,
            )
            logger.debug(
                "[backfill] update_documents(%s):\n%s",
                forum_contract_address,
                json.dumps(engagement_updates, indent=2),
            )
            _wait_task(
                index,
                index.update_documents(engagement_updates),
                f"backfill update_documents({forum_contract_address})",
            )
            total_engaged += len(engagement_updates)

        cursor = end + 1

    logger.info(
        "Backfill complete for contract %s: indexed %d statement(s), %d engagement(s)",
        forum_contract_address,
        total_added,
        total_engaged,
    )


async def _index_forum_block(
    contract: Any,
    index: Any,
    forum_contract_address: str,
    block_number: int,
    block_timestamp: int,
) -> None:
    """Index all tracked events for one forum contract in a single block."""
    added_logs, engaged_logs = await asyncio.gather(
        contract.events.StatementAdded().get_logs(
            from_block=block_number,
            to_block=block_number,
        ),
        contract.events.StatementEngaged().get_logs(
            from_block=block_number,
            to_block=block_number,
        ),
    )

    if added_logs:
        docs = [
            {
                "id": _statement_document_id(
                    forum_contract_address,
                    log.args.id,
                ),
                "statementId": log.args.id,
                "statementText": log.args.statement,
                "forumAddress": forum_contract_address,
                "lastEngagement": block_timestamp,
            }
            for log in added_logs
        ]
        logger.debug(
            "[live] add_documents(%s) block #%s:\n%s",
            forum_contract_address,
            block_number,
            json.dumps(docs, indent=2),
        )
        _wait_task(
            index,
            index.add_documents(docs),
            f"live add_documents({forum_contract_address} block #{block_number})",
        )
        logger.info(
            "Indexed %d statement(s) from contract %s in block #%s",
            len(docs),
            forum_contract_address,
            block_number,
        )

    if engaged_logs:
        engagement_docs = [
            {
                "id": _statement_document_id(
                    forum_contract_address,
                    log.args.statementId,
                ),
                "lastEngagement": block_timestamp,
            }
            for log in engaged_logs
        ]
        logger.debug(
            "[live] update_documents(%s) block #%s:\n%s",
            forum_contract_address,
            block_number,
            json.dumps(engagement_docs, indent=2),
        )
        _wait_task(
            index,
            index.update_documents(engagement_docs),
            f"live update_documents({forum_contract_address} block #{block_number})",
        )
        logger.info(
            "Updated engagement for %d statement(s) from contract %s in block #%s",
            len(engagement_docs),
            forum_contract_address,
            block_number,
        )


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
    backfill_from: str = "",
    eviction_max_age_seconds: int = DEFAULT_EVICTION_MAX_AGE_SECONDS,
) -> None:
    """Subscribe to new blocks and index tracked events for multiple forums.

    If *backfill_from* is set, historical events are indexed first before
    switching to live monitoring.  See module docstring for accepted formats.

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

    logger.info(
        "Starting indexer for %d contract(s) via %s (eviction TTL=%ds)",
        len(normalized_forum_contract_addresses),
        ethereum_node_url,
        eviction_max_age_seconds,
    )

    # Start the eviction background loop.
    eviction_task = asyncio.create_task(_eviction_loop(index, eviction_max_age_seconds))

    backfill_done = False

    try:
        while True:
            try:
                async with AsyncWeb3(WebSocketProvider(ethereum_node_url)) as w3:
                    contracts = [
                        (
                            forum_contract_address,
                            w3.eth.contract(
                                address=forum_contract_address,
                                abi=forum_abi,
                            ),
                        )
                        for forum_contract_address in normalized_forum_contract_addresses
                    ]

                    # ── One-time backfill ──────────────────────────────
                    if not backfill_done and backfill_from:
                        start_block = await _resolve_start_block(w3, backfill_from)
                        if start_block is not None:
                            for forum_contract_address, contract in contracts:
                                await _backfill(
                                    w3,
                                    contract,
                                    index,
                                    start_block,
                                    forum_contract_address,
                                )
                        backfill_done = True

                    # ── Live subscription ─────────────────────────────
                    await w3.eth.subscribe("newHeads")
                    logger.info("Subscribed to new block headers")

                    async for response in w3.socket.process_subscriptions():
                        block = response["result"]
                        block_number = block["number"]
                        block_timestamp: int = int(block.get("timestamp", 0))
                        logger.debug("Block #%s mined", block_number)

                        await asyncio.gather(
                            *(
                                _index_forum_block(
                                    contract,
                                    index,
                                    forum_contract_address,
                                    block_number,
                                    block_timestamp,
                                )
                                for forum_contract_address, contract in contracts
                            )
                        )
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
