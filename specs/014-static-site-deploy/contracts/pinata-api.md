# API Contract: Pinata IPFS Pinning

**Service**: Pinata IPFS via `pinata-web3` SDK
**Used by**: `deploy-ipfs` job in CI workflow

---

## Interface: Node.js SDK

**Package**: `pinata-web3`

### Initialization

```typescript
import { PinataSDK } from "pinata-web3";

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: "gateway.pinata.cloud",
});
```

### Upload Directory

```typescript
// Convert dist/ files to File objects, then:
const result = await pinata.upload.public.fileArray(files);
```

### Response Shape

```json
{
  "cid": "bafybeih...",
  "name": "ourvoice-frontend",
  "number_of_files": 42,
  "size": 5242880
}
```

| Field | Type | Description |
|-------|------|-------------|
| `cid` | string | CIDv1 (base32) content identifier |
| `name` | string | Assignment name from upload |
| `number_of_files` | number | Count of files in the directory |
| `size` | number | Total size in bytes |

### Output to GitHub Actions

```bash
echo "cid=${CID}" >> "$GITHUB_OUTPUT"
```

### Error Cases

| Error | Cause | Resolution |
|-------|-------|------------|
| 401 Unauthorized | Invalid or expired JWT | Regenerate in Pinata dashboard → API Keys |
| 413 Payload Too Large | Upload exceeds tier limit | Check free tier (500 MB); compress assets |
| 429 Rate Limited | Too many requests | Add retry logic with exponential backoff |

---

## Verification

After pinning, the content is accessible via:
- `https://gateway.pinata.cloud/ipfs/<cid>`
- `https://ipfs.io/ipfs/<cid>` (public gateway)
- `https://dweb.link/ipfs/<cid>` (public gateway)

---

## One-Time Setup

1. Create Pinata account at https://app.pinata.cloud/register
2. Go to Dashboard → API Keys → New Key
3. Grant "pinFileToIPFS" and "pinList" permissions (or Admin)
4. Copy the JWT token
5. Set GitHub secret: `PINATA_JWT`
