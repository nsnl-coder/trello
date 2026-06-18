# build context = repo root
FROM node:22-alpine AS base
RUN corepack enable
# trusted committed lockfile; relax pnpm gates for the throwaway build container
ENV PNPM_CONFIG_MINIMUM_RELEASE_AGE=0 \
    PNPM_CONFIG_DANGEROUSLY_ALLOW_ALL_BUILDS=true
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/backend/package.json packages/backend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter backend...
COPY . .
RUN pnpm --filter shared build
RUN pnpm --filter backend build

FROM base AS runtime
ENV NODE_ENV=production
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/backend/package.json packages/backend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --prod --filter backend...
COPY --from=build /app/packages/backend/dist packages/backend/dist
COPY --from=build /app/packages/shared/dist packages/shared/dist
EXPOSE 4000
CMD ["node", "packages/backend/dist/index.js"]
