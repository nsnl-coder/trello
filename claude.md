## project config

This is mono repo, pnpm workspace.

## Folder Structure

packages/frontend: frontend app
packages/backend: backend app
packages/infra: docker, nginx, redis, minio, postgres config, deploy, deploy info
packages/shared: for shared configs, enums, constants, validation schemas, types between frontend and backend
e2e/frontend: store all e2e tests for packages/frontend
e2e/landing: store all e2e tests from packages/landing

## Required Infra

- Nginx: for proxy (behind the shared Traefik on stage/prod)
- Minio: for files storage
- Postgres: for database -> in docker container
- Required for stage & prod vps but not for local env: docker, redis, loki, vector, grafana, sentry, open telemetery & grafana tempo

# env rules

Keys are PLAIN — tiers differ by VALUE, not key name. Images are byte-identical
across tiers: nothing tier-specific is baked at build; everything arrives at
RUNTIME. Deploys are tag-driven via GitHub Actions (see
`packages/infra/DEPLOY.md`): `vX.Y.Z-rc.N` -> stage, `vX.Y.Z` -> prod
(promotes the stage-tested images, no rebuild).

## Backend

- Local (docker `make local` or host `pnpm --filter backend dev`): the
  repo-root `.env` is the ONLY local env file (shape in `.env.example`).
- Stage/prod: the deploy workflow writes `/opt/trello/.env` on the box from
  GitHub secrets/vars on every deploy — never hand-edited, same plain keys.
- Constants identical across tiers live in code (`src/config/env.config.ts`).
  Anything derivable from the tier knob or `DOMAIN`+`HOST_PREFIX` is derived in
  code/compose, not stored per key.
- Tier knob is `VPS_ENV` (local|stage|prod), guarded in `env.config.ts`; the
  workflows pass it as `APP_ENV` through compose.

## Frontend / landing

No `.env` at all; no `VITE_*`/`NEXT_PUBLIC_*` tier values. The SPA reads
`window.__ENV__` from `/config.js`, rendered by nginx from the container env at
start (local defaults live in `packages/frontend/public/config.js`). The
landing reads `APP_URL`/`SITE_URL` from `process.env` at runtime (root layout
is force-dynamic). Constants identical across tiers (Sentry DSN, OTLP path)
live in code.

## Always-on conventions

Always follow token discipline (short replies, scoped file reads, no rambling). The full ruleset is imported below and applies to every session:
@.claude/skills/token/SKILL.md

# Testing rules

- e2e tests run against a live deployed site (stage + prod domains) driving a pre-seeded test user via the real UI. No separate test DB/MinIO; OTP flows read codes from the Mailtrap sandbox (used in stage AND prod). Destructive flows use throwaway sign-up emails / a dedicated reset account so they never disturb real users.
- in local environment, only run added test suites, do not run all test suites.
