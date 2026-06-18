# build context = repo root
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/backend/package.json packages/backend/
RUN pnpm install --frozen-lockfile --filter backend...
COPY . .
RUN pnpm --filter backend build

FROM base AS runtime
ENV NODE_ENV=production
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/backend/package.json packages/backend/
RUN pnpm install --frozen-lockfile --prod --filter backend...
COPY --from=build /app/packages/backend/dist packages/backend/dist
EXPOSE 4000
CMD ["node", "packages/backend/dist/index.js"]
