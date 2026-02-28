"""Combined entry-point: search API + indexer in a single process.

Ideal for local development and low-traffic self-hosted deployments.

Run with:
    uvicorn ourvoice.combined:app --host 0.0.0.0 --port 8000

Required env vars:
    MEILI_URL            — Meilisearch URL  (default: http://localhost:7700)
    MEILI_API_KEY        — Meilisearch API key (default: empty)
    FORUM_CONTRACT_ADDRESS — Forum contract address (required)
    ETHEREUM_NODE_URL    — WebSocket RPC URL (required)
"""

import asyncio
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import meilisearch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ourvoice.indexer import run_indexer
from ourvoice.search_service.api import create_api

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

MEILI_URL = os.getenv("MEILI_URL", "http://localhost:7700")
MEILI_API_KEY = os.getenv("MEILI_API_KEY", "")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "")
FORUM_CONTRACT_ADDRESS = os.environ.get("FORUM_CONTRACT_ADDRESS", "")
ETHEREUM_NODE_URL = os.environ.get("ETHEREUM_NODE_URL", "")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Start the indexer as a background task while the API is running."""
    if not FORUM_CONTRACT_ADDRESS or not ETHEREUM_NODE_URL:
        logger.warning(
            "FORUM_CONTRACT_ADDRESS or ETHEREUM_NODE_URL not set — "
            "indexer will NOT start.  Search API is still available."
        )
        yield
        return

    task = asyncio.create_task(
        run_indexer(
            meili_client=app.state.meili_client,
            forum_contract_address=FORUM_CONTRACT_ADDRESS,
            ethereum_node_url=ETHEREUM_NODE_URL,
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
