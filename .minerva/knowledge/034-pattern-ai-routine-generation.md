# Pattern: AI routine generation — closed progression vocabulary, stateless history-derived targets, programs that coexist with the catalog

- Type: pattern
- Date: 2026-06-22
- Work unit: 030-ai-routine-generator
- Related: [[035-pattern-server-llm-integration]] (the server-side LLM plumbing this feature
  rides on — fetch-based Anthropic calls, strict-writer guard validation, rate cap),
  [[030-pattern-cross-session-weight-prefill]] (the prefill chain this extends with a new top
  rung), [[028-pattern-per-set-log-tracking]] (history is the self-contained source the
  progression engine reads; strict-writer/tolerant-reader discipline),
  [[019-pattern-null-active-program-first-run]] (null active program — the fallback when a
  generated active program is deleted), [[020-pattern-per-program-cursors]] (the per-program
  cursor map that generated programs reuse unchanged),
  [[005-decision-vital-state-and-nav-boundaries]] (ephemeral wizard state stays out of the reducer;
  the wizard is a top-level route)

How VITAL generates per-user workout routines with an LLM while keeping the engine deterministic
(030). The generator coexists with the 5 curated catalog programs and runs on the SAME
engine/history/cursor machinery — it adds capability without forking the program model.

## Progression is a CLOSED vocabulary the engine applies; the LLM only parameterizes it

The catalog programs carry progression only informally (the user adds weight over time). Generated
programs carry EXPLICIT progression as an OPTIONAL `Exercise.progression` — a discriminated union
`ProgressionRule = linear | double-progression | amrap-driven` plus an optional `deload` modifier
(`src/data/types.ts`). The LLM may only SELECT and parameterize from this fixed set; it never emits
executable logic. A cast-free guard (`isProgressionRule`) rejects any unknown `kind` via the
exhaustive-never idiom — this is the strict-writer fence (028) that keeps the engine's
progression-application code finite and unit-testable. Catalog exercises OMIT `progression`
entirely, so they are provably untouched (the field's absence = today's behavior).

## Progression targets are derived STATELESSLY from history — no persisted counter

`progressionTarget(progression, history, exerciseName)` is a pure function: the working-weight
target is `startWeight` advanced by the rule over that exercise's logged history
(`successfulCompletions` / `consecutiveFails` scan history newest-first, mirroring
`lastLoggedWeight`'s qualification — a session counts only if it has done sets meeting the scheme's
parsed rep target). There is NO progression state stored anywhere; the only inputs are the
program's fixed rules and the append-only history. This makes progression a pure extension of the
028/030 model rather than a new mutable subsystem.

`startWeight` is LLM-prescribed from intake (current lifts where known, inferred from
bodyweight/experience otherwise). It is the **session-1 anchor only** — consulted when the exercise
has no logged history yet. It NEVER overrides a typed value or logged performance: the prefill
chain becomes **typed-in-session → progression-target-from-history → startWeight → blank**, and the
progression target REPLACES 030's "last-logged-weight" rung for generated exercises (it reads
history, never ignores it). Nothing clamps a typed value — the 028/030 invariant holds.

## Generated programs MERGE into the single program array; re-point waits for all hydrations

A new `user_programs` table (per Clerk user, uuid id, days+progression+intake-spec jsonb) holds the
saved programs. `GET /api/me/programs` hydrates them and the client MERGES them into
`AppState.programs` (a single array) with `userProgramIds` tracking the partition; the engine,
cursors (020), and history (028) treat them uniformly. The active-program re-point
(`normalizeActiveId`) is generalized from 014/015: it now fires only once ALL THREE hydrations are
ready (catalog + per-user state + user programs), because a saved generated program can BE the
active program and must not be re-pointed to a catalog program during the load window before its own
fetch lands. The persist-after-normalize guards in `StateProvider` mirror this (and never re-point
an id that is a known `userProgramId`). Deleting a generated program is history-safe (028
self-containment); deleting the active one falls back to the null chooser (019).

## Adaptive intake + structured refine, never a chat

The intake is an LLM-planned `QuestionGraph` (one `POST /plan` call) rendered as native controls
and walked client-side (`showWhen` is a single-equality branch grammar, not an expression
evaluator); it degrades to a hardcoded `FIXED_SPINE` when the LLM is unavailable. One `POST
/generate` turns the answered `IntakeSpec` into a draft; structured re-prompt KNOBS (`POST /refine`)
regenerate the UNPERSISTED draft (the server is stateless — the client re-sends the full spec each
call). Save commits an immutable program; a post-commit "refine" is a fresh generate from the saved
spec yielding a NEW program (an immutable program with logged sessions is never mutated). The
wizard's ephemeral state stays out of the reducer (005).

## Accepted v1 bounds

Re-prompt knobs do NOT compose (each refines from the original spec — the stateless design). The
daily LLM rate cap counts plan+generate+refine equally and increments even on a rejected over-cap
call. `number` intake questions may omit `min`. lb-only (028). These are tracked in the work unit's
`followups.md`, deferred deliberately.
