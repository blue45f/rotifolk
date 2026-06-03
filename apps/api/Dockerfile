# syntax=docker/dockerfile:1
#
# Production image for the Rotifolk backend (@rotifolk/api — NestJS 11).
#
# This is the BACKEND counterpart to the existing frontend deploy
# (.github/workflows/deploy-vercel-web.yml, which ships apps/web to Vercel).
# The web SPA is hosted on Vercel; this image hosts the API (REST + Socket.IO)
# and is what render.yaml / .github/workflows/deploy-render-api.yml deploy.
#
# Build from the REPO ROOT (the build context must be the monorepo root so the
# workspace + packages/shared are available):
#   docker build -f apps/api/Dockerfile -t rotifolk-api .
#   docker run -p 3000:3000 -e JWT_SECRET=... -e CORS_ORIGIN=... rotifolk-api
#
# Layout note (rotifolk-specific): apps/api compiles with rootDir = repo root,
# so the emitted entrypoint is dist/apps/api/src/main.js and packages/shared is
# compiled to dist/packages/shared/src/. The `@/` and `@rotifolk/shared` path
# aliases are NOT rewritten by tsc, so the `start` script registers
# tsconfig.runtime.json via tsconfig-paths to resolve them against dist/.

# --------------------------------------------------------------------------
# 1. deps — install the full workspace (native modules need a build toolchain)
# --------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /repo
RUN corepack enable
# better-sqlite3 and argon2 may compile from source on alpine/musl.
RUN apk add --no-cache python3 make g++ libc6-compat
# Workspace manifests + lockfile first (better layer caching).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# --------------------------------------------------------------------------
# 2. build — compile shared + api, generate Prisma client, prune to prod
# --------------------------------------------------------------------------
FROM deps AS build
WORKDIR /repo
# Source for the packages that the api compiles (shared is consumed as TS and
# emitted into the api's own dist by tsc).
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @rotifolk/api run prisma:generate \
 && pnpm --filter @rotifolk/api run build
# `pnpm deploy` produces a self-contained, prod-only bundle at /app
# (node_modules with the compiled Prisma client + native better-sqlite3/argon2).
# --legacy: @rotifolk/shared is a non-injected workspace dep consumed as source
# (no build artifact), which pnpm 10+ requires the legacy deploy path for.
RUN pnpm --filter @rotifolk/api --prod --legacy deploy /app
# The generated Prisma client (node_modules/.prisma/client) is emitted into the
# pnpm store during `prisma:generate` above, and `pnpm deploy` does NOT carry it
# into the pruned /app bundle. @prisma/client/default.js re-exports
# '.prisma/client/default', so copy the generated client next to the deployed
# @prisma/client. The source path is resolved deterministically from /repo.
RUN GEN_SRC=$(node -e "const p=require.resolve('@prisma/client',{paths:['/repo/apps/api']});const m=p.match(/(.*\/node_modules)\/@prisma\/client/);process.stdout.write(m[1]+'/.prisma')") \
 && DEST=$(node -e "const p=require.resolve('@prisma/client',{paths:['/app']});const m=p.match(/(.*\/node_modules)\/@prisma\/client/);process.stdout.write(m[1]+'/.prisma')") \
 && echo "copying generated client: $GEN_SRC -> $DEST" \
 && rm -rf "$DEST" && cp -R "$GEN_SRC" "$DEST"

# --------------------------------------------------------------------------
# 3. runtime — minimal prod image
# --------------------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# libc6-compat: prebuilt native binaries (better-sqlite3/argon2) expect glibc shims.
RUN apk add --no-cache libc6-compat
RUN corepack enable
# Prod bundle: package.json, node_modules, dist/, prisma/, tsconfig.runtime.json.
COPY --from=build /app ./
# Bring the Prisma CLI into the runtime image. The schema's datasource URL is
# supplied by prisma.config.ts (which imports `prisma/config`), so a standalone
# `npx prisma` cannot resolve that config — prisma must be importable for the
# startup `prisma db push` (schema sync) against the persistent disk.
# Install into an isolated dir (the deployed /app/package.json has a workspace:*
# dep that npm refuses), then expose it via NODE_PATH + PATH so both the `prisma`
# binary and `require('prisma/config')` resolve from /app at runtime.
RUN mkdir -p /opt/prisma && cd /opt/prisma \
 && npm init -y >/dev/null \
 && npm install --no-audit --no-fund prisma@7 @prisma/engines
ENV NODE_PATH=/opt/prisma/node_modules
ENV PATH=/opt/prisma/node_modules/.bin:$PATH
# SQLite data dir (mount a persistent volume here in production; see render.yaml).
RUN mkdir -p /app/data
# Entrypoint: prisma db push (schema sync) then `node` start. Runs node/prisma
# DIRECTLY (not via pnpm) — the pruned bundle keeps a workspace:* dep that pnpm
# would choke on. Copied from the build context (apps/api/docker-entrypoint.sh).
COPY apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/prod.db
EXPOSE 3000
# main.ts binds 0.0.0.0 and reads PORT / CORS_ORIGIN / JWT_SECRET / CONTACT_PEPPER.
# (Render also runs `prisma db push` via render.yaml preDeployCommand; running it
#  here too keeps the plain-Docker path self-sufficient and is idempotent.)
CMD ["/app/docker-entrypoint.sh"]
