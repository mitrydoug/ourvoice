COMPOSE_MOCKED := docker compose -f docker-compose.yml -f docker-compose.mocked.yml
COMPOSE_FORKED := docker compose -f docker-compose.yml -f docker-compose.forked.yml

.PHONY: compose-mocked
compose-mocked:
	$(COMPOSE_MOCKED) up

.PHONY: compose-forked
compose-forked:
	set -a && [ -f .env.local ] && . ./.env.local; \
	$(COMPOSE_FORKED) up
