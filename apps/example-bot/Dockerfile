# syntax=docker/dockerfile:1
FROM node:26-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
# better-sqlite3 usually pulls a prebuilt binary, but these cover the fallback
# native-compile path so the build never breaks on an unsupported platform.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/core/package.json packages/core/package.json
COPY packages/storage/package.json packages/storage/package.json
COPY packages/discord-bot/package.json packages/discord-bot/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY apps/example-bot/package.json apps/example-bot/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter "@antilink-guard/core" --filter "@antilink-guard/storage" \
      --filter "@antilink-guard/discord-bot" --filter "@antilink-guard/example-bot" run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/example-bot
RUN useradd --create-home --shell /usr/sbin/nologin appuser \
  && mkdir -p data \
  && chown -R appuser:appuser /app/apps/example-bot/data
USER appuser
VOLUME ["/app/apps/example-bot/data"]
CMD ["node", "dist/index.js"]
