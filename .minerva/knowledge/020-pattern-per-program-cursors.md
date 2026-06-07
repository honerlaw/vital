# Pattern: per-program cursors (jsonb map) + tolerant-reader cutover

- Type: pattern
- Date: 2026-06-06
- Work unit: 015-per-program-cursors
- Related: [[017-pattern-per-user-state-persistence]] (the persistence layer whose scalar-cursor
  schema/contract this replaced), [[019-pattern-null-active-program-first-run]] (the switch
  semantics this upgraded — the adjacent-dispatch pair is gone),
  [[014-pattern-server-pg-access-expo-routes]] (the atomic data-modifying-CTE technique the
  POST/PUT jsonb merges extend), [[028-pattern-per-set-log-tracking]] (per-set log, 022 —
  applies this one-shared-guard discipline to the SetEntry family).

How VITAL moved from one global rotation cursor to a per-program map — `user_state.cursors
jsonb` server-side, `AppState.cursors: Record<string, number>` client-side — so switching the
active program never zeroes progress, and how the cutover shipped without breaking pre-015
builds. Also: cancelling a workout that committed a switch now REVERTS the switch.

## Map semantics

- `cursors[programId]` = that program's NEXT workout day index. **A missing key reads as 0**
  (`?? 0` at every read site) — a program never trained starts at day 0; a first-run choose PUTs
  `{}` and stays resilient end-to-end.
- **Switching never mutates the map** (`SET_ACTIVE_PROGRAM` changes only the id), so switching
  back is lossless and cancel-revert needs no remembered cursor.
- **Orphan keys linger by design** (a program removed from the catalog keeps its entry): they're
  inert, and pruning would lose the position of a program that returns.
- `finishSession` advances **the finished program's own key** unconditionally (the old
  active-vs-live gate is gone — with per-program pointers there is no other pointer a finish
  could legitimately advance). It stays pure `(state, nowISO)`, preserving 017's reducer/wrapper
  mirror determinism.
- Integer discipline: the shared guard `isCursorMap` requires every value to be a
  **non-negative integer** — `typeof v === 'number' && Number.isInteger(v) && v >= 0`. The
  `typeof`-only check is a trap: `typeof NaN === 'number'`, and a NaN/float reaching
  `% days.length` produces an undefined day lookup. ONE guard is shared by the client payload
  guard, the server row mapper, and the PUT body validator so the three trust boundaries can't
  drift.

## The composite switch (and why)

`SWITCH_AND_START_WORKOUT {id}` is ONE reducer case: in-catalog guard, **same-id no-op**
(double-tap protection — without it the second dispatch records `switchedFrom` = the
just-switched id and CANCEL would "revert" forward), switch the id, start at
`(cursors[id] ?? 0) % days.length` (resume, not day 0), and record
`LiveSession.switchedFrom` = the previous id. It **retires 014's adjacent-dispatch pair** —
whose correctness depended on event-handler batching — because a single dispatch can't race
itself. `CANCEL_WORKOUT` restores `activeProgramId = live.switchedFrom` when non-null (plain
cancels carry null and revert nothing); the wrapper's mirror PUT reads the PRE-reduce
`state.live` (post-reduce live is null — `switchedFrom` would be unrecoverable).

Bounded caveat (the 017 caveat family): if a future composite ever emitted FINISH and CANCEL in
one tick, both persist closures would capture the same pre-reduce snapshot and the CANCEL arm
could PUT `switchedFrom` for a finished session. No such path exists (Finish button XOR Cancel
back-link; `live` nulls after either) — revisit only if a composite handler emits both.

## Which map each persist site forwards (the boot-seed trap)

The wrapped dispatch closes over the PRE-reduce state. That is correct for dispatch-driven
sites (SET_ACTIVE / SWITCH / CANCEL forward `state.cursors` verbatim — a switch doesn't change
the map) and for the HYDRATE_PROGRAMS convergence (its `userStateStatus === 'ready'` guard can
only be true after the user-state reduction stored the hydrated map). It is WRONG for the
HYDRATE_USER_STATE convergence: at boot, pre-reduce `state.cursors` is still the `{}` seed —
that site must forward **`action.payload.cursors`** (the just-arrived server map) or a stale-id
user's rotation map gets wiped by the convergence PUT.

## Migration (additive-then-cutover) + tolerant-reader transition

`ADD COLUMN cursors jsonb NOT NULL DEFAULT '{}'` → backfill
`jsonb_build_object(active_program_id, cursor)` → `DROP COLUMN cursor`. The down-migration
restores the scalar via `COALESCE((cursors->>active_program_id)::integer, 0)` and is
**sibling-lossy by necessity** (only the active program's position has a scalar home). The
POST/PUT writes use `cursors || jsonb_build_object($id::text, $n::integer)` — the 014 CTE
technique, merging exactly one key atomically with the session insert.

> ⚠ Time-boxed (remove next release — see 015 `followups.md`): the wire contract carries a
> one-release compatibility layer. GET serves a legacy scalar `cursor`
> (`activeProgramId === null ? 0 : cursors[activeProgramId] ?? 0`) alongside `cursors` —
> pre-015 builds' payload guard hard-requires `cursor: number` and would error at boot without
> it. PUT accepts the map (full column replace) OR the legacy scalar (translated to a sibling-
> preserving merge of `cursors[activeProgramId] = cursor`). A body that CARRIES `cursors` but
> fails the guard 400s explicitly — never silently falls through to the legacy arm. POST needed
> NO legacy branch: its body shape is unchanged and `cursor` is reinterpreted as "the new value
> for `programId`" — the only corruption path requires `live.programId !== activeProgramId`,
> which no shipped build can produce (every Begin path starts the active program).
