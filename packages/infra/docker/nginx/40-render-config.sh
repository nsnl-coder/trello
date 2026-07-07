#!/bin/sh
# Render the SPA's runtime config from the container env at startup, so ONE
# built image is byte-identical across tiers (the tier arrives at RUNTIME).
# nginx:alpine runs every /docker-entrypoint.d/*.sh before starting nginx.
# Overwrites the local-dev defaults that Vite copied from public/config.js.
set -eu
: "${APP_ENV:=prod}"
: "${DOMAIN:=}"
: "${HOST_PREFIX:=}"
cat > /usr/share/nginx/html/config.js <<EOF
window.__ENV__ = { APP_ENV: "${APP_ENV}", DOMAIN: "${DOMAIN}", HOST_PREFIX: "${HOST_PREFIX}" };
EOF
