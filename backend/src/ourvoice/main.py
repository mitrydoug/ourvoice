"""OurVoice CLI entry-point for the standalone indexer.

Run with:
    python -m ourvoice.main \
        --forum-contract-address 0x... \
        --ethereum-node-url ws://... \
        --meili-url http://... \
        --meili-api-key ...
"""

import argparse
import asyncio

import meilisearch

from ourvoice.indexer import run_indexer, DEFAULT_EVICTION_MAX_AGE_SECONDS


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="OurVoice Indexer")
    parser.add_argument(
        "--forum-contract-address",
        type=str,
        required=True,
        help="Address of the Forum contract",
    )
    parser.add_argument(
        "--ethereum-node-url",
        type=str,
        required=True,
        help="WebSocket URL of the Ethereum node",
    )
    parser.add_argument(
        "--meili-url",
        type=str,
        required=True,
        help="URL of the Meilisearch instance",
    )
    parser.add_argument(
        "--meili-api-key",
        type=str,
        default="",
        help="Meilisearch API key (optional for local dev)",
    )
    parser.add_argument(
        "--backfill-from",
        type=str,
        default="",
        help=(
            "Backfill historical events before switching to live mode. "
            "Accepts: ISO datetime (2025-01-01), relative delta (30d, 24h), "
            "explicit block number (block:12345), or 'all' for full history."
        ),
    )
    parser.add_argument(
        "--eviction-max-age-seconds",
        type=int,
        default=DEFAULT_EVICTION_MAX_AGE_SECONDS,
        help=(
            "Maximum age (in seconds) for indexed documents without recent "
            "engagement.  Documents older than this are periodically evicted. "
            f"Default: {DEFAULT_EVICTION_MAX_AGE_SECONDS} (7 days)."
        ),
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    meili_client = meilisearch.Client(args.meili_url, args.meili_api_key)
    await run_indexer(
        meili_client=meili_client,
        forum_contract_address=args.forum_contract_address,
        ethereum_node_url=args.ethereum_node_url,
        backfill_from=args.backfill_from,
        eviction_max_age_seconds=args.eviction_max_age_seconds,
    )


if __name__ == "__main__":
    asyncio.run(main())
