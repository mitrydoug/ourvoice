# Quickstart: Static Site Deployment Setup

**Feature**: 014-static-site-deploy
**Time to complete**: ~30 minutes

This guide walks you through the one-time setup required to enable the automated CI/CD deployment pipeline for the Our Voice frontend.

---

## Prerequisites

- Admin access to the GitHub repository (to set secrets)
- A web browser and a funded Ethereum wallet (MetaMask or similar)
- ~$20 USD equivalent in ETH for initial setup (ENS name + wallet funding)

---

## Step 1: Create a Deployer Wallet

Create a **dedicated** Ethereum wallet for deployment operations. Do NOT use your personal wallet or the project admin wallet.

1. Generate a new wallet using any method:
   - MetaMask: Create a new account
   - CLI: `node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"`
2. Save the **private key** securely — you'll need it for GitHub secrets
3. Save the **address** — you'll need it for ENS manager setup and Irys funding
4. Fund the wallet with **≥0.05 ETH** from your main wallet (covers ENS gas + Arweave storage for many deployments)

---

## Step 2: Register the ENS Name

1. Go to https://app.ens.domains
2. Search for `ourvoice.eth` (or your chosen name)
3. Register the name (pay with your main wallet, ~$5/year)
4. After registration, go to the name's settings
5. Under "Roles", add your deployer wallet address as **Manager**
   - This allows the deployer wallet to update records without owning the name
6. Verify the resolver is set to "Public Resolver" (default)

---

## Step 3: Sign Up for Cloudflare

1. Create an account at https://dash.cloudflare.com/sign-up
2. **Create Pages project**:
   ```bash
   npx wrangler pages project create ourvoice
   ```
   (You'll be prompted to log in to Cloudflare on first use)
3. **Add custom domain** (optional, can be done later):
   - Go to Cloudflare dashboard → Pages → ourvoice → Custom domains
   - Add your domain (e.g., `ourvoice.app`)
   - Follow DNS instructions to point your domain to Cloudflare
4. **Create API token**:
   - Go to My Profile → API Tokens → Create Token
   - Use the "Custom token" option
   - Permissions: Account → Cloudflare Pages → Edit
   - Account Resources: Include → All Accounts (or your specific account)
   - Create Token and **copy it**
5. **Copy Account ID**:
   - Go to any domain in the dashboard, or the overview page
   - Account ID is in the right sidebar

---

## Step 4: Sign Up for Pinata

1. Create an account at https://app.pinata.cloud/register
2. Go to Dashboard → API Keys → New Key
3. Name it (e.g., "ourvoice-ci")
4. Grant "Admin" permissions (or specifically: "pinFileToIPFS", "pinList")
5. Copy the **JWT token** (the long string, not the API key + secret)

---

## Step 5: Set Up Irys (Arweave)

> ⚠️ Verify current Irys SDK status at https://irys.xyz before proceeding. If Irys documentation is unavailable, see fallback options in [research.md](research.md#3-irys--arweave-permanent-storage).

1. Install the Irys CLI:
   ```bash
   npm install -g @irys/cli
   ```
2. Fund your Irys account using the deployer wallet:
   ```bash
   irys fund 50000000000000000 \
     -t ethereum \
     -n mainnet \
     -w <DEPLOYER_PRIVATE_KEY>
   ```
   (50000000000000000 wei = 0.05 ETH — enough for many deploys)
3. Verify balance:
   ```bash
   irys balance <DEPLOYER_ADDRESS> -t ethereum -n mainnet
   ```

---

## Step 6: Get an Ethereum RPC URL

1. Sign up for an RPC provider:
   - **Alchemy**: https://dashboard.alchemy.com (recommended)
   - **Infura**: https://infura.io
2. Create a new app/project for Ethereum Mainnet
3. Copy the HTTPS RPC URL (e.g., `https://eth-mainnet.g.alchemy.com/v2/<key>`)

---

## Step 7: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `CLOUDFLARE_API_TOKEN` | The Cloudflare API token from Step 3 |
| `CLOUDFLARE_ACCOUNT_ID` | The Cloudflare Account ID from Step 3 |
| `PINATA_JWT` | The Pinata JWT token from Step 4 |
| `DEPLOYER_PRIVATE_KEY` | The deployer wallet private key from Step 1 |
| `ETH_RPC_URL` | The Ethereum RPC URL from Step 6 |

---

## Step 8: Verify Setup

1. Push a commit to the `release` branch (or trigger the workflow manually via GitHub Actions → "Deploy DApp" → "Run workflow")
2. Check the GitHub Actions run:
   - **Build job**: Should pass all quality gates and produce a build artifact
   - **Cloudflare Pages**: Should deploy and show a URL in the step summary
   - **IPFS**: Should pin and show a CID in the step summary
   - **Arweave**: Should upload and show a TX ID in the step summary
   - **ENS**: Should update contenthash (verify at https://app.ens.domains)
3. Verify access at each tier:
   - CDN: Visit your custom domain
   - IPFS: Visit the gateway URL from the manifest
   - Arweave: Visit the Arweave gateway URL from the manifest
   - ENS: Visit `ourvoice.eth.limo` (may take a few minutes to propagate)

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| "Unauthorized" in Cloudflare step | Bad API token | Regenerate token in Cloudflare dashboard |
| "Project not found" in Cloudflare step | Pages project not created | Run `npx wrangler pages project create ourvoice` |
| "Unauthorized" in IPFS step | Bad Pinata JWT | Regenerate API key in Pinata dashboard |
| "Insufficient balance" in Arweave step | Irys account not funded | Fund via `irys fund` command |
| "Not authorized" in ENS step | Deployer not set as manager | Add deployer address as manager in ENS app |
| "Insufficient funds" in ENS step | Deployer wallet empty | Send more ETH to deployer address |
| SPA routing broken (404 on refresh) | Missing `_redirects` file | Verify `frontend/public/_redirects` exists with `/* /index.html 200` |
| Assets loading from wrong path | Vite `base` still set to `/ourvoice/` | Change `base` to `"/"` in `vite.config.js` |

---

## Cost Summary

| Item | Cost | Frequency |
|------|------|-----------|
| ENS name | ~$5/year | Annual renewal |
| Deployer wallet funding | ~$10–20 ETH | As needed (covers many deployments) |
| Cloudflare Pages | Free | Unlimited |
| Pinata | Free (500 MB) | Per-deployment pinning within free tier |
| Per-deployment gas (ENS) | ~$1–10 | Each merge to release |
| Per-deployment Arweave | ~$0.01–$0.10 | Each merge to release |
