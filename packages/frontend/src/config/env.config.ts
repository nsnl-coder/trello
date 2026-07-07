// Runtime deployment config. /config.js (loaded by index.html before the app
// bundle) sets window.__ENV__; the nginx image re-renders that file from the
// container env at startup (packages/infra/docker/nginx/40-render-config.sh),
// so ONE built image is byte-identical across tiers — nothing is baked at
// build. Local dev serves the committed defaults in public/config.js.
type RuntimeEnv = {
  APP_ENV?: string; // local | stage | prod
  DOMAIN?: string; // registrable domain, e.g. example.com (empty locally)
  HOST_PREFIX?: string; // subdomain prefix: "stage-" on stage, "" on prod
};

declare global {
  interface Window {
    __ENV__?: RuntimeEnv;
  }
}

const runtime: RuntimeEnv =
  (typeof window !== "undefined" && window.__ENV__) || {};

const appEnv: "local" | "stage" | "prod" =
  runtime.APP_ENV === "prod"
    ? "prod"
    : runtime.APP_ENV === "stage"
      ? "stage"
      : "local"; // missing config.js / anything else -> local
const isLocal = appEnv === "local";

// Same-origin everywhere: nginx (deployed) / the Vite dev proxy (local)
// forward /trpc + /api to the backend, so no per-tier API origin is needed.
const apiUrl = "/trpc";

// Observability/ops consoles on sibling subdomains (admin SSO-gated). null
// locally (no such hosts); derived from the runtime DOMAIN otherwise. Used by
// the admin Monitor tab.
const consoleHost = (svc: string) =>
  `https://${runtime.HOST_PREFIX ?? ""}${svc}.${runtime.DOMAIN}`;
const opsConsoles =
  isLocal || !runtime.DOMAIN
    ? null
    : {
        grafana: consoleHost("grafana"),
        minio: consoleHost("minio"),
        redis: consoleHost("redis"),
        prometheus: consoleHost("prometheus"),
        cadvisor: consoleHost("cadvisor"),
        pgadmin: consoleHost("pgadmin"),
        portainer: consoleHost("portainer"),
      };

export const config = {
  apiUrl,
  // External admin consoles (Grafana, RedisInsight); null on local.
  opsConsoles,
  // SSE/OpenAPI base. tRPC lives at `<base>/trpc`; the REST/SSE routes live at
  // `<base>/api`. Derive by swapping the trailing `/trpc` so no new env var is
  // needed (local: backend-origin/api; deployed same-origin: /api).
  apiBaseUrl: apiUrl.replace(/\/trpc$/, "") + "/api",
  appEnv,
  isDev: import.meta.env.DEV,
  // Public OTLP path (nginx -> Tempo). Empty locally -> no trace export.
  otelEndpoint: isLocal ? "" : "/otlp",
  // Public Sentry DSN (same on every tier). Sentry stays disabled locally via
  // the appEnv check in sentry.ts.
  sentryDsn:
    "https://e05fe1792d0a2a4073c48522cfdb47f7@o4511595557486592.ingest.us.sentry.io/4511595562336256",
} as const;

export type AppConfig = typeof config;
