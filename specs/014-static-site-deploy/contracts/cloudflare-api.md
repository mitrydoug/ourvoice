# API Contract: Cloudflare Pages Deployment

**Service**: Cloudflare Pages via Wrangler CLI
**Used by**: `deploy-cloudflare` job in CI workflow

---

## Interface: GitHub Action

**Action**: `cloudflare/wrangler-action@v3`

### Inputs

| Parameter | Required | Value |
|-----------|----------|-------|
| `apiToken` | Yes | `${{ secrets.CLOUDFLARE_API_TOKEN }}` |
| `accountId` | Yes | `${{ secrets.CLOUDFLARE_ACCOUNT_ID }}` |
| `command` | Yes | `pages deploy dist --project-name=ourvoice` |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `deployment-url` | string | The URL of the deployed site (e.g., `https://<hash>.ourvoice.pages.dev`) |
| `command-output` | string | stdout from Wrangler |
| `command-stderr` | string | stderr from Wrangler |

### Error Cases

| Error | Cause | Resolution |
|-------|-------|------------|
| 401 Unauthorized | Invalid or expired `CLOUDFLARE_API_TOKEN` | Regenerate token in Cloudflare dashboard |
| Project not found | `--project-name` doesn't match existing project | Run `wrangler pages project create ourvoice` |
| Rate limit | >500 builds/month on free tier | Upgrade plan or reduce deploy frequency |

---

## SPA Routing Configuration

**File**: `frontend/public/_redirects`

```
/* /index.html 200
```

This file is included in the build output and instructs Cloudflare Pages to serve `index.html` for all unmatched routes (SPA rewrite).

---

## One-Time Setup

1. Create Cloudflare account at https://dash.cloudflare.com/sign-up
2. Create Pages project: `npx wrangler pages project create ourvoice`
3. Add custom domain: Dashboard → Pages → ourvoice → Custom domains → Add domain
4. Create API token: Dashboard → My Profile → API Tokens → Create Token
   - Permission: "Cloudflare Pages:Edit"
   - Account resources: Include → your account
5. Copy Account ID from Dashboard → Overview → right sidebar
6. Set GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
