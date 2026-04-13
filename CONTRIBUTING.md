# Contributing to CvBuilder

Thanks for contributing.

This repository is a TypeScript monorepo with separate frontend, backend, and shared packages. Please keep changes focused, documented, and easy to review.

## Before You Start

- Use Node.js 22+ and npm 10+.
- Copy `.env.example` to `.env` for local development.
- Start PostgreSQL and Redis before working on backend features.
- Install dependencies from the repository root with `npm install`.

## Local Setup

```bash
npm install
cp .env.example .env
docker compose up -d postgres redis
cd packages/backend
npx prisma generate
npx prisma db push
npm run db:seed
cd ../..
npm run dev
```

PowerShell users can replace `cp` with `Copy-Item`.

## Development Conventions

- Reuse shared types, enums, validators, and helpers from `@cvbuilder/shared`.
- Keep backend modules in the existing layered structure: Routes -> Controller -> Service -> Repository.
- Keep frontend code aligned with the existing patterns: TanStack Router, TanStack Query hooks, Zustand stores, and i18n strings.
- Prefer small, reviewable pull requests over large mixed changes.
- Update documentation when behavior, setup, or environment requirements change.

## Quality Checks

Run the relevant checks before opening a pull request.

```bash
npm run check
```

If your change touches browser flows, also run:

```bash
npm run test:e2e
```

## Security and Privacy

- Never commit `.env` files or local secret variants.
- Never commit personal tokens, session state, uploaded files, or test artifacts.
- Keep generated folders such as build output, Playwright reports, and runtime uploads out of pull requests.
- If you notice a leaked secret in history or working files, rotate it before opening a PR.

## Pull Requests

- Write a clear title and summary.
- Explain the user-facing or developer-facing impact.
- Mention any required environment, schema, or seed changes.
- Include screenshots or short recordings for notable UI changes when useful.

## Reporting Issues

When opening an issue, include:

- a short reproduction path
- expected behavior
- actual behavior
- environment details if the problem is setup-specific

Thanks for helping improve CvBuilder.