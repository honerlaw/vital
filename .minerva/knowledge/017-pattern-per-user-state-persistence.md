# Pattern: per-user state persistence (Postgres + Clerk userId)

- Type: pattern
- Date: 2026-06-05
- Work unit: 012-per-user-state-persistence
- Related: [[014-pattern-server-pg-access-expo-routes]] (the pg access layer this extends with
  parameterized queries and the atomic-CTE technique), [[016-pattern-ssr-safe-startup-hydration-gate]]
  (the render-gate this extends to combined readiness),
  [[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]] (the per-route auth all three
  endpoints ride), [[009-decision-postgres-node-pg-migrate]] (the migration discipline),
  [[004-pattern-expo56-react-compiler-hook-rules]] (the hook rules the client effects follow),
  [[003-pattern-conforming-code-under-strict-guardrails]] (the multi-method route re-export shape),
  [[019-pattern-null-active-program-first-run]] (the first-run null-id semantics, 014),
  [[020-pattern-per-program-cursors]] (the per-program cursor map that replaced the scalar, 015)

How VITAL persists `activeProgramId` / `cursors` / `history` per Clerk user so state survives
restarts/reinstalls and follows the identity across devices — while the pure `useReducer` store
stays authoritative for the live session (v1 write-through is best-effort fire-and-forget).

## Schema

`user_state` (single row per user: `clerk_user_id` PK, `active_program_id`, `cursors jsonb`,
`updated_at`) + `workout_sessions` (append-only: identity PK, user id, program/day denorm,
`finished_at timestamptz`; index `(clerk_user_id, finished_at DESC)`). **Soft references only** —
no FK to `programs` (a FK would couple user rows to the seeded catalog and cascade-delete history
on a program removal); stale ids are normalized client-side at hydration. The original "one
global cursor" shipped here was replaced in 015 by per-program cursors — realized as an
**additive-then-cutover** migration (backfill, then the scalar column dropped); see
[[020-pattern-per-program-cursors]] for the map semantics and the tolerant-reader transition.

## Server contract (all `requireAuth`)

- `GET /api/me/state` → `{ activeProgramId, cursors, history }` in one bootstrap round-trip,
  **defaults-shape for a missing row** (`activeProgramId: null`, `cursors: {}`) — no 404
  special-case, so the client needs no absent-vs-error branch. (Plus a time-boxed legacy
  `cursor` field for pre-015 builds — see [[020-pattern-per-program-cursors]].)
- `PUT /api/me/state` → parameterized single-row UPSERT of the settings (map full-replace;
  a time-boxed legacy scalar arm merges instead — [[020-pattern-per-program-cursors]]).
- `POST /api/me/sessions` → session append + cursor-map merge **atomically** (see the
  data-modifying-CTE technique in [[014-pattern-server-pg-access-expo-routes]]). The body carries
  `activeProgramId` solely to seed the settings row's NOT NULL column for a first-time user; the
  conflict arm merges only the finished program's key (finishing never changes the active
  program).
- Mappers narrow `UnknownRow` cast-free; **pg returns `timestamptz` as a JS `Date`** — the
  `finished_at` guard is `instanceof Date` + `.toISOString()`; a string-typed guard rejects
  every row.

## Client shape

- `AppState.userStateStatus` (`loading`/`ready`/`error`) joins `programsStatus`; a shared
  `bootStatus()` helper derives the combined gate status (error wins; ready only when both).
  `RETRY_HYDRATE` resets **only** statuses currently `'error'`; each status-keyed effect
  re-fires itself. The user-state effect is **auth-keyed** (`isLoaded && isSignedIn && status
  === 'loading'`) so a cold launch never burns a retry on a guaranteed 401.
- Hydration normalization is **symmetric**: whichever of catalog / user-state lands second
  re-points a stale **non-null** `activeProgramId` to the first program; normalization
  **preserves the cursor map** (since 015 nothing zeroes it — switching only changes the id).
  > ⚠ Superseded by [[019-pattern-null-active-program-first-run]] (014): a **null** server id no
  > longer falls back to the first program / default seed — null means "never chose" and survives
  > hydration so the Today chooser shows. Only stale non-null ids converge.
- `RESET_USER_STATE` on sign-out clears exactly the five per-user fields (incl. `live` — a
  mid-workout sign-out must not leak a session to the next account), leaves catalog fields, and
  returns the **same state reference** when there is nothing to reset (React bailout, so the
  transition-keyed effect's deferred dispatch is loop-free).

## Write-through (the load-bearing part)

The context exposes a **wrapped dispatch** (built inside the provider's `useMemo`): forward to
the reducer, then best-effort persist; failures warn and drop — the server converges on the next
successful write, and a GET on next launch restores the last-persisted state.

**Determinism-for-mirroring:** `finishSession(state, nowISO)` takes the clock as a parameter,
with `nowISO` stamped once at the single dispatch site (the event handler). The wrapper and the
reducer therefore call a pure function with identical args and provably compute the identical
`{ log, nextCursor }` — the POST body cannot diverge from what the reducer stores. This is why
the engine was purified rather than letting the wrapper "recompute roughly". (Holds because
FINISH_WORKOUT is a single user tap; revisit if dispatch batching ever appears.) The wrapper
mirrors the reducer's guards (`live !== null`, id-in-catalog) so a no-op dispatch never writes,
and persist-after-normalize PUTs the re-pointed id with the **preserved** cursor map (which map
each site forwards — payload vs pre-reduce — is load-bearing: [[020-pattern-per-program-cursors]]).

## Known v1 bounds (deliberate)

Offline finish + app-kill before reconnect drops that session (offline-durable queue is a
followup); stale reads possible between devices (last write wins on the single settings row);
history loads in full (pagination is a followup).
