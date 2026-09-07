# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
RUN npm install -g corepack@latest && corepack enable
WORKDIR /app

FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.10.12 prune @snapshot/api @snapshot/web --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

FROM installer AS builder
COPY --from=pruner /app/out/full/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo run build --filter=@snapshot/api --filter=@snapshot/web
RUN pnpm --filter=@snapshot/api --prod deploy --legacy /prod/api

FROM node:24-alpine AS snapshot
RUN apk add --no-cache ffmpeg
WORKDIR /app

ARG APP_VERSION=""

ENV NODE_ENV=production \
	NEXT_TELEMETRY_DISABLED=1 \
	APP_VERSION=${APP_VERSION} \
	API_PORT=3001 \
	WEB_PORT=3000 \
	HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /prod/api ./api/
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./web/
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./web/apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./web/apps/web/public
COPY --chown=node:node docker/supervisor.mjs ./
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 3000 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
	CMD wget -qO- http://127.0.0.1:3001/api/healthz >/dev/null 2>&1 \
	&& wget -qO- http://127.0.0.1:3000/sign-in >/dev/null 2>&1 || exit 1
CMD ["node", "supervisor.mjs"]
