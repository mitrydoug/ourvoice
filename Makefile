COMPOSE_MOCKED := docker compose -f docker-compose.yml -f docker-compose.mocked.yml
COMPOSE_FORKED := docker compose -f docker-compose.yml -f docker-compose.forked.yml

# ── Docker Compose (full containerised stack) ────────────────────────────────

.PHONY: compose-mocked
compose-mocked:
	$(COMPOSE_MOCKED) up

.PHONY: compose-forked
compose-forked:
	set -a && [ -f .env.local ] && . ./.env.local; \
	$(COMPOSE_FORKED) up

# ── Local development (native processes + containerised Meilisearch) ─────────

.PHONY: local-setup
local-setup: ## One-time setup: install deps for all modules
	mise install
	cd frontend  && npm install
	cd blockchain && npm install
	cd backend && python -m venv .venv && . .venv/bin/activate && pip install uv && uv pip sync requirements.txt

.PHONY: local-mocked
local-mocked: ## Start local dev env with mocked registry
	docker compose -f docker-compose.yml up -d --force-recreate meilisearch
	overmind start -f Procfile.local-mocked

.PHONY: local-stress-test
local-stress-test: ## Start local dev env with mocked registry and stress-test fixture data
	docker compose -f docker-compose.yml up -d --force-recreate meilisearch
	overmind start -f Procfile.local-stress-test

.PHONY: local-forked
local-forked: ## Start local dev env with Sepolia fork (needs SEPOLIA_RPC_URL in .env.local)
	set -a && [ -f .env.local ] && . ./.env.local; \
	docker compose -f docker-compose.yml up -d --force-recreate meilisearch && \
	overmind start -f Procfile.local-forked

.PHONY: local-stop
local-stop: ## Stop all local dev processes and Meilisearch container
	-overmind stop 2>/dev/null || true
	docker compose -f docker-compose.yml stop meilisearch
