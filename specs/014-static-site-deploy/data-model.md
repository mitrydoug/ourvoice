# Data Model: Static Site Deployment via CI/CD

**Feature**: 014-static-site-deploy
**Date**: 2026-02-12

---

## Entities

### Build Artifact

The output of `npm run build` (`vite build`) in the `frontend/` directory.

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | Filesystem path to the build output directory (`frontend/dist`) |
| `files` | file[] | Static HTML, JS, CSS, and asset files |
| `index` | string | Entry point file (`index.html`) |

**Relationships**: Consumed by all four deployment targets. Produced once, deployed to many.

**Validation**: Build only proceeds if all quality gates pass (typecheck, lint, format:check).

### Deployment Manifest

A structured summary rendered in the GitHub Actions step summary after all deployment jobs complete.

| Field | Type | Description |
|-------|------|-------------|
| `commit_sha` | string | Git commit SHA that triggered the deployment |
| `timestamp` | string | ISO 8601 timestamp of the workflow run |
| `targets` | DeployTarget[] | Array of deployment target results |

### DeployTarget

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable name: "Cloudflare Pages", "IPFS", "Arweave", "ENS" |
| `status` | enum | `success` \| `failure` \| `skipped` |
| `identifier` | string \| null | CID, TX ID, URL, or ENS name (null if failed) |
| `access_url` | string \| null | Full URL for accessing this target (null if failed) |
| `error` | string \| null | Error message if status is `failure` |

**Rendered format** (GitHub Actions step summary):

```markdown
## Deployment Manifest

| Target | Status | Identifier | Access URL |
|--------|--------|------------|------------|
| Cloudflare Pages | ✅ success | — | https://ourvoice.app |
| IPFS | ✅ success | bafybeih... | https://gateway.pinata.cloud/ipfs/bafybeih... |
| Arweave | ✅ success | abc123... | https://arweave.net/abc123... |
| ENS | ✅ success | ourvoice.eth → bafybeih... | https://ourvoice.eth.limo |
```

### GitHub Secrets

Configuration entities stored in GitHub repository settings, not in code.

| Secret Name | Type | Required By |
|-------------|------|-------------|
| `CLOUDFLARE_API_TOKEN` | string | Cloudflare Pages deployment |
| `CLOUDFLARE_ACCOUNT_ID` | string | Cloudflare Pages deployment |
| `PINATA_JWT` | string | IPFS pinning |
| `DEPLOYER_PRIVATE_KEY` | string | ENS update + Arweave funding |
| `ETH_RPC_URL` | string | ENS update |

**Validation**: Each deployment job should fail fast with a clear error if its required secret is missing or empty.

### Deployer Wallet

An Ethereum wallet dedicated to deployment operations.

| Field | Type | Description |
|-------|------|-------------|
| `address` | string | Ethereum address (public) |
| `private_key` | string | Stored as `DEPLOYER_PRIVATE_KEY` GitHub secret |
| `ens_role` | string | Manager or owner of the ENS name |
| `min_balance` | number | Minimum ETH needed (~0.01 ETH for ENS gas + Irys funding) |

**State transitions**: Wallet balance decreases with each deployment (gas + Arweave storage cost). Must be periodically refunded.

---

## Entity Relationships

```
Build Artifact (1) ──── deployed to ────> (N) DeployTarget
DeployTarget "IPFS"  ──── CID used by ────> DeployTarget "ENS"
GitHub Secrets        ──── authenticates ──> DeployTarget (each target uses specific secrets)
Deployer Wallet       ──── signs tx for ──> DeployTarget "ENS" + DeployTarget "Arweave"
```

---

## State Transitions

### Workflow Run States

```
trigger (merge to release)
  → building (quality gates + vite build)
  → deploying (parallel: CF Pages, IPFS, Arweave)
  → updating-ens (depends on IPFS CID)
  → publishing-manifest (final summary)
  → complete
```

### Individual Deploy Target States

```
pending → running → success
                  → failure (with error message)
                  → skipped (if dependency failed, e.g., ENS skipped when IPFS fails)
```
