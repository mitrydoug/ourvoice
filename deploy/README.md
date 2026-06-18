# Symvolia Backend Deployment

The Symvolia backend is an optional indexing and search service. Core platform
behavior remains available through the smart contracts and static frontend, but
the backend powers search, similar-statement lookup, and auxiliary webhook
experiments.

The published backend image is:

```text
ghcr.io/mitrydoug/symvolia-backend
```

Use `:develop` for the development deployment, `:release` for the production
deployment, and `:latest` only when you explicitly want the latest release image.

## Maintainer Deployment

Maintainer deployments are handled by GitHub Actions:

1. [Publish backend Docker image](../.github/workflows/publish-backend-image.yaml)
   builds `backend/Dockerfile`, smoke-tests it, and publishes branch tags to
   GHCR on pushes to `develop` and `release`.
2. [Deploy backend to Railway](../.github/workflows/deploy-backend-railway.yaml)
   runs after the image publish workflow succeeds and redeploys the matching
   Railway backend environment.

Required GitHub repository configuration:

| Name                        | Type     | Purpose                                                     |
| --------------------------- | -------- | ----------------------------------------------------------- |
| `RAILWAY_DEVELOPMENT_TOKEN` | Secret   | Railway project token scoped to the development environment |
| `RAILWAY_PRODUCTION_TOKEN`  | Secret   | Railway project token scoped to the production environment  |
| `RAILWAY_BACKEND_SERVICE`   | Variable | Backend service name or ID, for example `symvolia-backend`  |

The GHCR publish workflow uses `GITHUB_TOKEN`; no Docker Hub or GHCR personal
access token is required. After the first successful publish, make the GHCR
package public so Railway and self-hosters can pull it without credentials.

## Railway Self-Hosting

The lowest-friction Railway deployment uses two services in combined mode:

1. Meilisearch with persistent storage
2. Symvolia backend from the public GHCR image

Create separate service pairs for development and production. Do not share the
same Meilisearch instance across environments because indexed documents and
contract addresses differ.

### Meilisearch Service

Create a Railway service from this Docker image:

```text
getmeili/meilisearch:v1.13
```

Attach a Railway volume at:

```text
/meili_data
```

Set variables from [railway-meilisearch.env.example](env/railway-meilisearch.env.example):

```env
PORT=7700
MEILI_ENV=production
MEILI_MASTER_KEY=replace-with-generated-master-key
```

Use `MEILI_ENV=development` for non-production deployments. Generate distinct
master keys per environment:

```bash
openssl rand -hex 32
```

If you configure a healthcheck on the Meilisearch service, use `/health`. The
`PORT=7700` value is required so Railway probes Meilisearch's actual internal
port.

### Backend Service

Create a Railway service from one of these public images:

```text
ghcr.io/mitrydoug/symvolia-backend:develop
ghcr.io/mitrydoug/symvolia-backend:release
ghcr.io/mitrydoug/symvolia-backend:latest
```

Set the backend service healthcheck path to:

```text
/health
```

Use the generated backend env example for the chain you want to index:

| Chain        | Env example                                                              |
| ------------ | ------------------------------------------------------------------------ |
| Base Sepolia | [base_sepolia.backend.env.example](env/base_sepolia.backend.env.example) |
| Sepolia      | [sepolia.backend.env.example](env/sepolia.backend.env.example)           |

Replace placeholder values before deploying:

| Variable            | Required value                                                          |
| ------------------- | ----------------------------------------------------------------------- |
| `ETHEREUM_NODE_URL` | WebSocket RPC URL for live indexing                                     |
| `ETHEREUM_HTTP_URL` | HTTP RPC URL for read/backfill calls                                    |
| `MEILI_URL`         | Railway private URL, such as `http://meilisearch.railway.internal:7700` |
| `MEILI_API_KEY`     | Same value as the Meilisearch `MEILI_MASTER_KEY`                        |
| `CORS_ORIGINS`      | Comma-separated frontend origins allowed to call the backend            |

The generated contract values should usually be copied as-is. They include
`REGISTRY_MODE`, `REGISTRY_ADDRESS`, `FORUM_CONTRACT_ADDRESSES`,
`GAS_SPONSORSHIP_REGISTRY_SIGNATURES`, and `BACKFILL_FROM`.

Start with semantic search disabled:

```env
MEILI_SEMANTIC_SEARCH_ENABLED=false
```

After the backend and Meilisearch services are healthy, you can enable semantic
search. Meilisearch will download the configured Hugging Face model and store
model/index data in `/meili_data`, so persistent storage matters.

### Frontend Configuration

Point the frontend build at the backend URL:

```env
VITE_SEARCH_URL=https://replace-with-your-backend-domain
```

If the frontend is deployed separately, update its environment and redeploy it
after the backend Railway domain is available.

## Docker Compose Self-Hosting

For non-Railway deployments, run Meilisearch and the backend with the same
environment shape:

```yaml
services:
  meilisearch:
    image: getmeili/meilisearch:v1.13
    environment:
      MEILI_ENV: production
      MEILI_MASTER_KEY: ${MEILI_MASTER_KEY}
    volumes:
      - meili_data:/meili_data

  backend:
    image: ghcr.io/mitrydoug/symvolia-backend:release
    depends_on:
      - meilisearch
    environment:
      MEILI_URL: http://meilisearch:7700
      MEILI_API_KEY: ${MEILI_MASTER_KEY}
      ETHEREUM_NODE_URL: ${ETHEREUM_NODE_URL}
      ETHEREUM_HTTP_URL: ${ETHEREUM_HTTP_URL}
      FORUM_CONTRACT_ADDRESSES: ${FORUM_CONTRACT_ADDRESSES}
      REGISTRY_MODE: ${REGISTRY_MODE}
      REGISTRY_ADDRESS: ${REGISTRY_ADDRESS}
      GAS_SPONSORSHIP_REGISTRY_SIGNATURES: ${GAS_SPONSORSHIP_REGISTRY_SIGNATURES}
      BACKFILL_FROM: ${BACKFILL_FROM}
      CORS_ORIGINS: ${CORS_ORIGINS}
    ports:
      - "8000:8000"

volumes:
  meili_data:
```

Copy one of the generated backend env examples into your deployment environment
and replace the placeholders.

## Updating Env Examples

When contract deployment JSON changes, regenerate the examples:

```bash
node scripts/generate-backend-env-examples.mjs
```

Commit the generated files with the deployment state update.

## Troubleshooting

- Meilisearch Railway healthcheck fails without `/health` logs: set `PORT=7700`
  on the Meilisearch service.
- Backend is healthy but search returns no results: verify `ETHEREUM_NODE_URL`,
  `FORUM_CONTRACT_ADDRESSES`, and `BACKFILL_FROM`, then inspect backend logs for
  indexer startup messages.
- Railway cannot pull the backend image: make the GHCR package public or add
  private registry credentials to Railway.
- Semantic search is unavailable: keep `MEILI_SEMANTIC_SEARCH_ENABLED=false`
  until Meilisearch is healthy with a persistent volume, then enable it and allow
  extra startup time for model setup.