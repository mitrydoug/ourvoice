"""Combined entry-point: search API + indexer in a single process.

Ideal for local development and low-traffic self-hosted deployments.

Run with:
    uvicorn ourvoice.combined:app --host 0.0.0.0 --port 8000

Required env vars:
    MEILI_URL            — Meilisearch URL  (default: http://localhost:7700)
    MEILI_API_KEY        — Meilisearch API key (default: empty)
    FORUM_CONTRACT_ADDRESSES — Comma-separated forum contract addresses
    ETHEREUM_NODE_URL    — WebSocket RPC URL (required)

Optional env vars:
    BACKFILL_FROM        — Initial block cursor for historical catch-up.
                           Accepts: ISO datetime (2025-01-01), relative
                           delta (30d, 24h), block number (block:123),
                           or 'all'.  Empty = future blocks only.
    EVICTION_MAX_AGE_SECONDS — Maximum age (in seconds) for indexed
                               documents without recent engagement.
                               Documents older than this are periodically
                               evicted.  Default: 604800 (7 days).
    WEB3_SUBSCRIPTION_RESPONSE_QUEUE_SIZE — Web3.py subscription buffer size
                                            for bursty local chains.
                                            Default: 10000.
"""

import asyncio
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import meilisearch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ourvoice.indexer import (
    DEFAULT_EVICTION_MAX_AGE_SECONDS,
    DEFAULT_WEB3_SUBSCRIPTION_RESPONSE_QUEUE_SIZE,
    parse_forum_contract_addresses,
    run_indexers,
)
from ourvoice.search_service.api import create_api

logging.basicConfig(
    level="INFO",
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
# Allow fine-grained control over ourvoice package logging without enabling
# DEBUG output from third-party libraries (web3, websockets, urllib3, etc.).
# Set LOG_LEVEL=DEBUG to see detailed ourvoice-internal logs only.
_our_log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.getLogger("ourvoice").setLevel(_our_log_level)
logger = logging.getLogger(__name__)

MEILI_URL = os.getenv("MEILI_URL", "http://localhost:7700")
MEILI_API_KEY = os.getenv("MEILI_API_KEY", "")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "")
FORUM_CONTRACT_ADDRESSES = os.environ.get("FORUM_CONTRACT_ADDRESSES", "")
ETHEREUM_NODE_URL = os.environ.get("ETHEREUM_NODE_URL", "")
BACKFILL_FROM = os.environ.get("BACKFILL_FROM", "")
EVICTION_MAX_AGE_SECONDS = int(
    os.environ.get("EVICTION_MAX_AGE_SECONDS", str(DEFAULT_EVICTION_MAX_AGE_SECONDS))
)
WEB3_SUBSCRIPTION_RESPONSE_QUEUE_SIZE = int(
    os.environ.get(
        "WEB3_SUBSCRIPTION_RESPONSE_QUEUE_SIZE",
        str(DEFAULT_WEB3_SUBSCRIPTION_RESPONSE_QUEUE_SIZE),
    )
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Start the indexer as a background task while the API is running."""
    forum_contract_addresses = parse_forum_contract_addresses(FORUM_CONTRACT_ADDRESSES)
    if not forum_contract_addresses or not ETHEREUM_NODE_URL:
        logger.warning(
            "FORUM_CONTRACT_ADDRESSES or ETHEREUM_NODE_URL not set — "
            "indexer will NOT start.  Search API is still available."
        )
        yield
        return

    task = asyncio.create_task(
        run_indexers(
            meili_client=app.state.meili_client,
            forum_contract_addresses=forum_contract_addresses,
            ethereum_node_url=ETHEREUM_NODE_URL,
            backfill_from=BACKFILL_FROM,
            eviction_max_age_seconds=EVICTION_MAX_AGE_SECONDS,
            web3_subscription_response_queue_size=WEB3_SUBSCRIPTION_RESPONSE_QUEUE_SIZE,
        )
    )
    logger.info("Indexer background task started")
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    logger.info("Indexer background task stopped")


app = FastAPI(title="OurVoice Search (combined)", lifespan=lifespan)

if CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.state.meili_client = meilisearch.Client(MEILI_URL, MEILI_API_KEY)
create_api(app)
