# Deploy runbook

Tag-driven, GitHub Actions + Docker Hub, on a **shared VPS pair** behind a
shared Traefik. No IPs/hostnames live in this repo: boxes are reached via the
ssh aliases `stage-vps` / `prod-vps` (configured on the runner), and the domain
arrives as the `DOMAIN` GitHub Actions variable.

## Release flow

```
git tag v1.2.0-rc.1 && git push origin v1.2.0-rc.1   # -> STAGE
# stage runner builds backend/frontend/landing images ONCE (byte-identical,
# nothing baked), pushes <tag> + sha-<commit7> to Docker Hub, ssh's to
# stage-vps: pull + migrate + up.
# ...test on stage...
git tag v1.2.0 <tested-commit> && git push origin v1.2.0   # -> PROD
# NO rebuild: the workflow pulls sha-<commit7>, re-tags as v1.2.0, pushes,
# ssh's to prod-vps: pull + migrate + up. Same digest that ran on stage.
```

Migrations run before `up` on every deploy (idempotent):
`docker compose run --rm backend node packages/backend/dist/scripts/migrate.script.js`

Everything tier-specific arrives at **runtime** via `/opt/trello/.env`
(written by the workflow from job env on every deploy — never hand-edited):
the SPA reads `/config.js` (rendered by nginx at container start), the landing
reads `process.env` (force-dynamic layout), the backend reads its env.

## GitHub configuration

Repo → Settings → Environments: create `stage` and `prod` (the jobs use
`environment:`; secrets below can be repo-level).

### Variables

| Name | Value |
| --- | --- |
| `DOMAIN` | the registrable domain (set separately; never committed) |
| `MAIL_HOST` | optional; real SMTP host for prod (empty → Mailtrap sandbox) |
| `MINIO_BACKUP_BUCKETS` | optional; comma-separated buckets to mirror in backups (e.g. `attachments`) |

### Secrets

Plain (shared by both tiers):

- `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` — Docker Hub namespace + write token
  (private repos `kanbandiv-backend`, `kanbandiv-frontend`, `kanbandiv-landing`)
- `POSTGRES_PASSWORD`
- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
- `SUPER_ADMIN_EMAIL`
- `MAIL_USER`, `MAIL_PASS` (optional; empty → app emails not sent)
- `SENTRY_DSN` (backend; optional), `SENTRY_AUTH_TOKEN` (source-map upload at
  build; optional, never shipped to the VPS)
- `GRAFANA_PASSWORD` (fallback admin; UI login itself is SSO-only)
- `PGADMIN_DEFAULT_PASSWORD`
- `PORTAINER_ADMIN_PASSWORD_HASH` (bcrypt, from `htpasswd -bnB admin '<pw>' | cut -d: -f2`)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (deploy notify + Grafana alerts)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (optional; Google sign-in)
- `GDRIVE_CLIENT_ID`, `GDRIVE_CLIENT_SECRET`, `BACKUP_ENCRYPTION_PASSPHRASE`
  (optional; admin backup to Drive)

Per-tier (`_STAGE` / `_PROD` suffix on the secret name; the box gets the plain key):

- `JWT_ACCESS_SECRET_STAGE` / `JWT_ACCESS_SECRET_PROD`
- `JWT_REFRESH_SECRET_STAGE` / `JWT_REFRESH_SECRET_PROD`
- `SSO_SECRET_STAGE` / `SSO_SECRET_PROD`
- `SUPER_ADMIN_PASSWORD_STAGE` / `SUPER_ADMIN_PASSWORD_PROD`

## DNS records

All records on `${DOMAIN}`, A records / Cloudflare **proxied** (orange cloud,
SSL mode Full (strict)) pointing at the tier's box. Prod box:

`@` (apex), `www`, `app`, `api`, `grafana`, `minio`, `redis`, `prometheus`,
`cadvisor`, `pgadmin`, `portainer`

Stage box (same set, stage naming):

`stage`, `stage-app`, `stage-api`, `stage-grafana`, `stage-minio`,
`stage-redis`, `stage-prometheus`, `stage-cadvisor`, `stage-pgadmin`,
`stage-portainer`

Traefik has ONE router for the app (`HostRegexp` over `${DOMAIN}` and any
subdomain); trello's own nginx splits by `server_name`, so adding a subdomain
= DNS record + nginx server block, no Traefik change.

## VPS prerequisites (once per box)

Shared-proxy model (see the Traefik/multi-app guide on the ops side): only
Traefik owns ports 80/443; every app joins the external `edge` network.

1. Docker + compose v2; shared Traefik running with the `edge` network
   (`docker network create edge`).
2. A Cloudflare **Origin certificate** covering `${DOMAIN}` + `*.${DOMAIN}`
   installed in Traefik's cert store (file provider), so it can terminate TLS
   for every host above.
3. `mkdir -p /opt/trello` (the workflow scp's `docker-compose.yml` + the
   grafana/loki/tempo/prometheus/vector config dirs there and writes `.env`).
4. On the **build box**: a per-repo self-hosted GitHub runner registered for
   this repo with `--labels trello` (workflows target
   `runs-on: [self-hosted, trello]`), plus ssh config so `stage-vps` and
   `prod-vps` resolve from the runner user (root on the target boxes), and
   docker available to the runner.

Notes:

- The app's `internal` network uses the fixed subnet `172.28.0.0/16` (nginx is
  pinned at `172.28.0.10` for Grafana's auth-proxy whitelist). If another
  stack on the box already claimed that subnet, change it in
  `packages/infra/docker/docker-compose.yml` (both the ipam block and
  `GF_AUTH_PROXY_WHITELIST`/`ipv4_address`).
- Google OAuth (sign-in + Drive backup): register the callback URLs for BOTH
  tiers in the Google Cloud console —
  `https://app.${DOMAIN}/api/auth/oauth/google/callback`,
  `https://app.${DOMAIN}/api/admin/backup/gdrive/callback` and the
  `stage-app` equivalents. Without them the features stay disabled/fail.
- Admin SSO gate: unchanged mechanism (nginx `auth_request` → backend
  `/api/sso/*`, super-admin only). It needs `SUPER_ADMIN_EMAIL/_PASSWORD`
  (seeded on backend startup) and works out of the box after the first deploy;
  Grafana trusts `X-WEBAUTH-User` only from the pinned nginx IP.
- First deploy on a fresh box: MinIO buckets for Loki/Tempo are created by the
  one-shot `createbuckets` service; the app's `attachments` bucket is created
  by the backend on demand.

## Local development

Local dev runs fully in docker off ONE env file — the repo-root `.env`
(copy `.env.example`, fill in the two JWT secrets):

```
make local    # dev stack: backend :4000, frontend :5173, landing :3001,
              # postgres :5432, redis :6379, minio :9000/:9001 (HMR, no builds)
make migrate  # apply DB migrations inside the backend container
make logs / make ps / make health / make down
```

Host-side `pnpm --filter backend dev` also works and reads the same root
`.env` (see `env.config.ts`). There is no `packages/backend/.env` or
`packages/infra/.env` anymore; deployed tiers use `/opt/trello/.env` written
by the workflows.
