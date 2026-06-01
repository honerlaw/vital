# 010 — Async program-catalog cutover (Postgres becomes the single runtime source)

## Status

Implemented — review complete; PR pending (`minerva:ship` flips this to Shipped on merge). Approved
and delivered via `minerva:propose-ship-auto` consensus panels (scope 3/3; approach accepted after 2
revisions; whole-proposal 3/3 after 1 revision; completion 3/3; review triage 2/2; promote partition
2/2). Zero user escalations. All success criteria verified (see scratchpad archive); the design
shipped as approved — no divergences. Review fix folded in: `SET_ACTIVE_PROGRAM` now no-ops on an id
absent from the hydrated catalog (F2), upholding the activeProgramId-in-catalog invariant. Durable
patterns captured in [[016-pattern-ssr-safe-startup-hydration-gate]]; [[014-pattern-server-pg-access-expo-routes]]
gained the pool-drain resolution; [[015-pattern-generated-seed-drift-guard]] annotated (009 instance
retired here). Deferred work in `followups.md`.

## Goal

Close the three deferred 009 followups. Retire the in-memory `PROGRAMS` constant as the **runtime**
source: hydrate the catalog from the existing public `GET /api/programs` into app state at startup,
make the synchronous engine (`getProgram`) and all program screens read from `state.programs`,
remove the now-unnecessary dual-source machinery (the `PROGRAMS` constant, the seed generator, and
the byte-equality drift guard), and drain the pg pool on shutdown. Postgres becomes the single
runtime source of truth for the catalog.

## Why

009 made the DB the source for the Programs *list* tab but left the engine reading the in-memory
`PROGRAMS` — the dual-source state the drift guard ([[015-pattern-generated-seed-drift-guard]]) held
together. This closes that gap so the catalog can eventually change without a code release and the
two-sources drift risk is eliminated. Addresses followups **T1** (cutover), **T2** (detail screen —
absorbed: hydrate-all makes a per-id endpoint unnecessary), **T3** (pool drain).

## Approach

Approach A (panel-selected). Rejected alternatives: **B** module-level mutable cache — a
per-process global under `web.output:"server"` is a cross-request leak + a populate-before-read race
(reintroduces the import-time global [[014-pattern-server-pg-access-expo-routes]] deliberately
avoids); **C** keep `PROGRAMS` as a seed-authoring source — leaves a half-alive second source that
goes stale the moment a post-ship migration changes the catalog, contradicting single-source.

### State + hydration

- `AppState` gains `programs: Program[]` and `programsStatus: 'loading' | 'ready' | 'error'`. New
  reducer actions `HYDRATE_PROGRAMS` and `HYDRATE_PROGRAMS_ERROR`.
- `DEFAULT_STATE` and a new `DEFAULT_ACTIVE_PROGRAM_ID = 'bbr'` constant move from
  `src/data/programs.ts` into the state module (`programs: []`, `programsStatus: 'loading'`). **Both**
  current `DEFAULT_STATE` importers — `src/state/app-context.ts` and `src/state/StateProvider.tsx` —
  are repointed.
- `StateProvider` fetches `GET /api/programs` once on mount (reusing `fetchPrograms` from
  `src/data/programs-api.ts`) → dispatches `HYDRATE_PROGRAMS(programs)` on success or
  `HYDRATE_PROGRAMS_ERROR` on failure.
- `HYDRATE_PROGRAMS` handler (pure, synchronous): if `programs.length === 0` → set
  `programsStatus: 'error'` (an empty catalog is "unavailable"; the render-gate shows the error view,
  never crashing the home tab). Otherwise normalize `activeProgramId`
  (`programs.find(p => p.id === state.activeProgramId) ? state.activeProgramId : programs[0].id`) and
  set `programsStatus: 'ready'`.

### Engine

- `getProgram(id)` → `getProgram(programs, id)`, reading the passed array (no `PROGRAMS` import;
  still **throws on miss** — for TRUSTED internal callers). The four trusted callers thread
  `state.programs`: `state/reducer.ts` (`START_WORKOUT`) and `engine/finishSession.ts` (two calls).
  The other engine fns (`getNextWorkout`/`getUpcoming`/`advanceCursor`/`startSession`) already take a
  `Program` param — unchanged.

### SSR-safe render-gate (pinned)

- A render-guard in `src/app/(tabs)/_layout.tsx` returns a Loading view while
  `programsStatus !== 'ready'` and an error view on `'error'` (covers home + programs-list +
  history). An early-return guard (after all hooks, before any `getProgram` call) is added to the two
  standalone routes `src/app/program/[id].tsx` and `src/app/workout.tsx` (reachable by web deep-link /
  SSR without the tabs layout). The gate **never** wraps `RootNavigator` or the `(auth)` group, so
  signed-out login/signup is not blocked and does not SSR a Loading shell.
- SSR safety: `useEffect` does not run during SSR (`web.output: "server"`), so the server render
  always sees `programsStatus: 'loading'` → Loading view → never calls `getProgram` on an empty
  catalog (no 500). Hooks stay unconditional ([[004-pattern-expo56-react-compiler-hook-rules]]);
  composes with the existing fonts+Clerk splash hold
  ([[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]]). The primary window the gate
  protects is the **client transient** (after Clerk loads, before programs hydrate); the existing
  Clerk splash-hold already keeps the protected screens from SSR-rendering when signed out.

### Screens

- Home `(tabs)/index.tsx`, `workout.tsx`, and the Programs list tab `(tabs)/programs.tsx` read
  `state.programs` (the list tab drops its own `useState`/`useEffect` fetch). The detail screen
  `program/[id].tsx` uses a **non-throwing** find on `state.programs` for its untrusted route param
  and renders a **not-found** view if the id is absent. No `GET /api/programs/[id]` endpoint (all 5
  rows already hydrated). The global error-view copy stays **generic** ("Couldn't load programs") so
  it reads for both a fetch failure and an empty catalog.

### Retire the dual source

- Delete the `PROGRAMS` constant, `scripts/gen-programs-seed.ts`, the `gen:programs-seed` npm
  script, and `programs-seed-drift.test.ts`. The committed migration
  `1780279974623_create-programs.sql` is the sole seed; DB = single source of truth. Keep the
  `programs` table, `/api/programs`, `db.ts`, the mapper, and the shared guards. Repoint
  `program-guards.test.ts` (imports `PROGRAMS` for a round-trip) to a small inline `Program[]`
  fixture.

### T3 — pool drain

- Register a best-effort `process.once('SIGTERM'|'SIGINT', () => { void pool.end(); })` inside
  `db.ts` when the pool is created. No `server.js` change, no second top-level function (lint-clean
  under `local/single-declaration`). Best-effort: `server.js`'s `server.close()` already drains
  in-flight HTTP requests (and their queries) before `process.exit(0)`, so this only races on
  draining IDLE clients — strictly better than today, never interrupting an in-flight query. Fold
  the lifecycle learning into [[014-pattern-server-pg-access-expo-routes]] at promote.

## Success criteria

1. App boots with the catalog hydrated from `/api/programs`: home shows the active program, the list
   tab shows all 5, detail renders any program, a workout can be started and finished — all reading
   `state.programs`. No `PROGRAMS` import remains anywhere in `src/` (grep-verified).
2. Render-gate safety:
   - **(a, offline)** reducer unit tests assert the gate's driving state: `HYDRATE_PROGRAMS` with a
     non-empty catalog → `programsStatus:'ready'` with `activeProgramId` normalized to a present
     program; with an empty array → `'error'`; `HYDRATE_PROGRAMS_ERROR` → `'error'`.
   - **(b, manual)** run signed-in — the catalog hydrates (brief Loading → populated home/list),
     detail and workout render, no crash in the pre-hydration window; a forced fetch failure or empty
     response shows the error view, not a crash. The self-hosted server boots and PUBLIC routes
     (`/api/health`, `/api/programs`) return 200 — a boot smoke check only, NOT a claim that the
     auth-gated routes exercise the gate (a session-less SSR request renders `(auth)` per 011).
3. Robustness: `HYDRATE_PROGRAMS` normalizes `activeProgramId` to a present program; an empty
   `/api/programs` response yields the error state (no crash); the detail screen shows a not-found
   view for an unknown id. (Covered by SC#2a reducer tests + manual.)
4. Dual-source retired: `PROGRAMS`, `scripts/gen-programs-seed.ts`, the `gen:programs-seed` script,
   and `programs-seed-drift.test.ts` are deleted; `program-guards.test.ts` is repointed to a fixture;
   `getProgram` no longer imports a constant. `DEFAULT_STATE`/`DEFAULT_ACTIVE_PROGRAM_ID` move to the
   state module with both importers repointed. The `programs` table, `/api/programs`, `db.ts`,
   mapper, and guards remain.
5. T3 pool drain: verified by **code-inspection** — `db.ts` registers a `process.once('SIGTERM'|
   'SIGINT')` handler at pool creation that calls `pool.end()`; no `server.js` change; no new
   top-level function. Best-effort by design (not an observed-drain test).
6. All gates green: `lint --max-warnings 0`, `tsc --noEmit`, `npm test` (drift test removed;
   engine/guard/mapper tests updated; new reducer tests for the HYDRATE normalize/empty paths and
   `getProgram(programs, id)`), `lint:rules-test`; `expo export -p web` bundles all routes; `pg`
   remains absent from the client bundle.

## Open Questions

- In-app retry affordance on the error screen (currently a reload is required) — deferred as a small
  followup; not load-bearing for v1.
- Persistence of `activeProgramId`/`cursor`/`history` across restarts remains out of scope (history
  is still in-memory); the HYDRATE normalization future-proofs `activeProgramId` for when persistence
  lands.

## Decision log

- **Scope** — single unit (panel 3/3). T1+T2 are one indivisible cutover of the `getProgram` seam
  (T2's per-id endpoint is negated, not deferred, by hydrate-all); T3 rides the only `db.ts` revisit.
- **Approach** — A (panel-accepted after 2 revisions). Folded in across revisions: pinned render-gate
  placement (`(tabs)/_layout.tsx` + early-returns in the two standalone routes, never `(auth)`);
  `activeProgramId` normalization at HYDRATE; empty-catalog → `'error'` status; non-throwing detail
  lookup; repoint `program-guards.test.ts` to a fixture. B and C rejected (above).
- **Whole proposal** — accepted (panel 3/3 after 1 revision). Folded in: SC#2 split into offline
  reducer tests + an honestly-scoped manual/boot-smoke check (a session-less SSR curl renders
  `(auth)`, so it can't prove the gate); SC#5 scoped to code-inspection; both `DEFAULT_STATE`
  importers named; generic error-view copy.
