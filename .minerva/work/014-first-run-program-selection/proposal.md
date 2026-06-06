# 014 — first-run program selection

## Status

Implemented — review complete; PR pending (`minerva:ship` flips this to Shipped on merge).
Approved + delivered via `minerva:propose-ship-auto` consensus panels — scope 3/3 (after one
revision round), approach B′ 3/3 (after one revision round with four binding amendments),
whole-proposal 3/3, completion verification 3/3, review triage 2/3, promote partition 2/3.
Durable knowledge promoted to `.minerva/knowledge/019-pattern-null-active-program-first-run.md`;
forward work in `followups.md`.

## Goal

A user who has never picked a program is asked to choose one before seeing a planned
session; the choice persists as their active program; thereafter, starting a workout in a
different program switches the active program to it.

## Why

The server already distinguishes "never chose" (`GET /api/me/state` returns
`activeProgramId: null` for a no-row user; `UserStatePayload.activeProgramId` is already
`string | null`), but the client launders that null into the first program
(`reducer.ts:43` via `DEFAULT_ACTIVE_PROGRAM_ID`), silently enrolling every new user in
BBR — they are never asked. Switching exists ("Set as my program") but is decoupled from
starting a workout, which is the switching mechanism the user specified.

## Approach

One client-only invariant flip — `AppState.activeProgramId: string → string | null`,
where null means "never chose" — plus its transitive closure. No server/API/migration
changes.

1. **Type + sentinel removal.** `activeProgramId: string | null` in `src/data/types.ts`.
   Delete `DEFAULT_ACTIVE_PROGRAM_ID`; all four sentinel sites move to null in lockstep:
   the `DEFAULT_STATE` seed, HYDRATE_USER_STATE's not-ready fallback (`reducer.ts:43`),
   and RESET_USER_STATE's `nothingToReset` comparison (`:61`) and assignment (`:69`).
2. **Hydration normalization.** HYDRATE_USER_STATE: a null server id stays null (no
   first-program fallback). HYDRATE_PROGRAMS: special-case
   `state.activeProgramId === null` BEFORE the `.some()` re-point —
   `.some(p => p.id === null)` is false and would silently re-point null to
   `programs[0]`, defeating the feature — null stays null. **Stale non-null ids keep
   converging to `programs[0]`** exactly as today, in both landing orders.
3. **Persist-after-normalize branches remain, null-guarded.** StateProvider's
   HYDRATE_USER_STATE branch already guards `serverId !== null`. The HYDRATE_PROGRAMS
   branch gains `state.activeProgramId !== null &&` so a never-chose user is never
   auto-PUT to `programs[0]`.
4. **FINISH_WORKOUT wire-contract fix.** `StateProvider.tsx:93` currently POSTs
   `state.activeProgramId` (becomes nullable; `FinishedSessionBody.activeProgramId:
   string`; the server 400s non-strings). Narrow via `state.live.programId` inside the
   existing `live !== null` guard — necessary and sufficient (live is only ever created
   from a non-null active program). `finishSession.ts` itself needs no edit: line 18 already
   resolves the program from `live.programId`, and its line 29 `getProgram` call is safe
   via the `program.id === state.activeProgramId` equality narrowing on line 28.
5. **Today screen render-fork.** When `activeProgramId === null`, return an inline
   chooser ("Choose your program" + the existing `ProgramCard` list; tapping routes to
   `/program/[id]`). The chooser also renders the session view's header row (date eyebrow +
   Account link) — the Account link is the sole path to `/account`/Sign out and must stay
   reachable on first run (review F1). The fork sits between the hooks and the three engine
   calls;
   `index.tsx:24-27` (`getProgram`/`getNextWorkout`/`getUpcoming`) physically relocate
   below it — they are unconditional expressions that would throw on null.
6. **Program detail: single context-dependent CTA** (replaces "Set as my program"):
   - **null active (onboarding):** "Choose this program" → `SET_ACTIVE_PROGRAM` (PUTs
     id + cursor 0), route to Today. Selection saves; no forced workout.
   - **this program active:** "Begin workout" → `START_WORKOUT(cursor % days.length)`,
     route `/workout` (same arithmetic as Today's Begin).
   - **different program active:** "Switch & begin workout" → `SET_ACTIVE_PROGRAM` then
     `START_WORKOUT(dayIndex 0)`, route `/workout`. The two dispatches are synchronous
     and adjacent inside one onPress handler — no async between them (`useReducer`
     drains the queue in order; START_WORKOUT has no persistence mirror so the wrapper's
     stale closure is harmless; `dayIndex 0` is bound to SET_ACTIVE_PROGRAM's
     cursor-zeroing invariant — comment both in code).
   - **Intentional removal:** switch-without-workout no longer exists; the requirement
     gates switching on starting a workout.
7. **Reducer START_WORKOUT null guard** — compulsory for typecheck (`reducer.ts:89`
   passes the now-nullable id into the throwing `getProgram(id: string)`), and
   unreachable via UI; tested as a reducer contract. Transitively keeps `finishSession`'s
   throwing `getProgram` safe (live only exists after a non-null START_WORKOUT).
8. **Spec-honesty notes.** The Programs tab remains a co-equal selection path while null
   (the tab bar is not gated on selection; the detail CTA handles null correctly from any
   entry, including deep links). `programs.tsx:30` reads `state.activeProgramId` but
   needs **no change** — `string === string | null` typechecks, and a null active
   correctly renders no card as "Active". The History tab is reachable but empty
   pre-selection — harmless.

## Success criteria

1. `npm test` passes with **new and revised** reducer cases — two existing assertions
   must be rewritten (`reducer.test.ts:22` expects `'bbr'` after HYDRATE_PROGRAMS on
   DEFAULT_STATE → becomes null-stays-null; `:103` expects null-hydrate re-point to
   `programs[0]` → must now assert null), plus new cases: null hydration stays null in
   both landing orders; stale non-null id converges to `programs[0]` in both orders;
   START_WORKOUT null no-op; RESET_USER_STATE → null including the same-reference
   bailout; HYDRATE_PROGRAMS on `[]` still errors (regression guard).
2. `npm run typecheck` and `npm run lint` (`--max-warnings 0`) pass — the compiler proves
   the null fallout is fully handled (no nullable id reaches a throwing `getProgram` or a
   string-typed wire contract).
3. Today renders the chooser iff `activeProgramId === null`, the session view otherwise.
4. Program detail shows exactly one CTA per context with the behaviors in Approach 6.
5. The diff touches no files under `src/server/`, `src/app/api/`, or `migrations/`.

## Open questions

None blocking. Logged limitation: the single global cursor zeroes progress on every
switch; per-program cursors are the anticipated additive follow-up (knowledge 017).

## Affected files

`src/data/types.ts`, `src/state/default-state.ts`, `src/state/reducer.ts`,
`src/state/StateProvider.tsx`, `src/app/(tabs)/index.tsx`, `src/app/program/[id].tsx`,
`src/state/reducer.test.ts` (+ `src/app/(tabs)/programs.tsx`: verified no-change-needed).
