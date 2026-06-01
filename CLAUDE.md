# CLAUDE.md

Guidance for AI agents (and humans) working in this repository. Read this first.

## What this is

**CvBuilder** — an AI-powered, fully self-hostable platform with two products that share one codebase:

1. **CV Builder** — create/edit CVs, live preview across 5 templates, GitHub repo analysis that turns repos into CV projects, AI-assisted content, and pixel-perfect PDF export.
2. **Recruiter Workbench** — an ATS: post a job, bulk-upload candidate resume PDFs, and get AI parsing + multi-factor scoring, link inspection, ranking, comparison, and CSV export.

All AI runs **locally via Ollama** (no external API). Everything else is local too (Postgres, Redis).

## Monorepo layout

```
packages/
  shared/    @cvbuilder/shared — TS types, constants, validators shared by FE+BE
  backend/   Express + Prisma + BullMQ workers + Ollama client
  frontend/  React 19 + Vite 6 + TanStack Router/Query + Zustand + Tailwind v4
```

Backend modules live in `packages/backend/src/modules/<name>/` and follow a strict layered pattern:
`*.routes.ts` → `*.controller.ts` → `*.service.ts` → `*.repository.ts`, with `*.schema.ts` (Zod) and `*.test.ts` (Jest) alongside. Cross-cutting infra is in `src/lib/` (prisma, redis, queue, ollama, logger) and `src/config/` (env, ollama, cors). Background jobs are in `src/workers/`.

Frontend: routes in `src/routes/` (TanStack, **manually** registered in `src/routeTree.gen.ts` — there is no router codegen plugin), feature components in `src/components/<feature>/`, data hooks in `src/hooks/`, API clients in `src/services/`, Zustand stores in `src/stores/`, i18n in `src/i18n/` (`en.json` / `tr.json`).

## Commands

```bash
npm run dev              # FE + BE together (local, no docker)
npm run build            # shared → backend → frontend (run build:shared first if shared types changed)
npm run typecheck        # all workspaces (tsc --noEmit)
npm run lint             # all workspaces (eslint)
npm run test:backend     # Jest
npm run test:frontend    # Vitest
npm run test:e2e         # Playwright (needs the stack + Ollama running)
npm run docker:up        # docker compose up -d   (postgres, redis, app-backend, app-frontend)
npm run db:seed          # templates + demo user (demo@cvbuilder.local / DemoPassword123!)
```

## ⚠️ Critical gotchas (these will bite you)

1. **The backend does NOT hot-reload in Docker on Windows.** Docker Desktop does not propagate file-change inotify events into the container, so `tsx watch` never sees host edits. **After ANY backend code/config change you MUST `docker compose restart app-backend`.** (The frontend / Vite hot-reloads fine.)
2. **Frontend is exposed on host port `5174`** (→ container `5173`). Backend on `3001`. Ollama runs on the **host** (`host.docker.internal:11434`).
3. **PDF export = the print route, not a server renderer.** The PDF is produced by Puppeteer (in the backend container) navigating to the chromeless frontend route `/print/:cvId?token=…` and printing the SAME `<CVPreview>` the user sees — guaranteeing 1:1 parity. Do NOT add a second/server-side CV renderer; it will drift. Requires: backend reachable→frontend (`PRINT_BASE_URL`, default `http://app-frontend:5173`), the internal origin in `CORS_ORIGIN`, and Vite `server.allowedHosts` including `app-frontend`. Auth is a short-lived signed token (`pdf.token.ts`) → public `GET /api/print/render-data`.
4. **Local repo analysis is slow.** qwen2.5-coder:14b takes ~60–260s per repo (warm vs cold). Worker concurrency is 1; Ollama serves one generation at a time → analyses are sequential (~3 min each). Per-request budget: `OLLAMA_REPO_ANALYSIS_TIMEOUT_MS` (default 420000), `retries:0` for the heavy call. A too-short timeout silently falls back to deterministic (still localized) content.
5. **Strict localization.** GitHub analysis must be single-language. `ai.lang.ts` (`isLikelyLocale`) drops off-language AI prose so the localized fallback wins; it is applied ONLY to prose, never to skill/tech lists (language-neutral proper nouns). When adding AI output, follow this pattern.

## Conventions

- **Types are shared.** Add/extend domain types in `packages/shared/src/types/` and import via `@cvbuilder/shared`. Run `npm run build:shared` after changing them so BE/FE pick them up.
- **i18n is mandatory** for user-facing strings. Every label goes through `t("…")` with a key in BOTH `en.json` and `tr.json`. CV-content rendering uses locale-explicit helpers (`getSectionLabelForLocale`, `translateForLocale`) so it is correct regardless of the active UI language.
- **Validation at the edge** with Zod (`*.schema.ts`); controllers parse, services trust typed input.
- **Tests guard behavior.** Preserve `data-testid`s — unit (Vitest/Jest) and Playwright e2e depend on them. Add tests for new logic.
- **Styling:** Tailwind v4 utility classes; theme-driven values via inline styles; prefer extracting reusable presentational components over copy-paste.
- **Errors:** throw `ApiError.*` in services; the global error handler formats them. Never leak internals.
- **Money path for AI:** go through `ai.service.ts` → `lib/ollama.ts`; pass `timeoutMs`/`retries` for heavy calls.

## Where things live (quick map)

| Area | Backend | Frontend |
|---|---|---|
| CV CRUD + sections | `modules/cv/` | `components/cv-editor/`, `routes/cv/` |
| CV preview / templates | — | `components/cv-preview/` (5 templates + `project-preview.ts` view-model) |
| PDF export | `modules/pdf/` (`pdf.service`, `pdf.token`, `pdf.print.routes`) | `routes/print/$cvId.tsx`, `components/pdf/` |
| GitHub analysis | `modules/github/`, `workers/github-analysis.worker.ts` | `components/github/` |
| AI (Ollama) | `modules/ai/` (`ai.service`, `ai.prompts`, `ai.lang`, `ai.ats`) | `components/cv-editor/AIAssistPanel.tsx` |
| Recruiter / ATS | `modules/recruiter/`, `workers/recruiter-batch.worker.ts` | `components/recruiter/` |
| Auth | `modules/auth/` | `stores/auth.store.ts`, `routes/auth/` |

## Verifying a change end-to-end

1. `npm run build:shared` (if types changed) → `npm run typecheck` → `npm run test:backend` + `npm run test:frontend`.
2. For backend changes in Docker: **`docker compose restart app-backend`**, then `curl localhost:3001/api/health`.
3. Exercise the real flow (login as demo user, or via API) and check `docker compose logs app-backend`.
