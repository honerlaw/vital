# 010 — async-catalog-cutover · scratchpad

## Log

## Log 2026-06-01 — implementation

- State: `types.ts` (AppState gains `programs` + `programsStatus`, new `ProgramsStatus`);
  `src/state/default-state.ts` (DEFAULT_STATE + DEFAULT_ACTIVE_PROGRAM_ID, moved out of programs.ts;
  both importers `app-context.ts` + `StateProvider.tsx` repointed); `actions.ts` (HYDRATE_PROGRAMS /
  HYDRATE_PROGRAMS_ERROR); `reducer.ts` (HYDRATE handling incl. empty→error + activeProgramId
  normalize; threads `state.programs`); `StateProvider.tsx` (mount fetch → HYDRATE).
- Engine: `getProgram(id)` → `getProgram(programs, id)`; `finishSession` reads `state.programs`.
- Gate: `src/components/CatalogStatus.tsx` (Loading/error placeholder); render-guard in
  `(tabs)/_layout.tsx`; early-return guards in `program/[id].tsx` (+ non-throwing find + not-found)
  and `workout.tsx`. Home `index.tsx` + list tab `programs.tsx` read `state.programs` (list tab
  dropped its own fetch).
- Retired: deleted `src/data/programs.ts`, `scripts/gen-programs-seed.ts`,
  `programs-seed-drift.test.ts`, the `gen:programs-seed` npm script. Migration kept (sole seed).
  `program-guards.test.ts` repointed to `src/test-support/programs.ts` fixture.
- T3: `db.ts` registers best-effort `process.once('SIGTERM'|'SIGINT', () => void created.end())` at
  pool creation (captured `created` const avoids the null-narrowing; no new top-level fn).

### Verification evidence

1. `npm run lint` (--max-warnings 0) 0 errors; `tsc --noEmit` clean; `npm test` 17/17 (4 new reducer
   tests + guards via fixture; drift test removed); `lint:rules-test` 20/20. ✓ (SC#1/#6)
2. SC#2a — reducer tests: HYDRATE non-empty→ready+normalized; absent active id→first program; empty
   →error; HYDRATE_PROGRAMS_ERROR→error. ✓
3. SC#1 — `grep '@/data/programs'` in src → NONE. ✓
4. SC#6 — `expo export -p web` bundles all 11 routes + 3 API routes; pg tokens (pg-pool/pg-protocol/
   SCRAM) present in dist/server only, ZERO in dist/client. ✓
5. SC#5 — db.ts has process.once SIGTERM/SIGINT → created.end(); only one top-level fn (`query`). ✓
6. SC#2b — boot smoke check: `node server.js` (local PG) → /api/health 200, /api/programs 200 with 5
   programs (bbr,gzclp,ppl,wendler,nsuns). The signed-in UI flow (Loading→catalog, error view on
   failure) is the MANUAL acceptance step (run the app signed in) — not automatable headlessly.

### Divergence notes

- Added `src/components/CatalogStatus.tsx` (shared gate placeholder) and `src/test-support/programs.ts`
  (test fixture replacing the retired PROGRAMS) — both within the accepted approach, not divergences.
- Worktree needed its own `npm install` (the shared parent `node_modules` predated 009's `@types/pg`).

## Review triage 2026-06-01 (panel 2/2 accept)

- F2 [Med] FIXED — `reducer.ts` `SET_ACTIVE_PROGRAM` now ignores an id absent from `state.programs`
  (inline no-op, no re-point, no new top-level fn — per Skeptic), upholding the
  activeProgramId-in-catalog invariant so the trusted `getProgram` lookups can't throw. New reducer
  test added (18 total).
- F1 [Med] SUGGEST → followup: no in-app retry on a `/api/programs` fetch failure (error view says
  "REOPEN THE APP"; mount effect won't re-run). The proposal already deferred in-app retry; recorded
  as a followup at promote (carry the user-facing symptom: a transient failure strands until restart).
- F3 [Low] IGNORE — false premise: `(tabs)/_layout` gate holds all tabs (incl. history) until ready;
  history reads `state.history`, never `getProgram`.
- F4–F9 [Low] IGNORE — unreachable getProgram-on-invalid-live-id; SIGTERM comment; empty→error copy;
  account.tsx exempt (no getProgram); minimal fixture; fetch not AbortController-cancelled (the
  `cancelled` flag already guards the stale dispatch).
- K1 [knowledge] DEFER → promote: annotate 015 (its 009 drift-guard instance is retired here).
- K2 [knowledge] DEFER → promote: fold the pool-drain lifecycle learning into 014.
- K3 [knowledge] DEFER → promote: capture the SSR-safe hydrate-at-startup render-gate as a new
  durable pattern (confirmed novel — 007 covers server self-host, not the client render-gate).

## Open questions

## Panel decisions 2026-06-01

- [3/3 accept] scope: single unit (T1+T2 indivisible getProgram-seam cutover; T3 rides the db.ts revisit)
- [accept after 2 revisions] approach: A (hydrate-into-state + SSR render-gate). R1 folded in: pinned gate placement + activeProgramId normalization + non-throwing detail. R2 folded in: empty-catalog → 'error' status. B (module cache) + C (keep PROGRAMS seed source) rejected.
- [3/3 accept after 1 revision] whole-proposal. Revision folded in: SC#2 split into offline reducer tests + honest manual/boot-smoke (session-less SSR curl renders (auth), proves nothing); SC#5 by code-inspection; both DEFAULT_STATE importers named; generic error copy.

### Binding carry-forward constraints (from panels)

- Render-gate: `(tabs)/_layout.tsx` render-guard + early-return (after hooks, before getProgram) in `program/[id].tsx` & `workout.tsx`. NEVER wrap RootNavigator/`(auth)`.
- `HYDRATE_PROGRAMS`: empty catalog → status 'error'; else normalize activeProgramId (find ?? programs[0].id) → 'ready'. Pure/sync, no new top-level fn.
- `getProgram(id)` → `getProgram(programs, id)` (throws on miss; trusted callers only). Thread `state.programs` through reducer START_WORKOUT + finishSession (2 calls). Detail screen = non-throwing find + not-found view.
- Delete PROGRAMS + scripts/gen-programs-seed.ts + gen:programs-seed npm script + programs-seed-drift.test.ts. Repoint program-guards.test.ts to an inline fixture. Move DEFAULT_STATE + DEFAULT_ACTIVE_PROGRAM_ID to the state module; repoint app-context.ts + StateProvider.tsx. Keep table/route/db.ts/mapper/guards.
- T3: best-effort process.once('SIGTERM'|'SIGINT', () => void pool.end()) at pool creation in db.ts. No server.js change, no 2nd top-level fn.
- Error-view copy generic (covers fetch-fail + empty). New reducer tests for HYDRATE normalize/empty.
