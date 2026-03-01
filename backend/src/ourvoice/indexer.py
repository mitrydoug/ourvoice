"""Blockchain event indexer — subscribes to new blocks via WebSocket and indexes
``StatementAdded`` events into Meilisearch.

Supports historical backfill via the ``backfill_from`` parameter, which
accepts:
- ISO datetime strings (``2025-01-01``, ``2025-06-15T12:00:00``)
- Relative time deltas (``30d``, ``24h``, ``90m``)
- Explicit block numbers (``block:12345``)
- The keyword ``all`` to replay from genesis

Can be run standalone (``python -m ourvoice.main``) or embedded in the combined
process via the ``run_indexer`` coroutine.
"""

import asyncio
import json
import logging
import re
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


def _load_forum_abi() -> list[dict[str, Any]]:
    """Load the Forum ABI from the package data."""
    abi_path = files("ourvoice").joinpath("ForumABI.json")
    return json.loads(abi_path.read_text())["abi"]


def _ensure_index(client: meilisearch.Client) -> None:
    """Create the statements index if it doesn't exist and configure searchable
    attributes."""
    try:
        client.get_index(STATEMENTS_INDEX)
    except meilisearch.errors.MeilisearchApiError:
        client.create_index(STATEMENTS_INDEX, {"primaryKey": "id"})

    # Ensure searchable/filterable attributes are configured.
    client.index(STATEMENTS_INDEX).update_searchable_attributes(["statementText"])
    client.index(STATEMENTS_INDEX).update_filterable_attributes(["statementId"])


# ---------------------------------------------------------------------------
# Backfill helpers
# ---------------------------------------------------------------------------

# Pattern for relative time deltas: e.g. "30d", "24h", "90m"
_DELTA_RE = re.compile(r"^(\d+)([dhm])$", re.IGNORECASE)


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
) -> None:
    """Fetch historical ``StatementAdded`` events and index them."""
    latest_block: int = (await w3.eth.get_block("latest"))["number"]
    if from_block > latest_block:
        logger.info(
            "Backfill: start block %d > latest %d, nothing to do",
            from_block,
            latest_block,
        )
        return

    logger.info(
        "Backfill: scanning blocks %d → %d for StatementAdded events…",
        from_block,
        latest_block,
    )

    total_indexed = 0
    cursor = from_block
    while cursor <= latest_block:
        end = min(cursor + _BACKFILL_BATCH_SIZE - 1, latest_block)
        logs = await contract.events.StatementAdded().get_logs(
            from_block=cursor,
            to_block=end,
        )
        if logs:
            docs = [
                {
                    "id": str(log.args.id),
                    "statementId": log.args.id,
                    "statementText": log.args.statement,
                }
                for log in logs
            ]
            index.add_documents(docs)
            total_indexed += len(docs)
        cursor = end + 1

    logger.info("Backfill complete: indexed %d statement(s)", total_indexed)


async def run_indexer(
    meili_client: meilisearch.Client,
    forum_contract_address: str,
    ethereum_node_url: str,
    backfill_from: str = "",
) -> None:
    """Subscribe to new blocks and index ``StatementAdded`` events.

    If *backfill_from* is set, historical events are indexed first before
    switching to live monitoring.  See module docstring for accepted formats.

    This coroutine runs indefinitely.  It is safe to cancel via
    ``task.cancel()``.
    """
    forum_abi = _load_forum_abi()
    _ensure_index(meili_client)
    index = meili_client.index(STATEMENTS_INDEX)

    logger.info(
        "Starting indexer for contract %s via %s",
        forum_contract_address,
        ethereum_node_url,
    )

    backfill_done = False

    while True:
        try:
            async with AsyncWeb3(WebSocketProvider(ethereum_node_url)) as w3:
                contract = w3.eth.contract(
                    address=forum_contract_address, abi=forum_abi
                )

                # ── One-time backfill ──────────────────────────────────
                if not backfill_done and backfill_from:
                    start_block = await _resolve_start_block(w3, backfill_from)
                    if start_block is not None:
                        await _backfill(w3, contract, index, start_block)
                    backfill_done = True

                # ── Live subscription ──────────────────────────────────
                await w3.eth.subscribe("newHeads")
                logger.info("Subscribed to new block headers")

                async for response in w3.socket.process_subscriptions():
                    block = response["result"]
                    block_number = block["number"]
                    logger.debug("Block #%s mined", block_number)

                    logs = await contract.events.StatementAdded().get_logs(
                        from_block=block_number
                    )

                    if logs:
                        docs = [
                            {
                                "id": str(log.args.id),
                                "statementId": log.args.id,
                                "statementText": log.args.statement,
                            }
                            for log in logs
                        ]
                        index.add_documents(docs)
                        logger.info(
                            "Indexed %d statement(s) from block #%s",
                            len(docs),
                            block_number,
                        )
        except asyncio.CancelledError:
            logger.info("Indexer cancelled, shutting down")
            raise
        except Exception:
            logger.exception("Indexer connection error, reconnecting in 5 seconds…")
            await asyncio.sleep(5)
