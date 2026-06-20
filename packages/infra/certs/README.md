# Origin TLS certificates (Cloudflare Origin CA)

The `proxy` service terminates TLS using a Cloudflare **Origin CA** certificate.
These files are secret and git-ignored. Create them on each VPS, not in the repo.

## Files expected here

- `origin.pem` - origin certificate (PEM)
- `origin.key` - private key (PEM)
- `cloudflare-origin-pull-ca.pem` - optional, only if you enable Authenticated
  Origin Pulls in `proxy/snippets/ssl.conf`

## Generate (Cloudflare dashboard)

1. Cloudflare > your zone (`trello-clone.shop`) > SSL/TLS > Origin Server >
   Create Certificate.
2. Hostnames: `*.trello-clone.shop` and `trello-clone.shop` (the wildcard covers
   `dev-app`, `dev-api`, and `dev`).
3. Save the certificate to `origin.pem` and the private key to `origin.key` in
   this directory on the VPS.
4. Set SSL/TLS encryption mode to **Full (strict)** in Cloudflare.

## DNS

Create proxied (orange-cloud) A/AAAA records pointing at the VPS IP:

- `dev-app.trello-clone.shop`
- `dev-api.trello-clone.shop`
- `dev.trello-clone.shop`
