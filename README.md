# Dayflow — ADHD Life Planner

A visual day-planning mobile app prototype for adults with ADHD: gentle routines, visible time, and low-pressure next steps.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo / React Native (`artifacts/mobile`)
- API: Express 5 (`artifacts/api-server`)
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod, API codegen via Orval (`lib/api-spec`)
- UI sandbox: Vite + React + Tailwind (`artifacts/mockup-sandbox`)

## Project structure

```
artifacts/
  mobile/           Expo app (main product)
  api-server/       Express API
  mockup-sandbox/   Vite component/mockup playground
lib/
  api-spec/         OpenAPI spec + codegen
  api-client-react/ Generated React Query hooks
  api-zod/          Generated Zod schemas
  db/               Drizzle schema + config
scripts/            Workspace utility scripts
```

## Prerequisites

- Node.js 24+
- pnpm 10+ (`npm i -g pnpm` or `corepack enable`) — npm/yarn are blocked
- PostgreSQL (only needed for the API server)
- Expo Go app on your phone, or an iOS simulator / Android emulator (optional)

## Setup

```bash
pnpm install
```

## Run

### Mobile app (main)

The app is UI-only and stores data on-device — no backend needed.

```bash
pnpm --filter @workspace/mobile run dev
```

Then press `i` (iOS simulator), `a` (Android emulator), `w` (web), or scan the QR code with Expo Go.

### API server (optional)

```bash
export DATABASE_URL="postgres://user:pass@localhost:5432/dayflow"
pnpm --filter @workspace/db run push          # create/update tables
PORT=5000 pnpm --filter @workspace/api-server run dev
```

### Mockup sandbox (optional)

```bash
pnpm --filter @workspace/mockup-sandbox run dev   # http://localhost:5173
```

`PORT` and `BASE_PATH` env vars are optional (defaults `5173` and `/`).

## Other commands

| Command | Description |
| --- | --- |
| `pnpm run typecheck` | Typecheck all packages |
| `pnpm run build` | Typecheck + build all packages |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks/Zod schemas from OpenAPI |
| `pnpm --filter @workspace/mobile run build` | Static Expo build (requires `EXPO_PUBLIC_DOMAIN`) |

## Environment variables

| Variable | Used by | Required |
| --- | --- | --- |
| `DATABASE_URL` | api-server, db | Yes (API only) |
| `PORT` | api-server | Yes (API only) |
| `EXPO_PUBLIC_DOMAIN` | mobile static build | Build only |
