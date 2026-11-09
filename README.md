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

## Widgets & Live Activity (development build)

Widgets, Live Activity, reminders and calendar need native code, so they **don't run in Expo Go**. Use a development build:

```bash
cd artifacts/mobile
# One-time: set your Apple Team ID in app.json → expo.ios.appleTeamId
npx expo prebuild --clean          # generates ios/ and android/ (git-ignored)
npx expo run:ios --device          # or: npx expo run:android
# or in the cloud: npx eas build --profile development
```

| Piece | Where |
| --- | --- |
| iOS widget + Live Activity UI (SwiftUI) | `artifacts/mobile/targets/widget/` (via `@bacons/apple-targets`) |
| Live Activity start/update/end (Swift module) | `artifacts/mobile/modules/dayflow-live-activity/` |
| Android widget (JSX) | `artifacts/mobile/widgets/android.tsx` (via `react-native-android-widget`) |
| Data sync from the app | `artifacts/mobile/services/widgets.ts` |

The app and the iOS widget share data through the App Group `group.com.nexa.dayflow`. If you change the bundle ID, update it in `app.json`, `services/widgets.ts` and `targets/widget/Shared.swift`.
