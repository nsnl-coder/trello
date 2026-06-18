#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/trelloclone3"
BRANCH="master"

cd "$APP_DIR"
git pull origin "$BRANCH"

docker compose -f packages/infra/docker-compose.yml up -d --build
docker image prune -f
