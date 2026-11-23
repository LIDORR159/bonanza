# BONANZA storefront image (Next.js, standalone output).
#
# Build from the repository root, which is the build context:
#
#   docker build -f infrastructure/docker/storefront.Dockerfile -t bonanza-storefront:local .
#
# The build needs no backend and no secret. Settings are read when the
# container starts (SITE_URL, MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY, ...),
# with one exception: Next.js copies next.config.ts into the standalone server
# at build time, so the list of hosts that product images may be loaded from
# is fixed in the image. Pass it with
#
#   --build-arg IMAGE_HOSTNAMES=media.example.com
#
# (comma-separated). Setting IMAGE_HOSTNAMES on the running container has no
# effect. Without the argument only "localhost" is allowed.

# Node 24 LTS on Alpine, pinned by digest (linux/amd64 and linux/arm64).
ARG NODE_IMAGE=node:24.22.3-alpine3.24@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5

# ── build ────────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS build

# NODE_ENV is left unset here on purpose: the build needs devDependencies.
ENV CI=true \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1

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
    pnpm install --frozen-lockfile --filter "@bonanza/storefront..."

COPY packages/ packages/
COPY apps/storefront/ apps/storefront/

# Writes apps/storefront/.next/standalone: a server with only the files it
# needs, laid out from the repository root (standalone/apps/storefront).
ARG IMAGE_HOSTNAMES=""
RUN IMAGE_HOSTNAMES="${IMAGE_HOSTNAMES}" pnpm --filter @bonanza/storefront build

# ── runtime ──────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runtime

# HOSTNAME must be set: Docker sets it to the container's name, and the
# standalone server would otherwise listen on that address only.
ENV NODE_ENV=production \
    PORT=8000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Owned by the runtime user: Next.js writes refreshed pages and optimized
# images under apps/storefront/.next while it runs.
COPY --from=build --chown=node:node /repo/apps/storefront/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=build --chown=node:node /repo/apps/storefront/public ./apps/storefront/public

USER node
EXPOSE 8000

# A static file served by the Next.js server itself: it shows that the process
# answers, without depending on the backend being up.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/manifest.webmanifest" || exit 1

CMD ["node", "apps/storefront/server.js"]
