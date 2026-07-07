# Local dev runs fully in docker. `--env-file .env` makes compose
# interpolation (${POSTGRES_PASSWORD}, ${MINIO_*}) read the repo-root .env —
# the SINGLE local env file (see .env.example).
COMPOSE_LOCAL := docker compose -f packages/infra/docker/docker-compose.local.yml --env-file .env

.PHONY: local down logs ps health migrate

# Local: (re)start the full dev stack (backend + frontend + landing + db +
# redis + minio). Dev servers with the repo bind-mounted — no image builds.
local:
	$(COMPOSE_LOCAL) up -d

# Stage/prod deploys are NOT run from here — they are tag-driven via GitHub
# Actions (see .github/workflows/ + packages/infra/DEPLOY.md):
#   git tag v1.2.0-rc.1 && git push origin v1.2.0-rc.1   # build + deploy STAGE
#   ...test on stage...
#   git tag v1.2.0 <tested-commit> && git push origin v1.2.0  # promote to PROD

down:
	$(COMPOSE_LOCAL) down

logs:
	$(COMPOSE_LOCAL) logs -f --tail=100

ps:
	$(COMPOSE_LOCAL) ps

# Apply pending DB migrations (idempotent) inside the backend container.
migrate:
	$(COMPOSE_LOCAL) exec backend pnpm --filter backend migrate

health:
	@curl -fsS http://localhost:4000/health && echo "  <- ok" || (echo "HEALTH FAILED" && exit 1)
