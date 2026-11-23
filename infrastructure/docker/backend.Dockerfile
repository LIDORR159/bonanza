# BONANZA backend image (Medusa).
#
# Build from the repository root, which is the build context:
#
#   docker build -f infrastructure/docker/backend.Dockerfile -t bonanza-backend:local .
#
# One image, three uses. The command and MEDUSA_WORKER_MODE decide which:
#
#   medusa start        MEDUSA_WORKER_MODE=server   Store API, Admin API, Admin UI at /app
#   medusa start        MEDUSA_WORKER_MODE=worker   scheduled jobs and subscribers, no admin
#   medusa db:migrate   the one-shot migration job; it exits when it is done
#
# No secret is read at build time, and every setting is read at run time, with
# one exception: Medusa compiles the storefront address into the admin
# dashboard (the "copy payment link" action on an order). Pass it with
# --build-arg STOREFRONT_URL=https://... once the address is known. Without it
# that one link points at http://localhost:8000; nothing else is affected.

# Node 24 LTS on Alpine, pinned by digest (linux/amd64 and linux/arm64).
ARG NODE_IMAGE=node:24.22.3-alpine3.24@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5

# ── build: install, compile, and collect the production dependencies ─────────
FROM ${NODE_IMAGE} AS build

# NODE_ENV is left unset here on purpose: the build needs devDependencies.
ENV CI=true \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    MEDUSA_DISABLE_TELEMETRY=true

WORKDIR /repo

# pnpm comes from corepack, at the exact version named in package.json
# ("packageManager"). The package store lives in a build cache mount, so it is
# reused between builds and never becomes an image layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN corepack enable \
 && corepack install \
 && pnpm config set --global store-dir /pnpm/store

# Manifests first: the install layer is rebuilt only when dependencies change.
COPY apps/backend/package.json apps/backend/
COPY apps/storefront/package.json apps/storefront/
COPY packages/config/package.json packages/config/
COPY packages/types/package.json packages/types/
COPY e2e/package.json e2e/
RUN --mount=type=cache,id=bonanza-pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --filter "@bonanza/backend..."

COPY packages/ packages/
COPY apps/backend/ apps/backend/

# Writes apps/backend/.medusa/server: the compiled backend and, under
# public/admin, the admin dashboard.
ARG STOREFRONT_URL=""
RUN STOREFRONT_URL="${STOREFRONT_URL}" pnpm --filter @bonanza/backend build

# A self-contained node_modules with production dependencies only.
RUN --mount=type=cache,id=bonanza-pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm --filter @bonanza/backend deploy --prod /deploy

# ── runtime ──────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runtime

ENV NODE_ENV=production \
    PORT=9000 \
    MEDUSA_DISABLE_TELEMETRY=true \
    PATH=/app/node_modules/.bin:$PATH

WORKDIR /app

# The code is owned by root and read-only for the user the process runs as.
COPY --from=build /deploy/node_modules ./node_modules
COPY --from=build /repo/apps/backend/.medusa/server ./

# Pictures for the starter-content seed (`medusa exec ./src/scripts/seed-content.js`).
# `medusa build` compiles the seed scripts but copies no pictures, and the
# compiled script looks for them next to itself, in src/scripts/seed-assets.
# Without this folder the seed still runs and creates the home page's hero and
# About sections with no picture. The demo catalog's product images are left
# out on purpose (.dockerignore): demo data is not loaded from this image.
COPY apps/backend/src/scripts/seed-assets/site ./src/scripts/seed-assets/site

# The only directory the process writes to: uploads, and only when no S3
# bucket is configured (local testing). Production stores media in R2.
RUN mkdir -p /app/static && chown node:node /app/static

USER node
EXPOSE 9000

# /health is answered by `medusa start` in server and in worker mode.
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health" || exit 1

CMD ["medusa", "start"]
