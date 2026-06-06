# 015 — per-program cursors

## Status

Implemented — review complete; PR pending (`minerva:ship` flips this to Shipped on merge).
Approved + delivered via `minerva:propose-ship-auto` consensus panels — scope 2/3 (single-unit
affirmed unanimously in prose across two rounds), approach [skipped — small, A′ strictly
dominant], whole-proposal accepted after one revision round (the HYDRATE-forwards-payload-map
blocking catch), completion verification 3/3, review triage 2/3, promote partition 2/3 (five
Skeptic fold-ins applied). Durable knowledge promoted to
`.minerva/knowledge/020-pattern-per-program-cursors.md` (017/019 bodies rewritten in the same
pass); forward work in `followups.md` (tolerant-reader removal next release).

## Goal

Each program remembers its own rotation position — switching programs never zeroes
progress — and cancelling a workout that performed a switch reverts the active program to
the previous one. Implements both bullets of 014's `followups.md`.

## Why

The single global cursor (`user_state.cursor`, `AppState.cursor`) zeroes on every
`SET_ACTIVE_PROGRAM`; 014's "Switch & begin" made switching casual, amplifying progress
loss. And a switch commits at the Begin tap — cancelling keeps it. With per-program
cursors the map is never mutated by a switch, so revert reduces to restoring the previous
id losslessly. Knowledge 017 filed per-program cursors as the anticipated migration.

## Approach

A′ — JSONB cursor map, clean cutover with a one-release tolerant-reader transition.
(Rejected: B — keep the scalar column synced: same compat coverage as A′'s tolerant
reader but adds dual-write drift. C — derive cursors from history counts: zero schema
change but couples cursor correctness to the full-history fetch that pagination will
break, and leaves dead columns.)

1. **Migration** `migrations/<timestamp>_per-program-cursors.sql` in the repo's
   `-- Up Migration` / `-- Down Migration` two-marker sql format:
   `ALTER TABLE user_state ADD COLUMN cursors jsonb NOT NULL DEFAULT '{}'::jsonb;` then
   backfill `UPDATE user_state SET cursors = jsonb_build_object(active_program_id, cursor);`
   then `ALTER TABLE user_state DROP COLUMN cursor;` Down-migration re-adds the scalar
   restored via `COALESCE((cursors->>active_program_id)::integer, 0)` (sibling keys are
   lossy by necessity — documented). The 012 migration file's "anticipated ADDITIVE later
   migration" comment is historically stale but MUST NOT be edited (applied migrations are
   immutable); the new migration's comment carries the supersession note.
2. **GET** returns `{activeProgramId, cursor (legacy), cursors, history}` for one release
   — pre-015 builds' `isUserStatePayload` guard requires `cursor: number`; omitting it
   would error every old build at boot. No-row user: `{activeProgramId: null, cursor: 0,
   cursors: {}, history}`; legacy cursor = `activeProgramId === null ? 0 :
   (cursors[activeProgramId] ?? 0)`. New clients ignore the extra field (presence-style
   guards reject nothing extra, both directions — verified for old-client GET and
   new-client-PUT-to-old-server).
3. **PUT tolerant-reader for one release**: accepts `{activeProgramId, cursors}` → SQL
   full-replace of the column; or legacy `{activeProgramId, cursor}` → SQL merge
   `cursors = user_state.cursors || jsonb_build_object($id, $cursor)` against the existing
   row (sibling keys preserved; legacy zero-on-switch semantics preserved for old builds
   without corrupting other programs). Validator: a body that CARRIES `cursors` but fails the
   guard 400s explicitly (review F6 — no silent fall-through to the legacy arm on a
   coincidentally-valid `cursor`); else the legacy arm; else 400. Cast-free.
4. **POST /me/sessions**: body shape UNCHANGED (`{programId, programName, dayName,
   dateISO, cursor, activeProgramId}`); `cursor` is reinterpreted as "the new cursor value
   for programId"; the CTE conflict arm becomes
   `cursors = user_state.cursors || jsonb_build_object($programId, $cursor)`; the INSERT
   arm seeds `jsonb_build_object($programId, $cursor)`; `activeProgramId` stays solely to
   seed the NOT NULL column. **No legacy POST branch — documented accepted bound**: the
   only corruption path requires `live.programId !== activeProgramId`, a state no shipped
   build can produce (every Begin path starts the active program; finishSession's
   active-vs-live gate is unreachable defensive code — thrice code-verified).
5. **Shared guard helper** `isCursorMap(value): value is Record<string, number>` (object,
   non-null, every value a **non-negative integer** — review F1: `typeof NaN === 'number'`,
   so the number-typed check would let NaN/floats reach `% days.length`) in
   `src/data/guards/`, reused by the client payload guard, the server mapper validation, and
   the PUT validator — one implementation, not three inline copies.
6. **Client state**: `AppState.cursor: number` → `cursors: Record<string, number>`
   (missing key = 0); `UserStatePayload` likewise. `SET_ACTIVE_PROGRAM` only changes the
   id (no zeroing). `RESET_USER_STATE` → `{}`; the `nothingToReset` bailout uses
   `Object.keys(state.cursors).length === 0`, preserving the same-reference no-op at the
   resting state. HYDRATE stores the map (null active stays null per 019; a stale id
   re-points with the map preserved). **Orphan keys linger by design** (inert; pruning
   would lose the cursor of a program that returns to the catalog).
7. **Engine**: `advanceCursor`/`getNextWorkout`/`getUpcoming` keep scalar signatures —
   call sites resolve `(cursors[id] ?? 0)`. `finishSession` keeps its
   `(state: AppState, nowISO)` signature; its BODY changes:
   `nextCursor = advanceCursor(program, state.cursors[state.live.programId] ?? 0)` and the
   active-vs-live gate is DELETED (deliberate semantic change: with per-program pointers,
   finishing any program advances that program's own key — the new contract's load-bearing
   test asserts a non-active finish advances its OWN key and leaves the active key
   untouched). Stays pure → 017's reducer/wrapper mirror determinism is preserved.
   `LiveSession` gains `switchedFrom: string | null`; `startSession` sets it null.
8. **Composite action `SWITCH_AND_START_WORKOUT {id}`** (replaces 014's fragile
   SET_ACTIVE_PROGRAM + START_WORKOUT adjacent-dispatch pair on program detail): in-catalog
   guard; **same-id no-op** (review F4 — a double-tap race would otherwise clobber
   `switchedFrom` with the just-switched id); sets `activeProgramId = id`; live =
   `{...startSession(program, (cursors[id] ?? 0) % days.length), switchedFrom: previous
   activeProgramId}` (resume, not day 0). `CANCEL_WORKOUT`: when
   `live.switchedFrom !== null`, also restores `activeProgramId = live.switchedFrom` —
   the reverted-to program's cursor is already intact in the map (switch never mutates it),
   so revert is automatic and lossless.
9. **Write-through wrapper** (built in useMemo over `[state, getToken]` — closure `state`
   is the PRE-REDUCE snapshot, the existing load-bearing convention):
   - CANCEL's conditional PUT reads pre-reduce `state.live.switchedFrom` and pre-reduce
     `state.cursors` (post-reduce live is null — switchedFrom would be unrecoverable);
     guard mirrors the reducer (`live !== null && live.switchedFrom !== null`).
   - SET_ACTIVE_PROGRAM and SWITCH_AND_START PUT `{id, pre-reduce state.cursors verbatim}`
     (the map is unchanged by a switch — NOT `cursors[id] = 0`).
   - FINISH POSTs `cursor = nextCursor` for `live.programId` (shape unchanged).
   - **Persist-after-normalize sites differ by which map is non-stale**: the
     HYDRATE_USER_STATE site forwards `action.payload.cursors` (the just-arrived server
     map — pre-reduce `state.cursors` is the stale `{}` boot seed and must NOT be used);
     the HYDRATE_PROGRAMS site forwards pre-reduce `state.cursors` (correct because its
     `userStateStatus === 'ready'` guard can only be true after the user-state reduction
     already stored the hydrated map).
   - Client wire fns change: `putUserState(getToken, activeProgramId, cursors)`;
     `post-session.ts` comment updated (shape unchanged).
10. **Screens** — four cursor read-sites: Today Begin/`getNextWorkout`/`getUpcoming`
    (index.tsx:66-68, one resolved variable), Today "Up next" row arithmetic
    (index.tsx:116), detail-active Begin (program/[id].tsx:62) — all resolve
    `(cursors[activeProgramId] ?? 0)`; the detail-switch day index moves INTO the reducer
    via the composite action. Detail switch CTA label unchanged; it now resumes the target
    program's position and dispatches `SWITCH_AND_START_WORKOUT`.

## Breaking-change map (existing files that must be revised, not just supplemented)

`src/state/reducer.test.ts` (4 HYDRATE payload-shape tests, RESET cursor assertion, FINISH
cursor-advance assertion, SET_ACTIVE zeroing expectations), `src/server/user-state-mapper.test.ts`,
`src/data/user-state-guards.test.ts`, `src/data/engine/finishSession.test.ts`,
`src/data/types.ts`, `src/state/default-state.ts`.

## Success criteria

1. `npm test` green with the revised files above plus new cases: switch preserves both
   programs' cursors; SWITCH_AND_START resumes the target position and records
   `switchedFrom`; CANCEL after switch reverts the id with the reverted program's cursor
   intact (plain CANCEL doesn't revert); FINISH advances `cursors[live.programId]`
   (including the non-active-finish-advances-its-own-key contract case); hydration both
   orders with the map (null active stays null; stale id re-points, map preserved); RESET
   clears the map including the same-reference bailout at `{}`; `isCursorMap` rejects
   non-number values; mapper validates jsonb object-of-numbers.
2. `npm run typecheck` and `npm run lint` (`--max-warnings 0`) pass.
3. Manual on local docker pg: migration applies on a DB with existing rows (backfill
   verified by query); switch → switch back preserves both positions; cancel-after-switch
   restores the previous program on Today AND the server row shows the reverted id;
   stale-id hydration with a non-trivial cursors map → the convergence PUT preserves the
   full map with the re-pointed id; first-run choose → server `cursors: {}` → Today
   renders day 1 of the rotation (`?? 0` resilience end-to-end).
4. GET carries both `cursor` (legacy) and `cursors` this release; PUT accepts both shapes.
5. The diff touches only the enumerated files (migration, 3 routes/mapper/guards, client
   state/engine/screens/wire fns, tests).

## Open questions

None blocking. Promote-phase knowledge closure: 017's Schema + Server-contract sections
and determinism note rewritten (singular-cursor claims → map; "anticipated additive
migration" → realized as additive-then-cutover); 019's switch-pair
(hardcoded-0/cursor-zeroing) and "cancelling keeps the new program active at cursor 0"
body sections REWRITTEN (not just linked); new knowledge entry for per-program cursor
semantics + the tolerant-reader transition + the no-legacy-POST accepted bound.
