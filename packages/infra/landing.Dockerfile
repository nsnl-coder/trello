# build context = repo root
FROM node:22-alpine AS build
RUN corepack enable
ENV PNPM_CONFIG_MINIMUM_RELEASE_AGE=0 \
    PNPM_CONFIG_DANGEROUSLY_ALLOW_ALL_BUILDS=true \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/landing/package.json packages/landing/
RUN pnpm install --frozen-lockfile --filter landing...
COPY . .
# NEXT_PUBLIC_* are inlined at build time, so they must be present here.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN pnpm --filter landing build

# Next.js standalone server: minimal runtime, no pnpm/store needed.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build /app/packages/landing/.next/standalone ./
COPY --from=build /app/packages/landing/.next/static ./packages/landing/.next/static
COPY --from=build /app/packages/landing/public ./packages/landing/public
EXPOSE 3000
CMD ["node", "packages/landing/server.js"]
