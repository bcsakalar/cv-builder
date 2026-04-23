# CvBuilder

[![CI](https://github.com/bcsakalar/cv-builder/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/bcsakalar/cv-builder/actions/workflows/ci.yml)
[![Publish Images](https://github.com/bcsakalar/cv-builder/actions/workflows/publish-images.yml/badge.svg?branch=main)](https://github.com/bcsakalar/cv-builder/actions/workflows/publish-images.yml)

CvBuilder is a full-stack monorepo for creating, editing, and exporting professional CVs with AI assistance, GitHub repository analysis, live preview, and PDF generation.

It is designed as a local-first developer project: the React frontend, Express API, PostgreSQL, Redis, optional Ollama models, and Playwright E2E tooling can all be run from a single workspace.

## Highlights

- Create and manage multiple CVs with structured sections, live preview, and auto-save.
- Generate summaries, improve content, and run CV-focused AI workflows through Ollama.
- Import GitHub project data and repository insights into CV content.
- Export polished PDF versions with multiple template styles.
- Work in a strict TypeScript monorepo with shared types, validation, and testing.

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, Vite 6, TanStack Router, TanStack Query, Zustand, Tailwind CSS v4 |
| Backend | Node.js 22, Express 5, Prisma 6 |
| Data | PostgreSQL 17, pgvector, Redis 7, BullMQ |
| AI and Export | Ollama, Puppeteer, Sharp |
| Tooling | Playwright, Jest, Vitest, Docker Compose |

## Repository Structure

```text
packages/
    backend/    Express API, Prisma schema, workers, feature modules
    frontend/   React application, routes, hooks, stores, UI components
    shared/     Shared enums, types, validators, and utilities
e2e/          Playwright end-to-end tests
scripts/      Local development and debug helpers
```

## Getting Started

### Prerequisites

- Node.js 22+
- npm 10+
- Docker Desktop or a local PostgreSQL and Redis setup
- Optional: Ollama for AI features
- Optional: a GitHub Personal Access Token for GitHub import and analysis features

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Your Local Environment File

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Review `.env.example` and replace placeholder values before using anything beyond local development.

### 3. Start Local Infrastructure

```bash
docker compose up -d postgres redis
```

### 4. Prepare the Database

```bash
cd packages/backend
npx prisma generate
npx prisma db push
npm run db:seed
cd ../..
```

### 5. Start the App

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001/api`

## Local Debug Workflow

For Windows-heavy local development, the workspace includes a debug helper that can auto-select open ports and start local infrastructure when needed.

```bash
npm run dev:debug
```

Useful overrides:

- `LOCAL_BACKEND_PORT`
- `LOCAL_FRONTEND_PORT`
- `LOCAL_DEBUG_INSPECT_PORT`
- `LOCAL_DEBUG_AUTO_INFRA=0`

The repository also includes shared VS Code workspace settings and launch profiles for backend and frontend debugging.

## Environment Notes

The project reads configuration from `.env`. A safe public workflow is already set up in this repository:

- `.env` and other local environment variants are ignored.
- `.env.example` is the only environment file intended for version control.
- Playwright auth state, uploads, reports, and build outputs are ignored.

Important variables:

- `DATABASE_URL`
- `REDIS_URL`
- `OLLAMA_URL`
- `OLLAMA_MODEL`
- `OLLAMA_CODE_MODEL`
- `OLLAMA_EMBEDDING_MODEL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `CORS_ORIGIN`
- `UPLOAD_DIR`
- `VITE_API_URL`

Recommended local Ollama defaults in this repository:

- `OLLAMA_MODEL=qwen3.5:9b`
- `OLLAMA_CODE_MODEL=qwen3.5:9b`
- `OLLAMA_EMBEDDING_MODEL=nomic-embed-text:v1.5`

## Common Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start backend and frontend together |
| `npm run dev:backend` | Start only the backend |
| `npm run dev:frontend` | Start only the frontend |
| `npm run dev:debug` | Start the local debug workflow |
| `npm run build` | Build shared, backend, and frontend packages |
| `npm run check` | Run doctor, typecheck, lint, backend tests, and frontend tests |
| `npm run test:e2e` | Run the Playwright E2E suite |
| `npm run docker:build` | Build and start the Docker stack |

## CI/CD

This repository ships with a GitHub-native automation setup:

- `CI`: runs install, Prisma client generation, typecheck, lint, backend tests, frontend tests, workspace builds, and Docker build validation on pushes and pull requests.
- `Publish Images`: publishes production-ready backend and frontend images to GitHub Container Registry on pushes to the default branch and on version tags.
- `Dependabot`: keeps GitHub Actions, npm dependencies, and Docker base images current.

Published image names:

- `ghcr.io/bcsakalar/cv-builder-backend`
- `ghcr.io/bcsakalar/cv-builder-frontend`

## Testing

Run the full local quality gate:

```bash
npm run check
```

Run Playwright browser tests:

```bash
npm run test:e2e:install
npm run test:e2e
```

The Playwright workflow creates local auth state and report artifacts under ignored folders, so test output stays out of version control.

## Architecture Notes

- Backend modules follow a Routes -> Controller -> Service -> Repository pattern.
- Frontend routing uses TanStack Router with manual route definitions.
- Shared enums and types live in `@cvbuilder/shared` and should be reused instead of duplicated.
- Validation is handled with Zod on both API and form boundaries.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, workflow, and pull request expectations.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
