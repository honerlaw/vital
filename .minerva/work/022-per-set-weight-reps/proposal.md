# Proposal: per-set weight & reps tracking

## Status

Approved (2026-06-07) via `minerva:propose-ship-auto` consensus panels — scope 3/3 (vote 2),
approach 3/3 (vote 2), whole-proposal escalated once (client-guard failure semantics; user chose
symmetric degrade). `minerva:work` flips nothing here; `minerva:ship` flips this to Shipped on
merge.

## Goal

During an active workout the user records, per set, the weight used and the actual reps
performed; the data persists with the finished session and is visible in History. A "5+"
prescription where the user did 15 records 15.

## Why

Sets today are boolean check-offs (`LiveSession.completed: boolean[][]`); history records
attendance only (program/day/date). Catalog programs that progress (5/3/1, GZCLP, nSuns)
progress off AMRAP performance and weight history — without per-set data the log can't support
progression, PRs, or honest review.

## Approach

Panel-selected: **jsonb-denormalized per-set records end-to-end** (over a normalized
`workout_set_logs` table — first hard FK would violate the no-FK convention in
[[017-pattern-per-user-state-persistence]], and jsonb stays queryable for future analytics —
and over a minimal per-exercise-weight/AMRAP-only variant, which cannot represent the verbatim
per-set request nor `3×8-12` schemes).

### Types

- `SetEntry = { done: boolean; weight: number | null; reps: number | null }`.
- `LiveSession.completed: boolean[][]` → `LiveSession.sets: SetEntry[][]`. In-memory only
  (live is never wired/persisted). Full edit surface, NAMED: `src/data/types.ts`,
  `src/data/engine/startSession.ts` (seeds `{done:false,weight:null,reps:null}` rows from the
  day's exercises — this seeding is the alignment invariant), `src/data/engine/toggleSet.ts`
  (deleted → replaced by `updateSet.ts`), `src/data/engine/index.ts` (re-export swap),
  `src/data/engine/sessionProgress.ts` (counts `sets[][].done`), `src/state/actions.ts`
  (TOGGLE_SET → UPDATE_SET action type with patch payload), `src/state/reducer.ts` (case swap),
  `src/app/workout.tsx`, `src/components/ExerciseBlock.tsx` (prop type),
  `src/components/SetChip.tsx` (replaced by a set-row component),
  `src/data/engine/finishSession.test.ts` (fixtures rewritten to the new shape).
- `SessionLog` gains optional `exercises?: { name: string; scheme: string; sets: SetEntry[] }[]`
  and `unit?: 'lb'`; `FinishedSessionBody` (`src/data/post-session.ts`) extends accordingly.

### One-way doors (decided)

- **Unit**: logs denormalize `unit: 'lb'` now; v1 has no unit picker (documented assumption);
  a future kg toggle needs no history backfill.
- **Persisted shape**: logs persist ALL set rows incl. untouched — planned-vs-actual stays
  visible; consumers filter on `done`. (Noted: a finished-all-blank session and a legacy `'[]'`
  session render identically in History — deliberate collapse, both "nothing performed".)

### Engine

Pure `updateSet(live, ei, si, patch)`; ALL numeric coercion (finite, non-negative,
null-for-blank) lives there — never in the UI or wrapper. `finishSession(state, nowISO)`
signature unchanged; it zips `program.days[dayIndex].exercises[ei]` with `live.sets[ei]` BY
INDEX — alignment guaranteed because `startSession` seeds `sets` from that same exercises array
and no action resizes it (stated invariant). Mirror determinism preserved
([[017-pattern-per-user-state-persistence]]): reducer and write-through wrapper call the same
pure function with identical args; the EXISTING determinism test is REWRITTEN to the new `sets`
fixture shape (same deepEqual property, not weakened).

### UI (workout)

Per-set row component (NEW FILE, replaces SetChip; one-component-per-file lint budgeted): set
label, weight input, reps input, done toggle; numeric keyboards. Prefill is a one-time
non-authoritative seed per row — weight from prior set in same exercise; reps from shared pure
`parseSchemeReps(scheme)`. **The scheme separator is U+00D7 `×` (NOT ASCII `x`) — the parser
must match the Unicode codepoint.** Full live vocabulary (from the migration seed, the runtime
catalog source) and expected parses: `1×5`→5, `3×5`→5, `4×5`→5, `5×5`→5, `3×10`→10, `3×15`→15,
`5×15`→15, `1×5+`→5, `3×5+`→5, `5×3+`→3 (AMRAP floor), `3×8-12`→8, `4×8-12`→8, `5×8-12`→8
(range floor), `5/3/1`→blank, `8 sets`→blank, `9 sets`→blank. Typed values never clamped (15
over "5+" stays 15); edits never cascade; done with blanks allowed; progress/Finish gate keep
keying off `done`.

### UI (history)

HistoryRow becomes tappable to expand; the expanded per-exercise set list is a NEW component
file (lint: no-multi-comp). Shows `weight × reps` per done set, planned-only sets dimmed;
sessions without set data render exactly as today.

### Write path

Migration adds `set_log jsonb NOT NULL DEFAULT '[]'` to `workout_sessions` (down drops;
lossy-acceptable). `POST /api/me/sessions` body gains optional `exercises` + `unit`; the
single-statement atomic data-modifying CTE ([[014-pattern-server-pg-access-expo-routes]]) gains
one column/param. Validator: absent → accept (old clients); present-but-malformed
(null/non-array/NaN/Infinity/negative/wrong shape) → explicit 400 via the shared guard, never
silent fall-through. **Deliberate asymmetry: strict writer (400 at the door), tolerant reader
(degrade on legacy/corrupt rows).**

### Read path (degrade symmetrically — user-decided at escalation)

- Server: `me-state-get.ts` `SELECT_SESSIONS` adds the `set_log` column; `rowToSessionLog`
  parses it BEST-EFFORT — guard failure → `console.error` + return the log WITHOUT `exercises`,
  never throw (`'[]'` → field omitted: "no per-set data", not "empty workout"). Docstring
  justification: core columns keep throw-semantics (absence is server corruption); `set_log` is
  optional client-supplied data whose corruption must not brick History/boot.
- Client: the hydration guard DEGRADES the same way — a present-but-malformed `exercises`/`unit`
  is dropped from that entry (core `SessionLog` stays valid; attach-on-valid via the shared
  guard); it never fails `every(isSessionLog)`, so one corrupt row can never brick boot. Boot
  can only show set-detail-missing, never an error screen, on bad set data.

### Guards

ONE shared `isSetEntry` / `isSetLogExercise` guard family used at ALL THREE boundaries
([[020-pattern-per-program-cursors]] discipline; finite-number checks, no NaN/float trap):
client hydration sanitizer (attach-on-valid), server row mapper (best-effort), POST validator
(strict 400).

## Success criteria

1. Active workout: per-set weight/reps inputs + done toggle; values in `LiveSession.sets`;
   blanks allowed; progress/Finish gate behavior unchanged.
2. `parseSchemeReps` unit-tested against ALL 16 live schemes above, incl. U+00D7 handling;
   AMRAP/range floors; unparseable→blank; typed values never clamped; weight seeds from prior
   set; no cascade on edit.
3. Finish persists `exercises` + `unit:'lb'` atomically with the session row (single-statement
   CTE); POST validator absent→accept / malformed→400 via the shared guard.
4. History hydration returns `exercises` for new sessions; legacy rows (`'[]'`/absent) hydrate
   without the field; malformed `set_log` drops the field on BOTH boundaries (server mapper
   console.error + client sanitizer) and never 500s / never bricks boot.
5. History UI: expandable row shows per-set `weight × reps` where data exists; sessions without
   data render as today.
6. Migration up/down clean (up adds column with default; down drops).
7. All coercion in pure `updateSet`; `finishSession` signature unchanged; determinism test
   rewritten to the new shape and passing (same deepEqual property).
8. Unit tests: `updateSet` coercion, `parseSchemeReps` (full vocab), `finishSession`
   projection/zip, shared guards, server mapper best-effort path, client sanitizer. Lint
   `--max-warnings 0`, typecheck, full suite green.

## Open questions (deliberate v1 bounds)

- No kg/unit picker (hardcoded `'lb'`, denormalized for future-proofing).
- No plate math, training maxes, or cross-session weight prefill (followup candidates).
- Offline-finish durability and history pagination unchanged
  ([[017-pattern-per-user-state-persistence]] bounds; `set_log` compounds payload size —
  accepted for v1).
