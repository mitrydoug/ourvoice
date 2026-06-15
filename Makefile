# ── Local development (native processes + containerised Meilisearch) ─────────

.PHONY: local-setup
local-setup: ## One-time setup: install deps for all modules
	mise install
	cd frontend  && npm install
	cd blockchain && npm install
	cd backend && python -m venv .venv && . .venv/bin/activate && pip install uv && uv pip sync requirements.txt

.PHONY: local-mocked
local-mocked: ## Start local dev env with mocked registry
	overmind start -f Procfile.local-mocked

.PHONY: local-stress-test
local-stress-test: ## Start local dev env with mocked registry and stress-test fixture data
	overmind start -f Procfile.local-stress-test

.PHONY: local-forked
local-forked: ## Start local dev env with Sepolia fork (needs SEPOLIA_RPC_URL in .env.local)
	overmind start -f Procfile.local-forked

.PHONY: base-sepolia
base-sepolia: ## Start dev env against Base Sepolia mock registry; DEPLOY_CONTRACTS=1 deploys fresh contracts
	overmind start -f Procfile.base-sepolia

.PHONY: local-stop
local-stop: ## Stop all local dev processes and Meilisearch container
	-overmind stop 2>/dev/null || true
	docker compose -f docker-compose.yml stop meilisearch
