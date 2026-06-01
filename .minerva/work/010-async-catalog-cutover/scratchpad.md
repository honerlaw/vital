# 010 — async-catalog-cutover · scratchpad

## Log

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
