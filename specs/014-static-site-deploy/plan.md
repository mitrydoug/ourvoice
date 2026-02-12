# Implementation Plan: Static Site Deployment via CI/CD

**Branch**: `014-static-site-deploy` | **Date**: 2026-02-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/014-static-site-deploy/spec.md`

## Summary

Implement a GitHub Actions CI/CD workflow that, on every merge to the `release` branch, builds the frontend and deploys it to four targets: Cloudflare Pages (CDN), IPFS (Pinata), Arweave (Irys), and ENS (contenthash update). Each target operates independently with fault isolation. A deployment manifest summarizes results. This hybrid approach satisfies the Decentralization-First principle (IPFS + Arweave + ENS for censorship resistance) while providing a beginner-friendly CDN access layer (Cloudflare Pages).

## Technical Context

**Language/Version**: YAML (GitHub Actions workflow), Node.js 22 (build + deploy scripts), TypeScript (ENS update script)
**Primary Dependencies**: `wrangler` (Cloudflare CLI), `pinata-web3` (IPFS SDK), `@irys/sdk` (Arweave uploads), `content-hash` + `ethers` v6 (ENS update)
**Storage**: N/A — this feature produces deployment artifacts, not persistent data
**Testing**: Manual verification (deploy manifest + gateway access checks); no unit tests for CI workflow YAML
**Target Platform**: GitHub Actions (ubuntu-latest runners)
**Project Type**: CI/CD pipeline (no application source code changes beyond `vite.config.js` base path and `_redirects`)
**Performance Goals**: Full deployment pipeline completes in under 10 minutes
**Constraints**: Free-tier limits on Cloudflare Pages (500 builds/month) and Pinata (500 MB storage); ENS update costs ~$1–10 gas per deployment
**Scale/Scope**: Single workflow file, one ENS update helper script, `_redirects` file, documentation updates

### Existing State

- **Current deployment**: `.github/workflows/release-site.yaml` deploys to GitHub Pages on push to `release`. No quality gates are run in this workflow. It will be replaced.
- **PR checks**: `.github/workflows/pr-checks.yaml` runs `lint` and `format:check` on PRs to `develop`/`release` but not `typecheck`.
- **Vite base path**: `vite.config.js` has `base: "/ourvoice/"` for GitHub Pages subpath hosting. Must change to `base: "/"` for Cloudflare Pages with a custom domain.
- **No `_redirects`** file exists in `frontend/public/` — needed for SPA routing on Cloudflare Pages.
- **Node version inconsistency**: `release-site.yaml` uses Node 20, `pr-checks.yaml` uses Node 22.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Decentralization-First — ✅ PASS
The hybrid deployment to IPFS + Arweave + ENS ensures the frontend is accessible without centralized infrastructure. Cloudflare Pages is explicitly an optional convenience layer; the site remains fully functional via ENS → IPFS or direct Arweave access.

### II. Smart Contract Correctness — ✅ N/A
This feature does not modify any smart contracts.

### III. Code Quality Standards — ✅ PASS
The CI workflow runs `typecheck`, `lint`, and `format:check` before any deployment. This is an improvement over the current `release-site.yaml` which runs no quality gates.

### IV. Progressive Decentralization — ✅ PASS
The four deployment targets map directly to user sophistication tiers: Cloudflare Pages (beginner), ENS+gateway (intermediate), IPFS node (advanced), Arweave (archivist). All tiers serve the same build artifact.

### V. Humanity Verification — ✅ N/A
Not applicable to deployment infrastructure.

### VI. Open Source Commitment — ✅ PASS
All CI tooling uses open-source CLIs (Wrangler, Pinata SDK, Irys SDK, ethers.js). The workflow YAML, helper scripts, and setup documentation are all committed to the open-source repo. No proprietary services are required — each deployment target has open alternatives.

**Gate Result: PASS** — no violations, proceed to Phase 0.

### Post-Design Re-evaluation (after Phase 1)

All six principles re-confirmed after completing research.md, data-model.md, API contracts, and quickstart.md:

- **I. Decentralization-First** — ✅ PASS (confirmed). Research validated that IPFS+Arweave+ENS provide fully independent access paths. Cloudflare Pages remains explicitly optional. The deployment manifest (data-model.md) tracks all decentralized endpoints alongside the CDN URL.
- **II. Smart Contract Correctness** — ✅ N/A (unchanged). No contract modifications in scope.
- **III. Code Quality Standards** — ✅ PASS (strengthened). Adding `typecheck` to `pr-checks.yaml` increases gate coverage beyond the existing baseline.
- **IV. Progressive Decentralization** — ✅ PASS (confirmed). Four access tiers documented in quickstart.md verification steps: CDN domain → IPFS gateway → Arweave gateway → ENS `.eth.limo`.
- **V. Humanity Verification** — ✅ N/A (unchanged).
- **VI. Open Source Commitment** — ✅ PASS (confirmed with caveat). All tools are open source. **Risk noted**: Irys SDK documentation is currently unavailable (404). Fallback options (ArDrive Turbo, `arkb`, `arweave-js`) are all open source and documented in research.md.

**Post-Design Gate Result: PASS** — design is constitution-compliant.

## Project Structure

### Documentation (this feature)

```text
specs/014-static-site-deploy/
├── plan.md              # This file
├── research.md          # Phase 0: technology research findings
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: setup and deployment guide
├── contracts/           # Phase 1: API contracts for external services
│   ├── pinata-api.md
│   ├── irys-api.md
│   ├── ens-api.md
│   └── cloudflare-api.md
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    ├── release-site.yaml      # REPLACE: current GitHub Pages deploy → new multi-target deploy
    └── pr-checks.yaml         # MODIFY: add typecheck step for consistency

frontend/
├── vite.config.js             # MODIFY: change base from "/ourvoice/" to "/"
├── public/
│   └── _redirects             # CREATE: SPA routing rule for Cloudflare Pages
└── scripts/
    └── update-ens.mjs         # CREATE: Node.js script to update ENS contenthash
```

**Structure Decision**: This feature is primarily a CI/CD pipeline (workflow YAML + configuration files). The only new code is a small ENS update script in `frontend/scripts/`. No new application directories are needed.

## Complexity Tracking

> No constitution violations — this section is intentionally empty.
