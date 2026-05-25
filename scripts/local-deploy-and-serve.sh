#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Waits for Hardhat, deploys contracts, then starts the frontend dev server.
#
# Usage (called by overmind via Procfile, not directly):
#   DEPLOY_NETWORK=default VITE_NETWORK=localhost VITE_REGISTRY_MODE=mocked \
#     scripts/local-deploy-and-serve.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

HARDHAT_URL="${HARDHAT_URL:-http://127.0.0.1:8545}"
DEPLOY_NETWORK="${DEPLOY_NETWORK:?DEPLOY_NETWORK must be set}"

echo "⏳ Waiting for Hardhat node at ${HARDHAT_URL}…"
until curl -sf "${HARDHAT_URL}" > /dev/null 2>&1; do
  sleep 1
done
echo "✅ Hardhat node is ready."

# ── Deploy contracts ─────────────────────────────────────────────────────────
echo "🚀 Deploying contracts (network: ${DEPLOY_NETWORK})…"
cd blockchain
rm -rf ignition/deployments/chain-31337
npx hardhat clean
npx hardhat compile
npx hardhat run scripts/deploy.ts --network "${DEPLOY_NETWORK}"

if [ "${STRESS_TEST:-0}" = "1" ]; then
  echo "🌱 Seeding stress-test data (forum: ${STRESS_FORUM:-USA})…"
  npx hardhat run scripts/seed-stress.ts --network "${DEPLOY_NETWORK}"
fi
cd ..

# ── Start frontend dev server ────────────────────────────────────────────────
echo "🌐 Starting frontend dev server…"
cd frontend
exec npx vite dev --force
