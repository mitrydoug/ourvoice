# API Contract: Irys / Arweave Permanent Storage

**Service**: Irys SDK for Arweave uploads
**Used by**: `deploy-arweave` job in CI workflow

> **⚠️ WARNING**: Irys documentation (docs.irys.xyz) was returning 404 as of 2026-02-12. The SDK is being actively refactored. The interfaces below are based on the prior known API (`@irys/sdk`). **Verify current package names and API before implementing.**

---

## Interface: Node.js SDK (Prior Known API)

**Package**: `@irys/sdk` (may have been renamed — verify on npm)

### Initialization

```typescript
import Irys from "@irys/sdk";

const irys = new Irys({
  network: "mainnet",
  token: "ethereum",
  key: process.env.DEPLOYER_PRIVATE_KEY,
  config: {
    providerUrl: process.env.ETH_RPC_URL,
  },
});
```

### Fund Account (pre-upload)

```typescript
// Fund with 0.05 ETH (sufficient for many deploys)
await irys.fund(irys.utils.toAtomic(0.05));

// Check current balance
const balance = await irys.getLoadedBalance();
```

### Upload Directory

```typescript
const receipt = await irys.uploadFolder("./dist", {
  indexFile: "index.html",  // Sets the manifest index
  batchSize: 50,
});
// receipt.id → Arweave manifest transaction ID
```

### Response Shape

| Field            | Type   | Description                                                    |
| ---------------- | ------ | -------------------------------------------------------------- |
| `id`             | string | Arweave transaction ID (the manifest ID for directory uploads) |
| `timestamp`      | number | Upload timestamp                                               |
| `version`        | string | Receipt version                                                |
| `deadlineHeight` | number | Arweave block deadline                                         |

### Output to GitHub Actions

```bash
echo "tx-id=${MANIFEST_ID}" >> "$GITHUB_OUTPUT"
```

### Error Cases

| Error                | Cause                            | Resolution                             |
| -------------------- | -------------------------------- | -------------------------------------- |
| Insufficient balance | Irys account not funded          | Run `irys.fund()` or fund via CLI      |
| Network timeout      | Arweave/Irys mainnet unreachable | Retry with backoff                     |
| SDK not found        | Package has been renamed         | Check npm for `@irys/sdk` alternatives |

---

## CLI Alternative

```bash
irys upload-dir ./dist \
  -t ethereum \
  -n mainnet \
  -w <wallet-key> \
  --index-file index.html
```

---

## Verification

After upload, the content is accessible via:
- `https://gateway.irys.xyz/<manifest-id>` (Irys gateway)
- `https://arweave.net/<manifest-id>` (Arweave native gateway)

---

## Fallback Providers (if Irys SDK is broken)

1. **ArDrive Turbo** (https://ardrive.io/turbo/) — REST API for Arweave uploads, accepts credit card or crypto
2. **`arkb`** — CLI tool for deploying to Arweave directly (requires AR tokens)
3. **`arweave-js`** — Low-level Arweave SDK (requires AR tokens, manual manifest construction)

---

## One-Time Setup

1. Generate a dedicated deployer wallet (Ethereum)
2. Fund the wallet with ETH (for Irys deposits + ENS gas)
3. Fund Irys account: `irys fund 0.05 -t ethereum -n mainnet -w <key>`
4. Verify balance: `irys balance <address> -t ethereum -n mainnet`
5. Set GitHub secret: `DEPLOYER_PRIVATE_KEY` (same wallet used for ENS)
