// Local-dev defaults. In a deployed container the nginx entrypoint overwrites
// this file from the container env at startup (see
// packages/infra/docker/nginx/40-render-config.sh), so the tier is a RUNTIME
// input and the built image stays byte-identical across stage/prod.
window.__ENV__ = { APP_ENV: "local", DOMAIN: "", HOST_PREFIX: "" };
