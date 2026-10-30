# syntax=docker/dockerfile:1
# Production image for a Node/TS service: multi-stage, cache-friendly layer order,
# prod-only node_modules, non-root, healthcheck, base pinned by digest.
# Digest of node:24-slim (Debian 12, Node v24.22.2) as pulled on 2026-10-30.
ARG NODE_IMAGE=node:24-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c

# 1) Production dependencies only. The lockfile is copied alone, so this layer is
#    rebuilt only when the dependency set changes, not on every source edit.
#    The .npmrc for a private registry is a BuildKit secret: mounted for this RUN
#    only, never written into a layer, never visible in `docker history`.
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc,required=true \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --ignore-scripts --no-audit --no-fund

# 2) Full install (with TypeScript) and compile. Nothing from this stage reaches
#    the runtime image except dist/.
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc,required=true \
    --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# 3) Runtime. Files stay owned by root and are only readable by the app user:
#    a compromised process cannot rewrite its own code.
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
# Exec form: node is PID 1 and receives SIGTERM directly (no shell in between).
CMD ["node", "dist/server.js"]
