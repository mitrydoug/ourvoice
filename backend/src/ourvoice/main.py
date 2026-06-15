"""OurVoice CLI entry-point for the standalone indexer.

Run with:
    python -m ourvoice.main \
        --forum-contract-address 0x... \
        --forum-contract-address 0x... \
        --ethereum-node-url ws://... \
        --ethereum-read-node-url http://... \
        --meili-url http://... \
        --meili-api-key ...
"""

import argparse
import asyncio

import meilisearch

from ourvoice.indexer import (
    DEFAULT_EVICTION_MAX_AGE_SECONDS,
    DEFAULT_WEB3_SUBSCRIPTION_RESPONSE_QUEUE_SIZE,
    parse_forum_contract_addresses,
    run_indexers,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="OurVoice Indexer")
    parser.add_argument(
        "--forum-contract-address",
        type=str,
        action="append",
        required=True,
        help=(
            "Address of a Forum contract. Repeat the flag or pass a comma-separated "
            "list to index multiple forums."
        ),
    )
    parser.add_argument(
        "--ethereum-node-url",
        type=str,
        required=True,
        help="WebSocket URL of the Ethereum node",
    )
    parser.add_argument(
        "--ethereum-read-node-url",
        type=str,
        default=None,
        help=(
            "HTTP URL of the Ethereum node for read/backfill RPCs. "
            "Defaults to --ethereum-node-url."
        ),
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
            "Initial block cursor for historical catch-up. "
            "Accepts: ISO datetime (2025-01-01), relative delta (30d, 24h), "
            "explicit block number (block:12345), or 'all' for full history. "
            "Empty indexes future blocks only."
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
    parser.add_argument(
        "--web3-subscription-response-queue-size",
        type=int,
        default=DEFAULT_WEB3_SUBSCRIPTION_RESPONSE_QUEUE_SIZE,
        help=(
            "Maximum queued Web3 subscription messages before the provider "
            "raises QueueFull. Default: "
            f"{DEFAULT_WEB3_SUBSCRIPTION_RESPONSE_QUEUE_SIZE}."
        ),
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    forum_contract_addresses = parse_forum_contract_addresses(
        args.forum_contract_address
    )
    meili_client = meilisearch.Client(args.meili_url, args.meili_api_key)
    await run_indexers(
        meili_client=meili_client,
        forum_contract_addresses=forum_contract_addresses,
        ethereum_node_url=args.ethereum_node_url,
        ethereum_read_node_url=args.ethereum_read_node_url,
        backfill_from=args.backfill_from,
        eviction_max_age_seconds=args.eviction_max_age_seconds,
        web3_subscription_response_queue_size=args.web3_subscription_response_queue_size,
    )


if __name__ == "__main__":
    asyncio.run(main())
