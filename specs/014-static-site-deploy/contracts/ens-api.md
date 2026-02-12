# API Contract: ENS Contenthash Update

**Service**: ENS (Ethereum Name Service) Public Resolver
**Used by**: `update-ens` job in CI workflow

---

## Interface: Ethereum Smart Contract (via ethers.js v6)

### Dependencies

```json
{
  "ethers": "^6.15.0",
  "content-hash": "^2.5.2"
}
```

### ENS Public Resolver

**Address** (Ethereum Mainnet): `0xF29100983E058B709F3D539b0c765937B804AC15`

**Method**:
```solidity
function setContenthash(bytes32 node, bytes calldata hash) external;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `node` | bytes32 | `namehash("ourvoice.eth")` — EIP-137 name hash |
| `hash` | bytes | ENSIP-7 encoded contenthash (IPFS CID encoded as multicodec bytes) |

### Contenthash Encoding (ENSIP-7 / EIP-1577)

```typescript
import contentHash from "content-hash";

// Encode IPFS CIDv1 to ENS contenthash format
const encoded = "0x" + contentHash.encode("ipfs-ns", cidV1String);
// → "0xe3010170122029f2d17be6139079dc48696d1f582a..."
```

**Binary format**: `<protoCode><cid-version><multicodec-content-type><multihash>`
- IPFS protoCode: `0xe3`
- CID version: `0x01` (CIDv1)

### Full Update Flow

```typescript
import { ethers } from "ethers";
import contentHash from "content-hash";

const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

const ENS_PUBLIC_RESOLVER = "0xF29100983E058B709F3D539b0c765937B804AC15";
const resolverABI = [
  "function setContenthash(bytes32 node, bytes calldata hash) external"
];
const resolver = new ethers.Contract(ENS_PUBLIC_RESOLVER, resolverABI, wallet);

const node = ethers.namehash("ourvoice.eth");
const encoded = "0x" + contentHash.encode("ipfs-ns", ipfsCid);

const tx = await resolver.setContenthash(node, encoded);
const receipt = await tx.wait();
// receipt.hash → transaction hash for verification
```

### Output to GitHub Actions

```bash
echo "tx-hash=${TX_HASH}" >> "$GITHUB_OUTPUT"
echo "ens-name=ourvoice.eth" >> "$GITHUB_OUTPUT"
```

### Error Cases

| Error | Cause | Resolution |
|-------|-------|------------|
| Insufficient funds | Deployer wallet low on ETH | Fund wallet with more ETH |
| Not authorized | Deployer wallet is not the name owner/manager | Transfer management to deployer address via ENS app |
| Invalid contenthash | Malformed CID encoding | Verify CID is valid CIDv1 base32 before encoding |
| Transaction reverted | Resolver doesn't support contenthash | Verify resolver is the public resolver (supports EIP-165 interface `0xbc1c58d1`) |
| Nonce too low | Concurrent transactions from same wallet | Use nonce management or sequential execution |

### Gas Costs

| Operation | Typical Gas | Cost at 30 gwei |
|-----------|-------------|------------------|
| `setContenthash` | ~50,000–80,000 gas | ~$1–5 |

---

## Verification

After the transaction is confirmed:
- ENS app (https://app.ens.domains) shows the updated contenthash
- `https://ourvoice.eth.limo` serves the content from the new IPFS CID
- Brave browser resolves `ourvoice.eth` natively

---

## One-Time Setup

1. Register `ourvoice.eth` at https://app.ens.domains (~$5/year for 5+ char name)
2. Set the resolver to the public resolver (default for new names)
3. Generate a dedicated deployer wallet
4. In ENS app: Set the deployer wallet as a **manager** of the name (allows contenthash updates without transferring ownership)
5. Fund the deployer wallet with ETH (≥0.05 ETH for several deployments worth of gas)
6. Set GitHub secrets: `DEPLOYER_PRIVATE_KEY`, `ETH_RPC_URL`
