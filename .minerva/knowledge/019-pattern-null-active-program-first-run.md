# Pattern: null activeProgramId = "never chose" (first-run chooser semantics)

- Type: pattern
- Date: 2026-06-06
- Work unit: 014-first-run-program-selection
- Related: [[017-pattern-per-user-state-persistence]] (the persistence layer whose null-fallback
  claim this supersedes), [[016-pattern-ssr-safe-startup-hydration-gate]] (the re-point rule this
  narrows to non-null ids), [[005-decision-vital-state-and-nav-boundaries]] (what belongs in
  `AppState`), [[004-pattern-expo56-react-compiler-hook-rules]] (why the Today fork sits after the
  hooks).,
  [[020-pattern-per-program-cursors]] (the per-program cursor map + composite switch that upgraded these semantics, 015)

How VITAL stopped silently enrolling new users in the first program: `AppState.activeProgramId`
is `string | null`, where **null is a semantic signal — "the user has never chosen a program"** —
that must survive hydration so the Today screen can render the first-run chooser. The server
already spoke null (`GET /api/me/state` returns `activeProgramId: null` for a no-row user); 014
removed the client-side laundering of that null into a default.

## The membership-check trap (the load-bearing hazard)

`programs.some((p) => p.id === state.activeProgramId)` is **false for null** — structurally, a
membership check can't distinguish "not in the catalog" (stale → converge) from "never chose"
(null → ask). Any normalize/re-point/persist logic keyed on catalog membership therefore
**silently re-points null to `programs[0]` unless null is special-cased BEFORE the check**. This
nearly defeated the feature at two independent sites:

- `reducer.ts` `HYDRATE_PROGRAMS`: `state.activeProgramId === null || programs.some(...)` — the
  null arm must come first.
- `StateProvider.tsx` persist-after-normalize (`HYDRATE_PROGRAMS` branch): gained
  `state.activeProgramId !== null &&` so a never-chose user is never auto-PUT to `programs[0]`.

The rule for future hydration/normalization work: **null short-circuits before every membership
check; only stale NON-null ids converge to the first program** (a chose-once user is never
re-asked; a never-chose user is never silently enrolled).

## Wire contracts stay string-typed

The server's `active_program_id` column is NOT NULL and `PUT`/`POST` bodies type
`activeProgramId: string` — the nullable id never crosses the wire. The FINISH_WORKOUT
write-through narrows via `state.live.programId` inside the `live !== null` guard (live is only
ever created from a non-null active program, enforced by START_WORKOUT's null no-op — itself
tsc-compulsory because the trusted `getProgram` takes a `string`).

## UI semantics

- Today render-fork: chooser (ProgramCard list + the session view's header row, so Account/sign-
  out stays reachable) iff `activeProgramId === null`; the fork sits between the hooks and the
  throwing engine calls.
- Program detail has ONE context-dependent CTA: "Choose this program" (null — saves without
  starting a workout), "Begin workout" (active), "Switch & begin workout" (different program —
  switching is gated on starting a workout; there is no standalone "set active" tap). Since 015
  the switch CTA dispatches the composite `SWITCH_AND_START_WORKOUT` action.
- The original switch mechanism here was an adjacent `SET_ACTIVE_PROGRAM` + `START_WORKOUT`
  dispatch pair whose correctness depended on event-handler batching. **015 retired it**: the
  composite reducer case can't race itself, resumes the target program's own per-program
  position, and records `switchedFrom` on the session — see
  [[020-pattern-per-program-cursors]].
- The switch **commits at the Begin tap**, and since 015 **cancelling REVERTS it** — losslessly,
  because each program keeps its own cursor and switching never mutates the map
  ([[020-pattern-per-program-cursors]]).
