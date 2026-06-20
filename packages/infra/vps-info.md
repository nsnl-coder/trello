# VPS Info

## trello-dev-vps

- ssh alias: trello-dev-vps (`ssh trello-dev-vps`)
- host: 103.82.192.197
- deploy user: deploy (passwordless sudo)
- local key: ~/.ssh/id_ed25519_trello
- domains (Cloudflare-proxied): dev-app.trello-clone.shop (frontend), dev-api.trello-clone.shop (backend), dev.trello-clone.shop (landing)
- TLS: Cloudflare Origin CA cert on the VPS at packages/infra/certs/{origin.pem,origin.key}; CF SSL mode Full (strict)
- public ports: 22, 80, 443 only (proxy publishes 80/443; grafana bound to 127.0.0.1:3000, SSH-tunnel only)
- deployment environment: dev
- password login disabled: true
- root login disabled: true
- github deploy key on vps: ~/.ssh/id_ed25519_github (repo nsnl-coder/trello, read-only)
