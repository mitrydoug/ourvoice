# Feature Specification: Static Site Deployment via CI/CD

**Feature Branch**: `014-static-site-deploy`  
**Created**: 2026-02-12  
**Status**: Draft  
**Input**: User description: "Deploy frontend as a static site via CI/CD using a hybrid decentralized+traditional approach (IPFS + Arweave + Cloudflare Pages + ENS) on merges to the release branch"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Developer Merges to Release and Frontend is Automatically Deployed (Priority: P1)

A developer merges a pull request into the `release` branch. Without any manual intervention, the frontend is built, quality-checked, and deployed to a CDN where it is accessible via a traditional HTTPS URL (e.g., `ourvoice.app`). The deployment result (URL, status) is visible in the GitHub Actions summary.

**Why this priority**: This is the foundational CI/CD pipeline. Without it, no deployment happens at all. It delivers the core "deploy-and-forget" workflow and serves the largest user segment (beginners accessing via a standard URL).

**Independent Test**: Can be fully tested by merging a commit to `release` and verifying the site is accessible at the CDN URL with the expected content.

**Acceptance Scenarios**:

1. **Given** a passing build on the `release` branch, **When** a merge occurs, **Then** the CI workflow triggers automatically, builds the frontend, runs quality gates (typecheck, lint, format:check), and deploys the built artifacts to Cloudflare Pages.
2. **Given** the CI workflow completes the Cloudflare Pages deployment, **When** a user visits the custom domain, **Then** the latest version of the frontend is served over HTTPS with correct SPA routing (all routes resolve to `index.html`).
3. **Given** the frontend build fails quality gates, **When** the CI workflow runs, **Then** the deployment is blocked and the failure is reported in the GitHub Actions summary.
4. **Given** a successful deployment, **When** the workflow completes, **Then** a deployment manifest is published to the GitHub Actions summary showing the CDN URL and deployment status.

---

### User Story 2 — Frontend is Pinned to IPFS for Decentralized Access (Priority: P2)

In addition to the CDN deployment, the same build artifact is pinned to IPFS via a pinning service. The resulting CID (content identifier) is published in the deployment manifest. Web3-savvy users can access the frontend via the IPFS CID directly or through an IPFS gateway URL.

**Why this priority**: This delivers the decentralized access layer required by the Decentralization-First principle. It ensures users are not solely dependent on the CDN provider, and the CID provides a cryptographic guarantee of content integrity.

**Independent Test**: Can be fully tested by triggering the workflow and verifying the output CID resolves to the correct site content via a public IPFS gateway.

**Acceptance Scenarios**:

1. **Given** a successful frontend build, **When** the CI workflow runs the IPFS pinning step, **Then** the build artifacts are uploaded to IPFS via a pinning service and a CID is returned.
2. **Given** the CID is produced, **When** a user accesses the CID via a public IPFS gateway, **Then** the frontend loads correctly.
3. **Given** the CID is produced, **When** the deployment manifest is published, **Then** it includes the IPFS CID and at least one gateway URL for easy access.
4. **Given** the pinning service is unavailable, **When** the CI workflow runs, **Then** the IPFS step fails but the CDN deployment (P1) is not blocked.

---

### User Story 3 — Frontend is Permanently Archived on Arweave (Priority: P3)

The same build artifact is uploaded to Arweave for permanent, immutable storage. The Arweave transaction ID is included in the deployment manifest. This provides an archival copy that persists independently of any pinning service or CDN.

**Why this priority**: Arweave provides the "deploy-and-forget" permanence guarantee. Even if the IPFS pin is lost and the CDN goes offline, the frontend remains accessible via Arweave. This is an insurance layer, not a primary access method.

**Independent Test**: Can be tested by triggering the workflow and verifying the Arweave transaction ID resolves to the correct site content via an Arweave gateway.

**Acceptance Scenarios**:

1. **Given** a successful frontend build, **When** the CI workflow runs the Arweave upload step, **Then** the build artifacts are uploaded to Arweave and a transaction ID is returned.
2. **Given** the transaction ID is produced, **When** a user accesses it via an Arweave gateway, **Then** the frontend loads correctly.
3. **Given** the Arweave upload completes, **When** the deployment manifest is published, **Then** it includes the Arweave transaction ID and gateway URL.
4. **Given** the Arweave upload service is unavailable, **When** the CI workflow runs, **Then** the Arweave step fails but the CDN and IPFS deployments are not blocked.

---

### User Story 4 — ENS Name Points to Latest IPFS Deployment (Priority: P4)

After the IPFS CID is produced, the ENS name's `contenthash` record is updated to point to the new CID. Users with ENS-aware browsers (e.g., Brave) or using the `eth.limo` gateway can access the latest frontend by visiting the ENS name.

**Why this priority**: ENS provides the decentralized naming layer that ties the IPFS CID to a human-readable address. Without it, users must know the raw CID. This completes the fully decentralized access path (ENS → IPFS) but depends on P2 (IPFS pinning) being in place first.

**Independent Test**: Can be tested by triggering the workflow and verifying the ENS name's contenthash resolves to the expected IPFS CID, and that visiting the ENS name via eth.limo serves the correct frontend.

**Acceptance Scenarios**:

1. **Given** an IPFS CID from a successful pinning step, **When** the ENS update step runs, **Then** the ENS name's contenthash is updated to the new IPFS CID via an on-chain transaction.
2. **Given** the ENS update completes, **When** a user visits the ENS name via an ENS-aware browser or gateway, **Then** the latest frontend version is served.
3. **Given** the ENS update step fails (e.g., insufficient gas, network issue), **When** the CI workflow runs, **Then** the failure is reported but CDN, IPFS, and Arweave deployments are not affected.
4. **Given** the deployment manifest is published, **When** a user reads it, **Then** it includes the ENS name and the corresponding IPFS CID it was updated to.

---

### User Story 5 — Developer Configures Deployment Secrets and Services (Priority: P1)

Before the CI workflow can run, a developer must configure the required external service accounts and provide API credentials as GitHub repository secrets. The project documents exactly which services to sign up for and which secrets to set.

**Why this priority**: This is a prerequisite for all deployment stories. Without proper configuration, no deployment target works. Co-prioritized with P1 because it is a one-time setup that gates everything else.

**Independent Test**: Can be tested by following the documented setup guide and verifying all secrets are accepted by the CI workflow without authentication errors.

**Acceptance Scenarios**:

1. **Given** a developer reads the setup documentation, **When** they follow the steps, **Then** they can identify all external services to register with and all GitHub secrets to configure.
2. **Given** all secrets are configured correctly, **When** the CI workflow runs for the first time, **Then** all deployment steps authenticate successfully.
3. **Given** a secret is missing or invalid, **When** the CI workflow runs, **Then** the affected step fails with a clear error message identifying the missing or invalid credential.

---

### Edge Cases

- What happens when the `release` branch build fails quality gates (typecheck, lint, format)? → Deployment is blocked entirely; no artifacts are deployed anywhere.
- What happens when one deployment target fails but others succeed? → Each target (CDN, IPFS, Arweave, ENS) operates independently. A failure in one does not block the others. The deployment manifest reports partial success.
- What happens when the deployer wallet has insufficient ETH for the ENS update? → The ENS step fails with a clear error. All other deployments proceed normally.
- What happens when the IPFS pinning service rate-limits or rejects the upload? → The IPFS step fails. The CDN and Arweave deployments still proceed. The ENS update is skipped (it depends on a valid CID).
- What happens when two merges to `release` occur in quick succession? → GitHub Actions handles concurrency. Deployments should either queue or the latest merge supersedes the previous one. The final state of all targets should reflect the latest build.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The CI workflow MUST trigger automatically on every merge to the `release` branch.
- **FR-002**: The CI workflow MUST build the frontend and run all quality gates (`typecheck`, `lint`, `format:check`) before any deployment step.
- **FR-003**: The CI workflow MUST deploy the built frontend to a CDN with a custom domain, serving the site over HTTPS with proper SPA routing.
- **FR-004**: The CI workflow MUST pin the built frontend to IPFS via a pinning service and output the resulting CID.
- **FR-005**: The CI workflow MUST upload the built frontend to Arweave for permanent storage and output the resulting transaction ID.
- **FR-006**: The CI workflow MUST update an ENS name's contenthash to the IPFS CID produced in FR-004.
- **FR-007**: Each deployment target (CDN, IPFS, Arweave, ENS) MUST operate independently — a failure in one MUST NOT block the others (except ENS depends on IPFS CID).
- **FR-008**: The CI workflow MUST produce a deployment manifest summarizing all deployment targets, their identifiers (URLs, CIDs, transaction IDs), and their success/failure status.
- **FR-009**: The project MUST include documentation listing all external services to register with, all API keys and secrets to provide, and step-by-step setup instructions.
- **FR-010**: The CDN deployment MUST support SPA routing (all paths resolve to `index.html`).
- **FR-011**: A deployer wallet private key MUST be stored as a GitHub secret and used for ENS updates and Arweave payments. This key MUST NOT be the project's primary admin key — it should be a dedicated deployment key with limited scope.
- **FR-012**: The CI workflow MUST NOT deploy if quality gates fail.

### Key Entities

- **Build Artifact**: The output of `vite build` (static HTML, JS, CSS files in a `dist/` directory). This is the single source of truth deployed to all targets.
- **Deployment Manifest**: A summary document (rendered in GitHub Actions step summary) listing each deployment target, its status, and its access identifier (URL, CID, TX ID).
- **Deployer Wallet**: A dedicated wallet that holds ETH for ENS updates and Arweave payments. Not the project admin wallet — limited in scope and funds.
- **IPFS CID**: Content identifier produced by pinning the build artifact. Used as the ENS contenthash and as a verifiable fingerprint of the build.
- **Arweave Transaction ID**: Identifier for the permanently stored build artifact on Arweave.

## Service & Secret Inventory *(mandatory)*

### External Services to Register

| Service                | Purpose                                         | Free Tier                          | Sign-up URL                                        |
| ---------------------- | ----------------------------------------------- | ---------------------------------- | -------------------------------------------------- |
| **Cloudflare**         | CDN hosting (Pages) + DNS management            | Unlimited bandwidth, 500 builds/mo | https://dash.cloudflare.com/sign-up                |
| **Pinata**             | IPFS pinning service                            | 500 MB storage, 1 API key          | https://app.pinata.cloud/register                  |
| **Irys** (for Arweave) | Bundled uploads to Arweave, accepts ETH payment | Pay-per-use (no subscription)      | https://irys.xyz (fund via CLI)                    |
| **ENS**                | Decentralized domain name                       | ~$5/year for 5+ char name          | https://app.ens.domains                            |
| **Alchemy or Infura**  | Ethereum RPC endpoint for ENS transactions      | Free tier available                | https://dashboard.alchemy.com or https://infura.io |

### GitHub Secrets Required

| Secret Name             | Source                                  | Purpose                                                        |
| ----------------------- | --------------------------------------- | -------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare dashboard → API Tokens       | Authenticate Wrangler CLI for Pages deployment                 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Overview sidebar | Identify the Cloudflare account                                |
| `PINATA_JWT`            | Pinata dashboard → API Keys             | Authenticate IPFS pinning uploads                              |
| `DEPLOYER_PRIVATE_KEY`  | Generated wallet (dedicated deploy key) | Sign ENS contenthash updates and fund Arweave uploads via Irys |
| `ETH_RPC_URL`           | Alchemy/Infura dashboard                | Ethereum RPC endpoint for ENS transactions                     |

### Assumptions

- The custom domain (e.g., `ourvoice.app`) will be purchased separately and its DNS nameservers pointed to Cloudflare.
- The ENS name (e.g., `ourvoice.eth`) will be registered manually before the first CI run.
- The deployer wallet will be funded with a small amount of ETH (enough for ENS gas + Irys deposits) before the first CI run.
- The Cloudflare Pages project will be created once manually (`wrangler pages project create`) before the first CI run.
- Arweave upload costs are paid in ETH via Irys — no need for a separate AR token wallet.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every merge to `release` that passes quality gates results in at least the CDN deployment completing successfully, with the site accessible at the custom domain within 5 minutes.
- **SC-002**: The IPFS CID in the deployment manifest resolves to the correct frontend content via at least one public IPFS gateway.
- **SC-003**: The Arweave transaction ID in the deployment manifest resolves to the correct frontend content via an Arweave gateway.
- **SC-004**: The ENS name resolves to the latest IPFS CID, and visiting the ENS name via eth.limo serves the current frontend.
- **SC-005**: A developer can go from zero configuration to a working deployment pipeline by following the setup documentation in under 30 minutes.
- **SC-006**: No manual intervention is required after initial setup — merges to `release` trigger the full deployment pipeline automatically.
- **SC-007**: Failure in any single deployment target does not prevent the other targets from completing (fault isolation).
- **SC-008**: All deployment identifiers (CDN URL, IPFS CID, Arweave TX ID, ENS name) point to the same build artifact, enabling users to verify integrity across access methods.
