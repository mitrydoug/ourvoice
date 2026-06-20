# Symvolia
A platform to reflect public sentiment on important issues, ranking them by quadratic voting.

## Base Sepolia Development

Base Sepolia currently uses `MockSymvoliaRegistry` because zkPassport has not
deployed its verifier there. Shared deployment state is tracked in
`deployments/base_sepolia.json`; generated frontend bindings are tracked in
`frontend/src/contracts/networks/base_sepolia.ts`; and Hardhat Ignition state is
tracked under `blockchain/ignition/deployments/chain-84532`.

Use committed Base Sepolia contract addresses:

```bash
make base-sepolia
```

To deliberately deploy fresh Base Sepolia mock-registry contracts first, use the
break-glass target. This wipes the current Base Sepolia app registry and forum
state, so it is intentionally guarded:

```bash
CONFIRM_BASE_SEPOLIA_REDEPLOY=I_UNDERSTAND_THIS_WIPES_BASE_SEPOLIA_STATE make base-sepolia-break-glass
```

Required deployment variables:

```bash
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY=<set via Hardhat keystore or env>
```

For live backend indexing, also set `ETHEREUM_NODE_URL` to a Base Sepolia
WebSocket RPC:

```bash
ETHEREUM_NODE_URL=wss://...
```

`BASE_SEPOLIA_RPC_URL` and `ETHEREUM_NODE_URL` are intentionally separate:

- `BASE_SEPOLIA_RPC_URL` is an HTTP RPC used by Hardhat deployment and exposed
	to the static frontend as `VITE_BASE_SEPOLIA_RPC_URL`.
- `ETHEREUM_NODE_URL` is a WebSocket RPC used by the backend indexer for
	`newHeads` subscriptions.

Local Overmind workflows load `.env.local` through `scripts/dev/profile.sh` and
derive target-specific variables there. For example, the Base Sepolia profile
maps `BASE_SEPOLIA_RPC_URL` to `RPC_URL` for HTTP readiness checks and to
`VITE_BASE_SEPOLIA_RPC_URL` for the frontend. Procfiles should stay focused on
process topology rather than repeating environment mappings.

Hardhat connection targets are intentionally separate from deployment behavior.
`DEPLOY_NETWORK` selects the Hardhat network/RPC endpoint, while
`DEPLOYMENT_PROFILE` selects which Ignition deployment configuration to use. For
example, `local-mocked`, `local-stress-test`, and
`local-base-sepolia-fork` all write local runtime artifacts through the
`localhost` artifact target, but use different deployment profiles. Deployment scripts require
`DEPLOYMENT_PROFILE` to be set explicitly; use `scripts/dev/profile.sh` /
`scripts/dev/contracts.sh` or provide it in the environment for direct Hardhat
runs.

`scripts/dev/profile.sh` is the orchestration profile layer: it maps a local
workflow such as `local-mocked` or `base-sepolia` to RPC URLs, frontend network
settings, `DEPLOY_NETWORK`, `DEPLOYMENT_PROFILE`, and `SEED_PROFILE`.
`blockchain/ignition/config/deployments.ts` is the deployment topology layer:
it defines which registry type and forum contracts to deploy, plus constructor
configuration. Seed data is intentionally outside the deployment topology and is
run by `scripts/dev/contracts.sh` after deployment artifacts are generated.

Local seed behavior is controlled by `SEED_PROFILE`: `standard` registers the
small mock user set and demo content, `stress` runs the stress-test seeder, and
`none` skips seeding. Public/testnet profiles default to `none`.

Deployment profile names use kebab-case. Hardhat network names and deployment
artifact names may still use underscores where the surrounding toolchain expects
them; for example, the `base-sepolia` deployment profile deploys through the
`base_sepolia` Hardhat network and writes `deployments/base_sepolia.json`.

The `local-base-sepolia-fork` deployment profile uses a Base Sepolia fork with
the same mocked-registry topology as Base Sepolia. This keeps local forked
development aligned with the current test network without depending on live app
state.

Contract deployment and artifact generation are a dedicated Overmind process:
`contracts: bash scripts/dev/contracts.sh <profile>`. Frontend and backend
processes wait for that process to write a per-profile readiness marker before
they serve traffic, which prevents stale generated contract files from being
used accidentally.

For Base Sepolia, `make base-sepolia` defaults to the non-deploy strategy: the
`contracts` process reads `deployments/base_sepolia.json` and regenerates runtime
artifacts from that existing deployment state. Use `make base-sepolia-break-glass`
only when you explicitly want to deploy fresh mock-registry contracts and discard
the old Base Sepolia app state.

The backend can start without `ETHEREUM_NODE_URL`, but live indexing is disabled
until a WebSocket RPC is configured.

## Backend Deployment

The backend is packaged as a public container image and can be deployed with
Railway or any container host. See [deploy/README.md](deploy/README.md) for the
maintainer deployment workflow, Railway self-hosting steps, generated backend env
examples, and troubleshooting notes.
