# 012 — per-user-state-persistence

## Status

Shipped (2026-06-05)

## Goal

Persist each user's app state — active program, rotation cursor, and workout history —
server-side in Postgres, bound to the Clerk userId. State survives restarts and reinstalls and
follows the user across devices/web. Closes the persistence followup tracked since 002/006; the
History tab stops being session-ephemeral.

## Why

Every launch currently starts from `DEFAULT_STATE`: finished workouts vanish, the active program
resets. The Clerk identity (006) and the server data layer (009/014) exist precisely so user data
can follow the user. AsyncStorage-only persistence was considered and rejected at scope time:
device-local history dies with reinstall, doesn't follow the identity, and web localStorage forks
behavior (rationale recorded in `011-catalog-retry/followups.md`; AsyncStorage remains viable
later as an offline cache layer).

Binding scope constraints (panel-pinned): (1) persist **current semantics only** — one global
cursor; (2) server-side Postgres is the primary store; (3) the user-state fetch gets its own
status in `AppState` but feeds the **same** render-gate; (4) v1 write-through is best-effort
fire-and-forget — local reducer state stays authoritative for the session.

## Approach

### Schema (one plain-SQL migration with a Down section; soft references, no FKs)

- `user_state(clerk_user_id text PRIMARY KEY, active_program_id text NOT NULL, cursor integer
  NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`
- `workout_sessions(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, clerk_user_id text NOT
  NULL, program_id text NOT NULL, program_name text NOT NULL, day_name text NOT NULL,
  finished_at timestamptz NOT NULL)` + `INDEX (clerk_user_id, finished_at DESC)`
- No FK from `active_program_id`/`program_id` to `programs` (a FK would fight the seed migration
  and cascade-delete user rows; stale ids are normalized client-side at hydration). The layout
  anticipates the per-program-cursor followup as an **additive** later migration.

### Server (all routes `requireAuth` per [[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]]; pg access per [[014-pattern-server-pg-access-expo-routes]])

- `src/server/db.ts`: `query(text)` widens to `query(text, params?: unknown[])` — same single
  exported function, lazy pool, `UnknownRow` rows; `params` forwarded to `pool.query`.
  **Parameterized everywhere — no string interpolation of user values.**
- `GET /api/me/state` → `{ activeProgramId, cursor, history }` in one round-trip: the
  `user_state` row (`activeProgramId: null`, `cursor: 0` when no row exists — no 404
  special-case) + sessions ordered `finished_at DESC` mapped to `SessionLog[]`
  (`dateISO` = ISO string). Row→domain mapping in a new `src/server/user-state-mapper.ts` with
  hand-written type guards (no casts), unit-testable offline, mirroring `programs-mapper`.
  **pg returns `timestamptz` as a JS `Date`** — the `finished_at` guard accepts a `Date`
  instance (`instanceof` narrowing) and maps via `.toISOString()`; a string-only guard would
  reject every row.
- `PUT /api/me/state` body `{ activeProgramId, cursor }` → parameterized single-row UPSERT
  (`INSERT … ON CONFLICT (clerk_user_id) DO UPDATE`). Body validated by guards; invalid → 400.
- `POST /api/me/sessions` body `{ programId, programName, dayName, dateISO, cursor }` → **one
  atomic data-modifying-CTE statement**: `WITH ins AS (INSERT INTO workout_sessions …) INSERT
  INTO user_state … ON CONFLICT (clerk_user_id) DO UPDATE SET cursor = EXCLUDED.cursor,
  updated_at = now()`. A single statement runs in a single implicit transaction — history and
  cursor cannot split. Different tables, so no same-table CTE-visibility hazard; a SQL comment
  documents that a data-modifying CTE executes even when unreferenced (Postgres guarantee).
  Body validated; invalid → 400. A 401 path mirrors `me+api.ts` for all three routes.
- `src/auth/api-fetch.ts`: `apiFetch(path, getToken)` gains an optional `init`
  (`{ method?, body? }`) setting `Content-Type: application/json` when a body is present — same
  single exported function; existing GET callers unchanged.

### Engine purification

`finishSession(state)` → `finishSession(state, nowISO: string)`: the internal
`new Date().toISOString()` is replaced by the injected `nowISO`, making the function fully
deterministic. Sole production caller is the reducer; no tests call it directly (verified).

### Client state

- `AppState` gains `userStateStatus: 'loading' | 'ready' | 'error'` (initial `'loading'`).
  `DEFAULT_ACTIVE_PROGRAM_ID` stays the pre-hydration seed.
- New actions: `HYDRATE_USER_STATE { activeProgramId: string | null, cursor, history }`;
  `HYDRATE_USER_STATE_ERROR`; `RESET_USER_STATE`. `FINISH_WORKOUT` widens to
  `{ nowISO: string }` — **stamped at the dispatch site** (`workout.tsx`'s `onFinish` event
  handler, the single dispatch site — verified), so there is one `Action` type with a required
  field and no wrapped-vs-raw typing seam.
- `HYDRATE_USER_STATE` reducer case: stores `history`/`cursor`; `userStateStatus: 'ready'`;
  `activeProgramId` = the server id when it's present in a ready catalog; the raw server id when
  the catalog isn't ready yet (the later `HYDRATE_PROGRAMS` normalizes — symmetric, so parallel
  landing order doesn't matter); `programs[0].id` for a null/absent id with a ready catalog; and
  `DEFAULT_ACTIVE_PROGRAM_ID` for a null id with the catalog not yet ready (there is no
  `programs[0]` yet). `string | null` lives only in the action, never in `AppState`.
  **Normalization preserves `cursor`** (current semantics: only `SET_ACTIVE_PROGRAM` zeroes it).
- `RESET_USER_STATE` (on sign-out): resets **exactly five fields** — `activeProgramId` →
  `DEFAULT_ACTIVE_PROGRAM_ID`, `cursor` → 0, `history` → `[]`, `live` → `null` (sign-out
  mid-workout must not leak a live session to the next user), `userStateStatus` → `'loading'`
  (next sign-in re-hydrates). Catalog fields untouched (the gate must not re-error). The case is
  **idempotent**: it returns the **same state reference** when there is nothing to reset (React
  bailout — same idiom as `RETRY_HYDRATE`'s no-op path).
- `RETRY_HYDRATE` generalizes: resets **only** statuses currently `'error'` (per-status guards —
  a healthy catalog is never refetched; same for user state). One tap retries whichever fetch
  failed; each flipped status re-fires its own status-keyed effect.

### Client effects & gate (`StateProvider`; shapes per [[016-pattern-ssr-safe-startup-hydration-gate]] and 011's status-keyed precedent)

- Existing catalog effect unchanged. New auth-keyed effect: guard reads `auth.isLoaded &&
  auth.isSignedIn && state.userStateStatus === 'loading'` (all deps consumed —
  exhaustive-deps-exact); fetches `GET /api/me/state` via the authed `apiFetch` (Bearer);
  dispatches `HYDRATE_USER_STATE` / `HYDRATE_USER_STATE_ERROR` from `.then`/`.catch` (never
  synchronously — [[004-pattern-expo56-react-compiler-hook-rules]]); `cancelled`-flag cleanup.
  A 401 (e.g. token expiry) is an ordinary `'error'` — retry is user-initiated only, so no auto
  retry-loop is possible.
- Sign-out reset effect: transition-keyed on `[isLoaded, isSignedIn]`; when
  `isLoaded && !isSignedIn`, the `RESET_USER_STATE` dispatch is **deferred into an asynchronous
  callback** (mirroring the repo's `.then`/`.catch` idiom — never synchronous in the effect
  body, satisfying `set-state-in-effect`). Transition-keyed deps + the idempotent reducer case
  are the runtime-loop guards. `StateProvider` sits above `Stack.Protected`, so it survives the
  signed-in subtree unmount and reliably observes the flip.
- Render-gate: the three gate sites switch to combined readiness — error view if **either**
  status is `'error'`, loading until **both** `'ready'`. The derived `CatalogStatus` prop stays
  `'loading' | 'error'` (existing prop type unchanged — typechecks as-is). SSR-safe for 016's
  reason (neither effect runs during SSR). Signed-out flows never blocked.
- New client fetch module validates responses with shared guards; malformed → throw → error
  status.

### Write-through (fire-and-forget; failures `console.warn` and drop; local state authoritative)

The context value exposes a **wrapped dispatch** built inside the existing `useMemo` (stable
identity). It forwards every action to the raw dispatch, then best-effort persists:

- `SET_ACTIVE_PROGRAM` — only when the id is present in the catalog (mirror the reducer's guard
  so a no-op dispatch doesn't PUT) → `PUT { activeProgramId: action.id, cursor: 0 }`.
- `FINISH_WORKOUT` — conditional on the **same `state.live !== null` guard the reducer applies**
  (a double-tap must not POST a spurious session while the reducer no-ops). Computes
  `finishSession(state, action.nowISO)` — provably identical to the reducer's computation (pure
  fn, same args) — and POSTs `{ …log, cursor: nextCursor }`. On an ad-hoc finish (finished
  program ≠ active program) `nextCursor` is the **unchanged** cursor — the server's single
  global cursor mirrors current client semantics exactly. Invariant note: the
  wrapper-equals-reducer equality holds because `FINISH_WORKOUT` is a single user tap with no
  concurrent dispatch; revisit if dispatch batching is ever introduced.
- Persist-after-normalize: when forwarding `HYDRATE_USER_STATE` with a ready catalog lacking the
  server's `activeProgramId`, or `HYDRATE_PROGRAMS` with `userStateStatus` `'ready'` and the
  current `activeProgramId` absent from the new catalog, the wrapper also PUTs the normalized
  `{ activeProgramId: programs[0].id, cursor: <the post-normalize state's preserved cursor —
  never a hardcoded 0> }` once, so the server converges instead of returning a stale id forever.
- No persistence of: `live` (ephemeral), `programs`/`programsStatus` (catalog),
  `TOGGLE_SET`/`CANCEL_WORKOUT`/`START_WORKOUT` (no persisted-field mutations).

### File inventory (one-function-per-file honest count)

New (~11–13): the migration; `src/app/api/me/state+api.ts`; `src/app/api/me/sessions+api.ts`;
`src/server/user-state-mapper.ts` (+ test); client fetch split per function as the rule requires
(`fetchUserState` / `putUserState` / `postSession`); guards in their own files
(`isSessionLog.ts`, `isSessionLogArray.ts`, plus a GET-payload guard) + `guards/index.ts`
re-exports. Touched: `db.ts`, `api-fetch.ts`, `finishSession.ts`, `reducer.ts`, `actions.ts`,
`types.ts`, `default-state.ts`, `StateProvider.tsx`, `workout.tsx`, `(tabs)/_layout.tsx`,
`program/[id].tsx`, `reducer.test.ts`.

### Out of scope (recorded followups)

Per-program cursor memory (product change; additive migration anticipated). Offline-durable
write queue (v1 drops a finished session if offline at FINISH + app killed before reconnect).
AsyncStorage offline cache. History pagination (v1 loads full history).

## Success criteria

1. Offline tests green (`npm test`): new reducer cases (HYDRATE_USER_STATE normalization in both
   landing orders incl. cursor preservation and the null-id fallbacks; RESET_USER_STATE resets
   exactly the five fields, leaves catalog fields, and is a same-reference no-op when nothing to
   reset; RETRY_HYDRATE per-status resets; FINISH_WORKOUT with injected nowISO), user-state
   mapper tests (row→domain incl. `Date` `finished_at`; invalid rows throw), guard tests, and a
   finishSession determinism test (same args twice → deep-equal results).
2. The migration applies cleanly to the local Postgres (`npm run migrate`) and is plain SQL with
   a Down section ([[009-decision-postgres-node-pg-migrate]]).
3. Endpoint contract, manual/reviewer-attested ([[012-pattern-src-unit-tests-node-tsx]]'s manual
   lane): GET returns the defaults shape for a new user; finishing a workout POSTs atomically
   (session row + cursor visible in the DB); switching programs PUTs; signing out and back in
   restores state; restarting the app restores history (the original bug).
4. Server-side enforcement: all three routes return 401 without a valid session (curl
   spot-check, mirrors `me+api.ts`).
5. Gates green: `npm run lint` (`--max-warnings 0`), `npm run typecheck`, `npm test`,
   `npm run export:web`; `pg` stays off the client bundle (unchanged 009 invariant).
6. No change to signed-out flows or SSR behavior (gate placement untouched; effects
   client-only).

## As-built notes

Shipped as designed with three small, documented deltas (all panel-reviewed at completion):

1. **Multi-method route = re-exports.** `GET`+`PUT` in one `state+api.ts` trips
   `local/single-declaration`; the implementations live one-function-per-file in
   `src/server/routes/me-state-{get,put}.ts` and the route file is pure re-exports (exempt).
   Promoted to [[003-pattern-conforming-code-under-strict-guardrails]].
2. **POST body carries `activeProgramId`.** The cursor upsert's INSERT arm must satisfy
   `user_state.active_program_id NOT NULL` for a first-time user; the conflict arm still
   updates only the cursor.
3. **Shared `bootStatus()` helper** (`src/state/boot-status.ts`) derives the combined gate
   status instead of duplicating the two-status conditional at the three gate sites.

SC#2 was verified on a throwaway postgres:16-alpine (up→down→up + both CTE arms smoke-tested)
because host port 5432 was held by an unrelated container; SC#3's five-scenario authed
attestation is reviewer-attested via the PR body (followups T1). Durable learnings promoted to
[[017-pattern-per-user-state-persistence]] and folded into 014/016/003/001.

## Open questions

None blocking. Deferred deliberately: the followups listed in Out of scope.
