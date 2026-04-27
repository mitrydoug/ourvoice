#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Waits for Hardhat + Meilisearch, then starts the backend (uvicorn).
#
# The deploy script writes backend/.generated/deployment.env with the
# FORUM_CONTRACT_ADDRESSES value for all deployed forums.
#
# Usage (called by overmind via Procfile, not directly):
#   DEPLOY_NETWORK=default \
#     scripts/local-backend.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

HARDHAT_URL="${HARDHAT_URL:-http://127.0.0.1:8545}"
MEILI_URL="${MEILI_URL:-http://localhost:7700}"

echo "⏳ Waiting for Hardhat node at ${HARDHAT_URL}…"
until curl -sf "${HARDHAT_URL}" > /dev/null 2>&1; do
  sleep 1
done

echo "⏳ Waiting for Meilisearch at ${MEILI_URL}…"
until curl -sf "${MEILI_URL}/health" > /dev/null 2>&1; do
  sleep 1
done

# Wait for the deploy script to write the backend env artifact.
DEPLOYMENT_ENV="backend/.generated/deployment.env"
echo "⏳ Waiting for contract deployment (${DEPLOYMENT_ENV})…"
until [ -f "${DEPLOYMENT_ENV}" ]; do
  sleep 2
done
# Give deploy.ts a moment to finish writing.
sleep 2

# Source the generated deployment env and export its values.
set -a
# shellcheck disable=SC1090
. "${DEPLOYMENT_ENV}"
set +a

if [ -z "${FORUM_CONTRACT_ADDRESSES:-}" ]; then
  echo "❌ Could not load FORUM_CONTRACT_ADDRESSES from ${DEPLOYMENT_ENV}"
  exit 1
fi
echo "📋 Using FORUM_CONTRACT_ADDRESSES=${FORUM_CONTRACT_ADDRESSES}"

export ETHEREUM_NODE_URL="${ETHEREUM_NODE_URL:-ws://127.0.0.1:8545}"
export MEILI_URL
export MEILI_API_KEY="${MEILI_API_KEY:-dev-master-key}"
export BACKFILL_FROM="${BACKFILL_FROM:-all}"
export CORS_ORIGINS="${CORS_ORIGINS:-*}"

cd backend
# Activate venv if it exists; otherwise expect system Python has deps.
if [ -f .venv/bin/activate ]; then
  # shellcheck disable=SC1091
  . .venv/bin/activate
fi

exec uvicorn ourvoice.combined:app --host 127.0.0.1 --port 8000 --app-dir src
