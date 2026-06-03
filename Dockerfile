# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --include=optional \
  && npm install --no-save --no-package-lock \
    lightningcss-linux-x64-gnu@1.32.0 \
    @rolldown/binding-linux-x64-gnu@1.0.3 \
    @unrs/resolver-binding-linux-x64-gnu@1.12.2 \
    @img/sharp-linux-x64@0.34.5 \
    @img/sharp-libvips-linux-x64@1.2.4 \
    @next/swc-linux-x64-gnu@16.2.7

FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app

ARG VERSION=local
ENV VERSION=${VERSION} \
    ALLOW_PREGENERATED_CONTENT=1 \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

RUN mkdir -p /app/.next && chown -R node:node /app

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+process.env.PORT+'/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
