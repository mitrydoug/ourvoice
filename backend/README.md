# OurVoice Backend — Search & Indexing

The backend provides two concerns that can run together or separately:

1. **Indexer** — Subscribes to blockchain events from one or more deployed forum contracts and writes documents to Meilisearch.
2. **Search API** — FastAPI service exposing a `/search` endpoint for full-text search.

## Architecture

```
┌──────────────┐      WebSocket       ┌──────────────┐
│  Blockchain  │ ──────────────────►  │   Indexer    │
│   (Hardhat)  │                      │              │
└──────────────┘                      └──────┬───────┘
                                             │ add_documents
                                      ┌──────▼───────┐
                                      │  Meilisearch │
                                      └──────┬───────┘
                                             │ search
                                      ┌──────▼───────┐
          HTTP  ◄─────────────────    │  Search API  │
                                      └──────────────┘
```

## Running Modes

### Combined mode (recommended for local dev & self-hosting)

Runs the indexer as a background task inside the FastAPI process:

```bash
uvicorn ourvoice.combined:app --host 0.0.0.0 --port 8000 --app-dir src
```

**Environment variables:**

| Variable                                | Required | Default                 | Description                                      |
| --------------------------------------- | -------- | ----------------------- | ------------------------------------------------ |
| `MEILI_URL`                             | No       | `http://localhost:7700` | Meilisearch URL                                  |
| `MEILI_API_KEY`                         | No       | (empty)                 | Meilisearch API key                              |
| `FORUM_CONTRACT_ADDRESSES`              | Yes      | —                       | Comma-separated forum contract addresses         |
| `ETHEREUM_NODE_URL`                     | Yes      | —                       | WebSocket RPC URL                                |
| `BACKFILL_FROM`                         | No       | (empty)                 | Initial indexing cursor; `all` indexes history   |
| `LOG_LEVEL`                             | No       | `INFO`                  | Python logging level                             |
| `WEB3_SUBSCRIPTION_RESPONSE_QUEUE_SIZE` | No       | `10000`                 | Web3 subscription buffer for bursty local chains |
| `MEILI_SEMANTIC_SEARCH_ENABLED`         | No       | `false`                 | Configure Meilisearch `/similar` semantic search |
| `MEILI_SEMANTIC_EMBEDDER_NAME`          | No       | `statement-text`        | Meilisearch embedder name for `/similar`         |
| `MEILI_SEMANTIC_EMBEDDER_MODEL`         | No       | multilingual MiniLM     | Hugging Face model used by Meilisearch           |
| `MEILI_TASK_TIMEOUT_MS`                 | No       | `300000`                | Max wait for Meilisearch setup/indexing tasks    |

If you are upgrading an existing Meilisearch index from the older single-forum backend, run a full backfill or clear the `statements` index once so documents are recreated with forum-scoped IDs.

### Split mode (recommended for production scaling)

Run the indexer and API as separate processes:

```bash
# Indexer (exactly one instance)
python -m ourvoice.main \
  --forum-contract-address 0x... \
  --forum-contract-address 0x... \
  --ethereum-node-url ws://... \
  --meili-url http://... \
  --meili-api-key ...

# Search API (scale horizontally)
MEILI_URL=http://... MEILI_API_KEY=... \
  uvicorn ourvoice.search_service.main:app --host 0.0.0.0 --port 8000 --app-dir src
```

## Local Development (docker-compose)

From the repo root:

```bash
docker compose up hardhat_mocked contract_deployer meilisearch backend
```

This starts:
- Hardhat local node on port 8545
- Contract deployer (runs once)
- Meilisearch on port 7700
- Combined backend (indexer + API) on port 8000

The deploy step writes `backend/.generated/deployment.env`, and the backend
automatically sources that file to discover the deployed forum contract
addresses.

## Self-Hosting on Railway

See the [Deploy to Railway](#deploy-to-railway) section in the root README, or use the button below:

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/ourvoice)

### Railway services

For a **simple deployment** (combined mode), you need two Railway services:

1. **Meilisearch** — Use the official Meilisearch template on Railway
2. **Backend** — Uses `backend/Dockerfile.railway`, set env vars pointing to the Meilisearch service

For **production scaling**, split into three services:

1. **Meilisearch** — Database service
2. **Indexer** — Worker process (override CMD: `python -m ourvoice.main --forum-contract-address ... --forum-contract-address ... --ethereum-node-url ... --meili-url ... --meili-api-key ...`)
3. **Search API** — Web process (default CMD from Dockerfile)

## API Endpoints

| Method | Path       | Description                                                               |
| ------ | ---------- | ------------------------------------------------------------------------- |
| GET    | `/`        | Redirects to `/docs` (Swagger UI)                                         |
| GET    | `/health`  | Health check                                                              |
| GET    | `/search`  | Forum-scoped full-text search (`?statement_text=...&forum_address=0x...`) |
| GET    | `/similar` | Forum-scoped semantic similarity (`?statement_id=1&forum_address=0x...`)  |

When `MEILI_SEMANTIC_SEARCH_ENABLED=true`, backend startup configures a local
Hugging Face embedder in Meilisearch using
`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` by default.
Meilisearch downloads the model artifacts on first use and generates/caches
document embeddings itself; the Python backend does not call external AI APIs or
compute vectors. Use persistent Meilisearch storage in deployed environments if
you want to avoid re-downloading the model and regenerating embeddings after
restarts.

Local `make local-*` workflows enable semantic search by default in
`scripts/local-backend.sh`. Set `MEILI_SEMANTIC_SEARCH_ENABLED=false` before
starting the stack to skip local model setup.

## Dependencies

- **[Meilisearch](https://www.meilisearch.com/)** — Full-text search engine (replaces Solr)
- **[web3.py](https://web3py.readthedocs.io/)** — Ethereum interaction
- **[FastAPI](https://fastapi.tiangolo.com/)** — HTTP API framework
- **[meilisearch-python](https://github.com/meilisearch/meilisearch-python)** — Meilisearch client
