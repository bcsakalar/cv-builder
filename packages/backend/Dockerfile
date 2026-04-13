# ═══════════════════════════════════════════════════════════
# Backend Dockerfile — Multi-stage build (monorepo root context)
# ═══════════════════════════════════════════════════════════

# ── Base ──────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# ── Dependencies ──────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/backend/package.json ./packages/backend/package.json
RUN npm ci --workspace=packages/backend --workspace=packages/shared --include-workspace-root

# ── Development ───────────────────────────────────────────
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend
COPY package.json package-lock.json tsconfig.json ./
RUN cd packages/backend && npx prisma generate
EXPOSE 3001
CMD ["npx", "tsx", "watch", "packages/backend/src/server.ts"]

# ── Build ─────────────────────────────────────────────────
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend
COPY package.json package-lock.json tsconfig.json ./
RUN cd packages/backend && npx prisma generate && npx tsc

# ── Production ────────────────────────────────────────────
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

COPY --from=build --chown=appuser:nodejs /app/packages/backend/dist ./dist
COPY --from=build --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=appuser:nodejs /app/packages/backend/prisma ./prisma
COPY --from=build --chown=appuser:nodejs /app/packages/backend/package.json ./

RUN mkdir -p uploads && chown appuser:nodejs uploads

USER appuser
EXPOSE 3001
CMD ["node", "dist/server.js"]
