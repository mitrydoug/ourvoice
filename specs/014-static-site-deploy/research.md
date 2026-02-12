# Research: Static Site Deployment via CI/CD

**Feature**: 014-static-site-deploy
**Date**: 2026-02-12
**Purpose**: Resolve unknowns from Technical Context, research best practices for each deployment target

---

## 1. Cloudflare Pages — Wrangler CLI Deployment

### Decision: Use `cloudflare/wrangler-action@v3` with `wrangler pages deploy`

**Rationale**: First-party GitHub Action maintained by Cloudflare. Handles Wrangler installation, auth, and deployment in a single step. Outputs include `deployment-url` for the manifest.

**Alternatives considered**:
- Manual `npm install wrangler && wrangler pages deploy` — works but more boilerplate, no built-in output parsing
- Cloudflare Pages git integration — requires giving Cloudflare repo access; we prefer artifact-based CI deploy for separation of concerns

### Key Findings

**CLI command**:
```bash
wrangler pages deploy <directory> --project-name=<name>
```

**GitHub Action** (`cloudflare/wrangler-action@v3`, latest v3.14.1):
- Inputs: `apiToken` (required), `accountId`, `command`
- Outputs: `deployment-url`, `command-output`, `command-stderr`

**SPA routing**: Cloudflare Pages supports a `_redirects` file in the build output root:
```
/* /index.html 200
```
The `200` status code makes this a rewrite (not a redirect), which is the correct SPA behavior. Limits: 2,000 static + 100 dynamic redirects.

**Vite base path**: Must change from `"/ourvoice/"` to `"/"`. The current value is for GitHub Pages subpath hosting. Cloudflare Pages with a custom domain serves from root.

**One-time setup**:
1. Create Cloudflare account
2. Create Pages project: `npx wrangler pages project create ourvoice`
3. Assign custom domain in Cloudflare dashboard → Pages → Custom domains
4. Create API token with "Cloudflare Pages:Edit" permission
5. Note Account ID from dashboard sidebar

---

## 2. Pinata — IPFS Pinning

### Decision: Use the `pinata-web3` SDK for directory pinning via Node.js script in CI

**Rationale**: Pinata has two SDK packages — only `pinata-web3` supports public IPFS folder uploads. The Go-based CLI exists but lacks programmatic CID output parsing. A small Node.js script using the SDK gives us clean CID extraction and error handling.

**Alternatives considered**:
- Legacy REST API (`POST /pinning/pinFileToIPFS`) — functional but deprecated in favor of V3; requires multipart form assembly for directories
- Pinata Go CLI (`pinata upload`) — less CI-friendly; output parsing is fragile
- web3.storage — strong alternative but uses DID-based auth (more complex setup than JWT)
- 4EVERLAND — another IPFS pinning provider but less established

### Key Findings

**SDK packages**:
| Package | Purpose |
|---------|---------|
| `pinata` | General Pinata Files API (V3) — no folder upload |
| `pinata-web3` | IPFS-specific features including public folder uploads |

**Directory pinning** (using `pinata-web3`):
```typescript
import { PinataSDK } from "pinata-web3";
const pinata = new PinataSDK({ pinataJwt, pinataGateway });
const result = await pinata.upload.public.fileArray(files);
// result.cid → "bafybeih..." (CIDv1 base32)
```

**Auth**: JWT token (single string). Created in Pinata dashboard → API Keys.

**CID format**: Returns CIDv1 (base32) by default — compatible with ENS contenthash encoding.

**Free tier**: 500 MB storage, 1 API key — sufficient for static site builds (typically 2–10 MB).

**CI approach**: A Node.js script that reads the `dist/` directory, uploads via SDK, and writes the CID to `$GITHUB_OUTPUT`.

---

## 3. Irys — Arweave Permanent Storage

### Decision: Use `@irys/sdk` for directory uploads to Arweave. RISK: Irys documentation is currently inaccessible (404); verify SDK status before implementation.

**Rationale**: Irys (formerly Bundlr) is the most established bundling service for Arweave uploads, supporting ETH payment and directory manifest uploads. However, their documentation site is currently down and the SDK is being refactored.

**Alternatives considered**:
- ArDrive / `ardrive-cli` — direct Arweave upload, no bundling layer; requires AR tokens directly
- `arkb` — Arweave deploy tool; simpler but less maintained
- Turbo by Arweave (ardrive.io) — newer service, may be more stable than Irys currently

### Key Findings

**SDK** (prior known API — `@irys/sdk`):
```typescript
import Irys from "@irys/sdk";
const irys = new Irys({
  network: "mainnet",
  token: "ethereum",
  key: privateKey,
  config: { providerUrl: rpcUrl },
});
await irys.fund(irys.utils.toAtomic(0.05)); // Fund in ETH
const receipt = await irys.uploadFolder("./dist", {
  indexFile: "index.html",
});
// receipt → manifest ID accessible at https://gateway.irys.xyz/<manifestId>
```

**CLI** (prior known — `@irys/cli`):
```bash
irys upload-dir ./dist -t ethereum -n mainnet -w <wallet-key> --index-file index.html
```

**Payment model**: Pre-fund an Irys account in ETH (or MATIC, SOL, etc.), then upload. Cost: ~$0.01–$0.10 for a typical React build.

**Gateway URLs**: `https://gateway.irys.xyz/<txId>` or `https://arweave.net/<txId>`

**⚠️ RISK**: All `docs.irys.xyz` URLs currently return 404. The GitHub repo (`Irys-xyz/irys-js`) shows active refactoring ("storage → consensus config" renaming). Package names may have changed. **MUST verify current SDK/CLI state before implementation.**

**Mitigation**: If Irys SDK is broken at implementation time, fall back to:
1. `ardrive-cli` with AR token payment, or
2. ArDrive Turbo (https://ardrive.io/turbo/) which offers a REST API for uploads

---

## 4. ENS — Contenthash Update

### Decision: Use `content-hash` npm package + `ethers` v6 for ENS contenthash encoding and on-chain update

**Rationale**: Direct approach using well-known packages already in the project's dependency tree (ethers.js). The `content-hash` package handles ENSIP-7 encoding. A standalone Node.js script keeps the CI step simple and debuggable.

**Alternatives considered**:
- `@ensdomains/ensjs` — higher-level SDK but npm page was inaccessible (403) during research; less predictable API stability
- Inline encoding without `content-hash` — possible but error-prone; the ENSIP-7 format is non-trivial

### Key Findings

**Package**: `content-hash` v2.5.2 (maintained by pldespaigne). Note: last commit ~5 years ago but still functional and widely used.

**Encoding**:
```typescript
import contentHash from "content-hash";
const encoded = "0x" + contentHash.encode("ipfs-ns", cidV1String);
// → "0xe3010170..." (ENSIP-7 format)
```

**On-chain update** (ethers v6):
```typescript
import { ethers } from "ethers";
const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);
const resolver = new ethers.Contract(resolverAddress, [
  "function setContenthash(bytes32 node, bytes calldata hash) external"
], wallet);
const node = ethers.namehash("ourvoice.eth");
await resolver.setContenthash(node, encoded);
```

**ENS Public Resolver** (mainnet): `0xF29100983E058B709F3D539b0c765937B804AC15`

**Gas cost**: ~$1–10 per contenthash update, depending on network conditions.

**One-time setup**:
1. Register ENS name at https://app.ens.domains
2. Set resolver to public resolver (default for new names)
3. Generate a dedicated deployer wallet
4. Fund wallet with ETH for gas
5. Transfer ENS name ownership to deployer wallet (or set deployer as manager)

---

## 5. GitHub Actions — Workflow Patterns

### Decision: Multi-job workflow with shared build artifact, parallel deployment jobs, and a final manifest job

**Rationale**: Separating build from deploy allows fault isolation (FR-007). Parallel deployment jobs minimize total pipeline time.

### Key Findings

**Artifact sharing** (`actions/upload-artifact@v4` / `actions/download-artifact@v4`):
- v4+ BREAKING: each job must upload to a unique artifact name
- Use `actions/upload-artifact@v4` in build job, `actions/download-artifact@v4` in each deploy job

**Job outputs** for passing CIDs/URLs:
```yaml
jobs:
  deploy-ipfs:
    outputs:
      cid: ${{ steps.pin.outputs.cid }}
```

**Fault isolation**: Use `if: always() && needs.build.result == 'success'` on deploy jobs so they run even if sibling jobs fail, but only if the build succeeded.

**Concurrency**:
```yaml
concurrency:
  group: deploy-release
  cancel-in-progress: false  # Queue, don't cancel production deploys
```

**ENS depends on IPFS**: Use `needs: [build, deploy-ipfs]` for the ENS job so it only runs after a successful IPFS pin produces a CID.

---

## 6. Vite Base Path Migration

### Decision: Change `base` from `"/ourvoice/"` to `"/"` and use environment variable for flexibility

**Rationale**: Cloudflare Pages with a custom domain serves from root. GitHub Pages required `/ourvoice/` subpath. Since we're replacing GitHub Pages, the subpath is no longer needed.

**Impact**: All asset URLs in the built output change. Links like `/ourvoice/assets/main.js` become `/assets/main.js`. This is a build-time change only — no runtime code modifications.

**Alternative considered**: Environment-variable-based `base` (e.g., `base: process.env.VITE_BASE || "/"`) for flexibility. This adds slight complexity but allows temporary dual-deployment if needed during migration. **Recommended for safety.**

---

## Summary of Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Irys SDK/docs currently broken (404, active refactoring) | HIGH | Verify at implementation time; fall back to ArDrive Turbo or `arkb` |
| 2 | `content-hash` npm package unmaintained (~5 years) | LOW | Package is stable and widely used; ENSIP-7 format hasn't changed |
| 3 | Pinata has two confusing SDK packages | LOW | Use `pinata-web3` specifically; document clearly |
| 4 | ENS gas costs variable | LOW | Use gas estimation; document minimum wallet funding |
| 5 | Vite base path change may break existing GitHub Pages deploy | MEDIUM | Implement as atomic swap: remove old workflow in same PR as new one |
