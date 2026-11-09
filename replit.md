# Dayflow

A visual day-planning mobile app prototype for adults with ADHD, designed around gentle routines, visible time, and low-pressure next steps.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile` — Expo app and UI prototype
- `artifacts/mobile/context/DayflowContext.tsx` — locally saved prototype tasks, routines, and appearance preference
- `artifacts/mobile/constants/colors.ts` — Dayflow light, focused, and dark palette tokens
- `lib/api-spec/openapi.yaml` — shared API contract; Dayflow currently does not use it

## Architecture decisions

- The current delivery is a UI-only mobile prototype; do not add backend services or third-party integrations unless requested.
- Prototype tasks, routines, and appearance are stored on-device so the interface remains usable without an account or network.
- Dayflow uses its own visual identity and product copy; it may use common planner patterns but must not reproduce another app's branding or exact screens.

## Product

Dayflow presents a visual daily plan, a focus countdown, step-by-step routines, a task inbox, and an appearance/pricing preview. It is designed to be supportive rather than punitive: no streaks or overdue warnings.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The focus timer, planner content, and pricing display are a frontend prototype; they do not connect to calendars, AI services, widgets, subscriptions, or notifications.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
