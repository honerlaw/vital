# Pattern: server-side Postgres access for Expo Router API routes

- Type: pattern
- Date: 2026-05-31
- Work unit: 009-program-catalog-db
- Related: [[009-decision-postgres-node-pg-migrate]] (the DB + migrate pipeline this reads from;
  the regular-dep rule it extends), [[007-pattern-expo-router-server-self-host]] (the long-running
  `server.js` process this must survive within), [[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]]
  (the public-vs-`requireAuth` per-route choice), [[012-pattern-src-unit-tests-node-tsx]] /
  [[008-pattern-dynamic-app-config-strict-lint]] (the `unknown`+`typeof` narrowing reused here).

VITAL's **first runtime DB read path** (009 stood up the migrate pipeline only; this added the
data-access layer). How an Expo Router `+api.ts` route reads Postgres under the strict guardrails
([[001-constraint-strict-eslint-guardrails]]) and the self-hosted server.

## The data-access module (`src/server/db.ts`)

- **Lazy module-singleton Pool, never constructed at import.** A module-scope `let pool: Pool | null
  = null` is created on the **first** `query()` call, not at import time. This is load-bearing: it
  keeps importing a route (or a server module) side-effect-free, so an offline unit test can import
  the route without opening a connection or reading env. `new Pool()` itself doesn't connect eagerly,
  but the lazy guard also defers the `DATABASE_URL` read.
- **`DATABASE_URL` read verbatim from `process.env`**, exactly as the migrate pipeline does — via the
  `unknown`+`typeof` narrowing (`const url: unknown = process.env.DATABASE_URL; if (typeof url !==
  'string' || url.length === 0) throw`). **Do NOT inject `ssl`/`sslmode`**: SSL is whatever the
  connection string carries (`sslmode=require` against DO Managed Postgres in prod, absent for the
  local Docker Compose DB at `localhost:5432`). Hardcoding `sslmode=require` would break local dev.
- **Attach `pool.on('error', …)`.** node-postgres emits `'error'` on an **idle** client when the
  backend drops the connection (DO idle-recycle, failover, network blip). That event fires outside any
  request `await`, so the route's `try/catch` cannot catch it — unhandled, it throws and **crashes the
  long-running `server.js` process**. A listener that logs lets pg discard and recycle the client.
- **Drain on shutdown (the construct→survive→drain story, completed in 010).** At pool creation,
  register `process.once('SIGTERM', () => void created.end())` and the same for `'SIGINT'` (capture a
  local `const created` so the closure references a non-null `Pool` with no narrowing cast). This stays
  **inside** `query()`'s pool-creation block — no second top-level function, so one-function-per-file
  holds (the original reason this was deferred from 009). It is **best-effort**: `server.js`'s
  `server.close()` already finishes in-flight requests (and their queries) before `process.exit`, so
  the drain only releases **idle** pooled clients and never interrupts a live query; if `process.exit`
  wins the race the idle sockets drop exactly as before (no regression). Because the listener registers
  only when the pool is first created, an offline route-import test (which never queries) leaks no
  process listener.
- **`query()` returns `Record<string, unknown>[]`** (typed `UnknownRow`), forcing callers to narrow
  every column. Supplying `query<UnknownRow>()` to pg keeps row values `unknown` rather than the
  default `any`, so no `any` leaks into the route. `@types/pg` is required (pg ships no types) and is a
  **regular dependency** for the same reason `pg` is — see the delta below.

## Cast-free row → domain mapping

The route never trusts the row shape. A separate mapper (`programs-mapper.ts`, no `pg` import, so it's
unit-testable offline) reads each column from the `unknown`-valued row and validates it with
hand-written type-guard predicates (e.g. `isProgramTag` checking union membership via `.some`, and a
nested `isWorkoutDayArray` for the `jsonb` `days` column) — **no `any`, no `as`, no non-null `!`, no
`ts-*` comment**, the same discipline `clerk-verifier.ts` uses. snake_case columns (`per_week`) are
bridged to the camelCase model (`perWeek`) here. A row that fails validation **throws**, and the route
catches it → **500 with an opaque body** (after `console.error`-ing the cause, the only diagnostic on
the self-hosted box) rather than serving a partial/malformed list.

## Public vs protected route

A non-sensitive, author-curated catalog (`GET /api/programs`) is **public** — it simply does not call
`requireAuth` (per-route opt-in, [[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]]),
mirroring `health+api.ts` and contrasting the protected `me+api.ts`. The client fetch therefore sends
no Bearer; it reuses only the shared `EXPO_PUBLIC_API_URL` base-origin resolution
(`src/auth/api-base.ts`, factored out of `apiFetch`).

## Bundle isolation (verified)

Because `pg` is imported only by `db.ts`, which is reached only through a server-only `+api.ts` route
(the mapper imports `db.ts`'s `UnknownRow` **type-only**, so it loads no `pg`), `pg` stays off the
client bundle. Confirmed after `expo export -p web`: pg tokens (`pg-pool`, `pg-protocol`, `SCRAM`)
appear in `dist/server/_expo/functions/api/programs+api.js` and **zero** times in `dist/client`.

## Delta to [[009-decision-postgres-node-pg-migrate]]

009 documents `pg`/`node-pg-migrate` as **regular** `dependencies` (not devDeps) because the prod build
runs under `NODE_ENV=production`, which prunes devDeps, and the migrate runner must survive. The same
rule extends to **`@types/pg`**: the prod build typechecks the route's `pg` access, so the types must
survive pruning too. Added to `dependencies`; the `"//db"` `package.json` key was updated to say so.
