# Site Deployment Brainstorm

## Goal

Deploy the Our Voice frontend (static React DApp) as part of CI with a **deploy-and-forget** workflow. Requirements:

- No infrastructure to manage
- No dependency on centralized services for core access
- Permissionless — anyone can access and verify the app
- Supports progressive decentralization (beginner → advanced users)

---

## Options Evaluated

### 1. IPFS (InterPlanetary File System)

**How it works**: Content-addressed P2P file storage. Upload a build, get a CID (content hash), anyone running an IPFS node can serve it.

**Pros**:
- Truly permissionless and censorship-resistant
- Content-addressed: CID guarantees integrity
- Pairs with ENS for fully decentralized naming
- Multiple pinning services (Pinata, web3.storage) — no vendor lock-in
- Free/low-cost for small static sites

**Cons**:
- Most users access via centralized HTTP gateways (ipfs.io, dweb.link)
- Cold content retrieval can be slow
- Requires pinning (content garbage-collected otherwise)
- Each deploy produces a new CID — need IPNS or DNSLink updates
- Pinning services can change pricing or shut down

**ENS + IPFS pairing**: ENS supports a `contenthash` field (EIP-1577) that stores an IPFS CID. IPFS-aware clients (Brave, eth.limo gateway) resolve `ourvoice.eth` → read contenthash → fetch from IPFS. Each deploy requires an on-chain ENS update (~$1–10 gas).

### 2. Walrus (Sui Ecosystem)

**How it works**: Decentralized blob storage on Sui blockchain using erasure coding.

**Pros**:
- Decentralized with economic guarantees
- Erasure coding = high availability without full replication
- Protocol-guaranteed availability for purchased storage epochs

**Cons**:
- Young ecosystem (launched 2025) — immature tooling
- Tied to Sui blockchain (Our Voice is EVM-based)
- Storage epochs are ~30 days — need renewal (not truly deploy-and-forget)
- Small gateway network

### 3. Arweave / Permaweb

**How it works**: Permanent, one-time-payment storage on the Arweave blockweave.

**Pros**:
- **Pay once, stored forever** — true deploy-and-forget
- Censorship-resistant
- Content-addressed with transaction IDs
- Mature ecosystem (live since 2018) — ArDrive, Irys, AR.IO gateways
- Good CI integration via Irys CLI/SDK
- Cost: ~$0.01–$0.10 per deployment for a typical React build (1–10 MB)

**Cons**:
- Immutable — can't delete buggy deploys (deploy new version + update pointer)
- Gateway dependency for most users (arweave.net, AR.IO)
- AR token price volatility affects cost predictability
- Cross-chain concern (Arweave is its own chain)

**Longevity assessment**: Medium-low risk. Endowment model funds 200+ years of storage. 8 years of operation. More likely to persist than any single company. Risk exists if AR token collapses and storage node operators lose incentive.

### 4. Vercel / Netlify / Cloudflare Pages (Traditional CDN)

**Pros**:
- Best DX and performance: git-push deploys, global CDN, preview deploys
- Extremely reliable (99.99% SLAs)
- Generous free tiers
- Zero friction for beginners

**Cons**:
- **Centralized** — provider can take site down (ToS, legal, business decision)
- **Permissioned** — depends on corporate account
- Not censorship-resistant
- Directly conflicts with Decentralization-First principle

**Cloudflare Pages advantages over Vercel/Netlify**:
- Unlimited bandwidth on free tier
- Native DNS integration (Cloudflare DNS is free, fast, reliable)
- Built-in health checks and failover in the Cloudflare ecosystem
- No serverless lock-in pressure

### 5. Fleek

**Status**: ☠️ **Dead** — no longer a viable option.

Previously offered IPFS pinning + CDN + ENS integration in a single service.

---

## Recommended Approach: IPFS + Arweave + Cloudflare Pages

### Architecture

```
                        ┌─────────────────────────────────┐
                        │           CI Build              │
                        │   (npm run build → ./dist)      │
                        └──────────────┬──────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
            │  Cloudflare  │  │   IPFS Pin   │  │    Arweave       │
            │    Pages     │  │   (Pinata)   │  │   (via Irys)     │
            │              │  │              │  │                  │
            │ • Static CDN │  │ • Pin CID    │  │ • Permanent copy │
            │ • Custom DNS │  │ • Return CID │  │ • Return TX ID   │
            └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘
                   │                 │                    │
                   │                 ▼                    │
                   │          ┌──────────────┐           │
                   │          │  ENS Update  │           │
                   │          │ contenthash  │           │
                   │          │  → IPFS CID  │           │
                   │          └──────┬───────┘           │
                   ▼                 ▼                    ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
            │ ourvoice.app │  │ourvoice.eth  │  │ arweave.net/<tx> │
            │ (beginners)  │  │ (web3 users) │  │ (archival)       │
            └──────────────┘  └──────────────┘  └──────────────────┘
```

### Why this combination

| Layer | Technology | Purpose | Failure mode |
|-------|-----------|---------|-------------|
| **Convenience CDN** | Cloudflare Pages | Fast HTTPS for beginners | CF goes down → fall back to ENS/Arweave |
| **Decentralized storage** | IPFS (Pinata) | Content-addressed, verifiable | Pinata stops → content still on Arweave |
| **Permanent archive** | Arweave (Irys) | Immutable permanent copy | Arweave collapse (unlikely) |
| **Decentralized naming** | ENS | `ourvoice.eth` → IPFS CID | As durable as Ethereum |
| **Traditional DNS** | Custom domain on CF | `ourvoice.app` for mainstream | DNS can be seized; ENS is backup |

### User access tiers

| User | Access method | Decentralization | Dependencies |
|------|--------------|-------------------|-------------|
| **Beginner** | `ourvoice.app` | ❌ Centralized (CDN + DNS) | Cloudflare, ICANN |
| **Intermediate** | `ourvoice.eth.limo` | ⚠️ Semi-decentralized | eth.limo gateway, ENS (on-chain) |
| **Advanced** | Resolve `ourvoice.eth` → CID → local IPFS node | ✅ Fully decentralized | Ethereum RPC, IPFS network |
| **Archivist** | `arweave.net/<tx>` or direct TX fetch | ✅ Permanent + decentralized | Arweave network |

### Cost per deployment

| Service | Cost | Notes |
|---------|------|-------|
| Cloudflare Pages | Free | Unlimited bandwidth on free tier |
| Pinata (IPFS) | Free | 500 MB free tier — plenty for static sites |
| Arweave via Irys | ~$0.01–$0.10 | For a typical 2–10 MB React build |
| ENS contenthash update | ~$1–10 | L1 Ethereum gas |
| ENS name (annual) | ~$5/year | For a 5+ character `.eth` name |
| **Total per deploy** | **~$1–10** | Dominated by ENS update gas |

### One-time setup

1. Register `ourvoice.eth` on ENS
2. Create Cloudflare account + Pages project (`npx wrangler pages project create ourvoice`)
3. Point `ourvoice.app` DNS to Cloudflare Pages
4. Create Pinata account + API key
5. Fund an Irys account with ETH for Arweave uploads
6. Configure GitHub Secrets:
   - `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`
   - `PINATA_JWT`
   - `DEPLOYER_PRIVATE_KEY` (owns ENS name, funds Irys)
   - `ETH_RPC_URL` / `ALCHEMY_KEY`
7. Add `_redirects` file to `frontend/public/` for SPA routing

### CI workflow

Triggered on push to `release` branch:

1. **Build**: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run build`
2. **Deploy to Cloudflare Pages**: via `wrangler pages deploy`
3. **Pin to IPFS**: via Pinata API → returns CID
4. **Upload to Arweave**: via Irys CLI → returns TX ID
5. **Update ENS**: set `ourvoice.eth` contenthash to new IPFS CID
6. **Publish manifest**: summary with all access URLs and CID for integrity verification

---

## Censorship Resistance Notes

No single technology guarantees access in authoritarian states (China, Russia, etc.). The strategy is **maximum surface area**:

- IPFS traffic is detectable/blockable via DPI; public gateways are blocked in China
- Arweave gateways can be blocked by URL
- Cloudflare is partially accessible in China (China network partnerships)
- **Tor (.onion site)** is the most effective for motivated users in censored regions
- Content-addressed nature is the key advantage: if anyone in-country gets the CID+files via any channel, they can verify authenticity

---

## Summary Matrix

| Criterion | IPFS | Walrus | Arweave | CF Pages | Hybrid (recommended) |
|---|---|---|---|---|---|
| Censorship resistance | ✅ High | ✅ High | ✅ Very high | ❌ None | ✅ High |
| Permissionless | ✅ | ✅ | ✅ | ❌ | ✅ |
| Deploy-and-forget | ⚠️ Pinning | ⚠️ Epochs | ✅ Permanent | ✅ | ✅ |
| Performance | ⚠️ | ⚠️ | ⚠️ | ✅ Excellent | ✅ Good |
| Beginner UX | ⚠️ Gateway | ⚠️ Gateway | ⚠️ Gateway | ✅ Excellent | ✅ Good |
| CI maturity | ✅ | ⚠️ Early | ✅ | ✅ | ✅ |
| Ecosystem maturity | ✅ | ⚠️ Young | ✅ | ✅ | ✅ |
| Cost | 💲 Low | 💲 Medium | 💲💲 One-time | 💲 Free | 💲 Low |
| Constitution alignment | ✅ Strong | ✅ Strong | ✅ Strong | ❌ Weak | ✅ Strongest |