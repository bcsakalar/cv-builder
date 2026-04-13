# ═══════════════════════════════════════════════════════════
# Frontend Dockerfile — Multi-stage build (monorepo root context)
# ═══════════════════════════════════════════════════════════

# ── Base ──────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ── Dependencies ──────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/frontend/package.json ./packages/frontend/package.json
RUN npm ci --workspace=packages/frontend --workspace=packages/shared --include-workspace-root

# ── Development ───────────────────────────────────────────
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend
COPY package.json package-lock.json tsconfig.json ./
WORKDIR /app/packages/frontend
EXPOSE 5173
CMD ["npx", "vite", "--host", "0.0.0.0"]

# ── Build ─────────────────────────────────────────────────
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend
COPY package.json package-lock.json tsconfig.json ./
RUN cd packages/frontend && npx vite build

# ── Production (nginx) ───────────────────────────────────
FROM nginx:alpine AS production
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
