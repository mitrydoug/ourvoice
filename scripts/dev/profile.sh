#!/usr/bin/env bash

DEV_SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${DEV_SCRIPTS_DIR}/../.." && pwd)"

load_dotenv_local() {
  if [ -f "${REPO_ROOT}/.env.local" ]; then
    local restore_nounset=0
    case "$-" in
      *u*) restore_nounset=1 ;;
    esac

    set +u
    set -a
    # shellcheck disable=SC1091
    . "${REPO_ROOT}/.env.local"
    set +a

    if [ "${restore_nounset}" = "1" ]; then
      set -u
    fi
  fi
}

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "${name} must be set."
    exit 1
  fi
}

load_dev_profile() {
  local profile="$1"

  load_dotenv_local

  export DEV_PROFILE="${profile}"
  export LOCAL_RPC_URL="${LOCAL_RPC_URL:-http://127.0.0.1:8545}"
  export LOCAL_BACKEND_URL="${LOCAL_BACKEND_URL:-http://localhost:8000}"
  export LOCAL_BACKEND_RPC_URL="${LOCAL_BACKEND_RPC_URL:-${LOCAL_BACKEND_URL}/rpc}"
  export MEILI_URL="${MEILI_URL:-http://localhost:7700}"
  export MEILI_READY_TIMEOUT_SECONDS="${MEILI_READY_TIMEOUT_SECONDS:-120}"
  export NETWORK_FILE_NAME="${NETWORK_FILE_NAME:-localhost}"
  export CONTRACT_READY_TIMEOUT_SECONDS="${CONTRACT_READY_TIMEOUT_SECONDS:-600}"
  export CONTRACT_READY_FILE="${CONTRACT_READY_FILE:-${REPO_ROOT}/.dev/contracts-${profile}.ready}"

  case "${profile}" in
    local-mocked)
      export ETHEREUM_RPC_URL="${LOCAL_RPC_URL}"
      export RELAY_RPC_URL="${LOCAL_RPC_URL}"
      export VITE_LOCALHOST_RPC_URL="${LOCAL_BACKEND_RPC_URL}"
      export VITE_SEARCH_URL="${LOCAL_BACKEND_URL}"
      export VITE_NETWORK="localhost"
      export VITE_REGISTRY_MODE="mocked"
      export DEPLOY_NETWORK="localhost"
      export DEPLOYMENT_PROFILE="local-mocked"
      export SEED_PROFILE="standard"
      unset HARDHAT_NETWORK
      ;;
    local-forked)
      require_env BASE_SEPOLIA_RPC_URL
      export ETHEREUM_RPC_URL="${LOCAL_RPC_URL}"
      export RELAY_RPC_URL="${LOCAL_RPC_URL}"
      export VITE_LOCALHOST_RPC_URL="${LOCAL_BACKEND_RPC_URL}"
      export VITE_SEARCH_URL="${LOCAL_BACKEND_URL}"
      export VITE_NETWORK="localhost"
      export VITE_REGISTRY_MODE="mocked"
      export DEPLOY_NETWORK="localhost"
      export DEPLOYMENT_PROFILE="local-base-sepolia-fork"
      export SEED_PROFILE="none"
      export HARDHAT_NETWORK="local_base_sepolia_fork"
      ;;
    local-stress-test)
      export ETHEREUM_RPC_URL="${LOCAL_RPC_URL}"
      export RELAY_RPC_URL="${LOCAL_RPC_URL}"
      export VITE_LOCALHOST_RPC_URL="${LOCAL_BACKEND_RPC_URL}"
      export VITE_SEARCH_URL="${LOCAL_BACKEND_URL}"
      export VITE_NETWORK="localhost"
      export VITE_REGISTRY_MODE="mocked"
      export VITE_SEARCH_RESULTS_LIMIT="${VITE_SEARCH_RESULTS_LIMIT:-100}"
      export DEPLOY_NETWORK="localhost"
      export DEPLOYMENT_PROFILE="local-stress-test"
      export SEED_PROFILE="stress"
      export STRESS_FORUM="${STRESS_FORUM:-USA}"
      unset HARDHAT_NETWORK
      ;;
    base-sepolia)
      require_env BASE_SEPOLIA_RPC_URL
      require_env RELAY_RPC_URL
      export ETHEREUM_RPC_URL="${ETHEREUM_RPC_URL:-${BASE_SEPOLIA_RPC_URL}}"
      export VITE_BASE_SEPOLIA_RPC_URL="${LOCAL_BACKEND_RPC_URL}"
      export VITE_SEARCH_URL="${LOCAL_BACKEND_URL}"
      export VITE_NETWORK="base_sepolia"
      export VITE_REGISTRY_MODE="mocked"
      export DEPLOY_NETWORK="base_sepolia"
      export DEPLOY_ARTIFACT_NETWORK="base_sepolia"
      export DEPLOYMENT_PROFILE="base-sepolia"
      export SEED_PROFILE="none"
      unset HARDHAT_NETWORK
      ;;
    *)
      echo "Unknown dev profile: ${profile}"
      exit 1
      ;;
  esac
}