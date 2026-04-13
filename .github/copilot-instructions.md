# CvBuilder — Project Guidelines

AI-powered CV builder. Monorepo with npm workspaces: `packages/shared`, `packages/backend`, `packages/frontend`.

## Build & Test

```bash
npm install                        # Root — installs all workspaces
npm run dev                        # Starts backend (:3001) + frontend (:5173)
npm run test                       # Backend tests (Jest)
npm run test -w packages/frontend  # Frontend tests (Vitest)
npm run build                      # Build shared → backend → frontend
docker compose up -d               # PostgreSQL (pgvector/pg17), Redis 7
```

**Prisma**: `npx prisma generate`, `npx prisma db push`, `npx prisma db seed` — run from `packages/backend`.

## Architecture

### Monorepo Layout

| Package | Stack | Purpose |
|---------|-------|---------|
| `shared` | TypeScript enums + types | Shared types (`CV`, `Template`, `GitHub`), constants (`SkillCategory`, `TemplateCategory`), validators, formatters |
| `backend` | Express 5, Prisma 6, PostgreSQL+pgvector, Redis, BullMQ | REST API, AI (Ollama), PDF (Puppeteer), GitHub analysis, file uploads |
| `frontend` | React 19, Vite 6, TanStack Router+Query, Zustand 5, Tailwind CSS 4, shadcn/ui | SPA with live CV preview, form auto-save, AI assistant panel |

### Backend Layer Pattern

Every module follows: **Routes → Controller → Service → Repository**

```
modules/<name>/
  <name>.routes.ts      # Express router, Zod middleware via validate()
  <name>.controller.ts  # Singleton object, calls service, returns ApiResponse
  <name>.service.ts     # Business logic, cache invalidation
  <name>.repository.ts  # Prisma queries with reusable include patterns
  <name>.schema.ts      # Zod schemas + inferred types
  <name>.test.ts        # Jest tests
```

- **Singleton objects** (not classes) for controllers, services, repositories.
- Route handlers wrapped in `asyncHandler()` — no try/catch in controllers.
- Validation: Zod schemas applied via `validate(schema)` middleware at route level; types inferred with `z.infer<>`.
- Errors: throw `ApiError` (has factory methods: `.notFound()`, `.badRequest()`, `.conflict()`). Caught by global `errorHandler` middleware which also maps Prisma/Zod errors.
- Responses: `ApiResponse.success(data)`, `ApiResponse.created(data)`, `ApiResponse.paginated(...)`.

### Frontend Patterns

- **Routing**: Manual `createRoute()` with TanStack Router (not file-based `createFileRoute`). Root route uses `createRootRouteWithContext<RouterContext>()`.
- **Data fetching**: TanStack Query with query key factories (`cvKeys.all`, `cvKeys.detail(id)`). All mutations invalidate relevant keys + show `toast.success/error()` via Sonner.
- **Forms**: React Hook Form + `zodResolver(schema)` + custom `useAutoSave()` hook for debounced auto-persistence.
- **State**: Zustand stores — flat state + direct setters, one store per domain (`cv.store`, `app.store`, `theme.store`).
- **API layer**: Axios instance in `lib/api.ts` with `unwrap<T>()` helper to extract typed data from API envelope. Service files (`services/*.api.ts`) are singleton objects.
- **Styling**: Tailwind CSS v4 (CSS-first config via `@tailwindcss/vite`). Design tokens as CSS variables in `globals.css`. `cn()` utility for conditional classes. Dark mode via `.dark` class toggle.
- **i18n**: `react-i18next` with `en.json` / `tr.json`. Locale stored in Zustand, sent to backend via `Accept-Language` header.

## Conventions

- **TypeScript strict mode** with `noUncheckedIndexedAccess`. Target ES2022, module Node16.
- **Shared enums** — always use enum values from `@cvbuilder/shared` (e.g., `SkillCategory.TECHNICAL`), never string literals.
- **Express 5 params** — `req.params` is `string | string[] | undefined`. Use `param()` helper from `utils/helpers.ts` or cast `as string` after Zod validation.
- **Prisma JSON fields** — cast values to `Prisma.InputJsonValue`, use `Prisma.DbNull` instead of `null`.
- **Section mutations** — `useSectionMutation(cvId)` bundles 15+ CRUD operations for all CV section types, all invalidate the parent CV query.
- **No auth yet** — backend uses a hardcoded temp user ID pending auth implementation.
- **Node.js ≥ 22** required.

## Gotchas

- `prisma/seed.ts` runs directly via `tsx` — do **not** add it to backend `tsconfig.json` includes (it's outside `rootDir`).
- Rate limiter `sendCommand`: destructure `[cmd, ...rest]` before `redis.call()`.
- `postinstall` script patches `express-rate-limit` tsconfig to avoid build errors.
- Template resolution accepts both UUID and slug.
- Backend streaming SSE endpoint exists but is unused in frontend.
