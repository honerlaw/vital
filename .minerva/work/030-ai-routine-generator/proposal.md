# Proposal: ai-routine-generator

**Date**: 2026-06-22
**Status**: Shipped (2026-06-22)

> **As built.** Implemented as designed, with these refinements: LLM calls go through the platform
> `fetch` (Anthropic Messages API) rather than `@anthropic-ai/sdk` — no new dependency, no
> lockfile churn (knowledge 024). The rate cap is a per-user `llm_usage` daily-counter table. Per-
> exercise `progression` is folded INTO the `days` jsonb (not a separate column). Intake answers
> carry the question `label` so the persisted spec is self-describing and a refine replays it
> verbatim. Durable patterns promoted to knowledge [[034-pattern-ai-routine-generation]] and
> [[035-pattern-server-llm-integration]]; deferred items in `followups.md`.

## Goal

Add a per-user **AI routine generator** that coexists with the 5 curated catalog
programs and runs on the same workout engine / history / per-program cursor
machinery. The flow:

1. A one-shot LLM **planner** returns a spine+branches *question graph* that the
   client renders as native deterministic controls (never a chat box).
2. The client walks the graph, collecting answers into an `IntakeSpec`.
3. A single LLM **generate** call turns the spec into an immutable per-user
   program carrying **closed-vocabulary progression** metadata.
4. Structured **re-prompt knobs** (more volume / less time / swap equipment /
   emphasize a muscle group) regenerate the *unpersisted draft* — button-driven,
   never free-form chat.

The 5 curated programs are untouched. LLM-down degrades gracefully: intake falls
back to a fixed deterministic spine; generation surfaces a Retry state and points
the user at the curated catalog as the working alternative.

## Why

Picking from 5 fixed programs cannot honor an individual's constraints —
schedule, available equipment, injuries/limitations, goals, experience, and body
stats. This personalizes the program without a chat-style UX and without
disturbing the working catalog path. The app has zero prior LLM integration, so
this also stands up the server-side Claude plumbing the codebase will reuse.

## Approach

### 1. LLM plumbing & typed contracts

- Server-only `@anthropic-ai/sdk` via a **lazy client** mirroring the existing
  lazy pg-pool pattern (knowledge 014). `ANTHROPIC_API_KEY` comes from
  Doppler / DO App Platform **server** env and is **never** `EXPO_PUBLIC_*`
  (that would ship the key inside the iOS binary). All LLM calls live exclusively
  in `src/app/api/**`.
- Three authenticated routes under `src/app/api/me/routine/`:
  - **`plan+api.ts`** → returns a typed `QuestionGraph`.
  - **`generate+api.ts`** → consumes the answered, client-supplied `IntakeSpec`
    → returns a `GeneratedProgram` (Program shape + per-exercise progression).
  - **`refine+api.ts`** → re-runs generation with re-prompt knob deltas merged
    into the spec, on the **unpersisted draft**. The client owns the draft and
    re-sends the full spec + knob deltas on every call — the server is
    **stateless** (no transient draft state). Post-commit "refine" is just a
    fresh `generate` from the saved spec, yielding a **new** program.
- **Typed LLM output, cast-free validation.** Every LLM response is validated by
  hand-written cast-free guards (knowledge 028 strict-writer): the route **400s**
  on malformed LLM output, with **one retry** before surfacing the Retry/error
  state. No `any`, no casts (strict ESLint gate).
- `QuestionGraph` = ordered `Question[]`. Each `Question` is a discriminated
  union on `kind ∈ {single-select, multi-select, number, text}` with per-variant
  fields (`options[{value,label}]` / `min` / `max` / `unit` / `maxLength`) plus an
  optional **`showWhen`** branch condition. `showWhen` uses a **single-equality**
  grammar — `{ questionId, equals }` — evaluated client-side against prior
  answers; spine questions have no `showWhen`. The guard validates the union and
  the equality shape; anything else is rejected.
- Free-text fields are wrapped as delimited *data* (not instructions) and
  length-capped to mitigate prompt injection. The model id is **pinned** to a
  specific current Claude model string (no unstable "latest" alias).

### 2. Closed progression vocabulary (discriminated union)

```ts
type ProgressionRule =
  | { kind: 'linear';            increment: number; frequency: 'per-session' | 'per-week' }
  | { kind: 'double-progression'; repLow: number; repHigh: number; increment: number }
  | { kind: 'amrap-driven';      baseIncrement: number; bonusThresholdReps: number; bonusIncrement: number };

interface DeloadModifier { triggerConsecutiveFails: number; dropPct: number }

interface ExerciseProgression {
  startWeight: number | null;      // session-1 anchor only (see §3)
  rule: ProgressionRule;
  deload?: DeloadModifier;         // composable onto any rule
}
```

- `Exercise` gains an **optional** `progression?: ExerciseProgression`. Curated
  programs omit it entirely, so they are genuinely untouched and keep today's
  informal progression.
- One **pure, one-function-per-file** engine module per rule kind, each computing
  a working-weight target from `(rule, deload, that exercise's logged history)`.
- A cast-free guard validates the union and **rejects unknown `kind`s via an
  exhaustive `never`-branch** (knowledge 028 strict-writer; the cast-free
  exhaustive-switch idiom in knowledge 003). The LLM can only *select and
  parameterize* from this closed set — it never emits executable logic.

### 3. Stateless progression & the prefill chain

- For a generated exercise the engine computes a progression **target derived
  *from* that exercise's logged history** — e.g. `linear`:
  `startWeight + increment × successfulCompletions`; `deload` applied after N
  consecutive failed sessions. This **reads** history; it does not ignore it.
- **`successfulCompletions` semantics (v1):** a session counts as a successful
  completion of an exercise when every *done* working set met or exceeded its
  target reps (parsed from the scheme). Non-`done` sets don't count
  (mirrors knowledge 030's "history trusts only done sets" asymmetry).
- The progression target **replaces the "last-logged-weight" rung** of knowledge
  030's prefill chain for generated exercises. Final chain:
  **typed-in-session value (always wins) → progression-target-from-history →
  `startWeight` (only when the exercise has no logged history yet) → blank.**
- `startWeight` is **LLM-prescribed** from intake (which collects current working
  weights / rough 1RMs where the user knows them, and lets the LLM infer gaps
  from bodyweight + experience). It is purely the session-1 anchor and **never**
  overrides a typed value or logged performance — **nothing clamps a typed
  value** (preserves the knowledge 028 / 030 invariant). The placeholder is just
  smarter than "last logged weight."

### 4. Storage

- New **`user_programs`** table mirroring the `programs` table (uuid id via
  pgcrypto, `clerk_user_id` column + index) plus `progression` and the persisted
  intake `spec` (both jsonb). Additive migration (knowledge 020 discipline);
  server access via lazy pool, `unknown` rows, cast-free mappers (knowledge 014).
- **`GET /api/me/programs`** (auth'd) hydrates the caller's generated programs;
  the client merges them into `AppState.programs` (single array). A new
  `ADD_USER_PROGRAM` action appends; the hydrate/merge **dedupes by program id**
  so a reload never produces duplicate cursor slots. Cursors (keyed by program
  id, knowledge 020) and history (name denormalized, knowledge 028) work
  unchanged.
- Deleting a generated program is **history-safe** (history is self-contained,
  knowledge 028). Deleting the **active** program falls back to the null /
  first-run chooser (knowledge 019 — null short-circuits before every
  catalog-membership check).

### 5. UX & state boundaries

- New top-level **full-screen route `/routine/new`** (full-screen flows are
  top-level routes, not tabs — knowledge 005), entered from the programs tab /
  first-run chooser.
- Ephemeral wizard state (question graph, collected answers, draft program, knob
  state) stays **out of the reducer** in a route-scoped local store (knowledge
  005). The draft preview and re-prompt knobs are **unpersisted**.
- **Save** commits an immutable program via `ADD_USER_PROGRAM`; post-commit
  refine spawns a **new** program seeded from the saved spec (never mutates a
  program with sessions logged against it).

## Success criteria

- A user completes intake — via the LLM planner **or** the fixed-spine fallback —
  and reaches a generated program preview.
- Saving produces a per-user, progression-aware program persisted to
  `user_programs` and merged into `AppState.programs` (deduped by id), selectable
  exactly like a catalog program.
- Running a saved generated program through the **existing** workout flow yields
  progression-derived prefill targets (per §3 chain), and the existing per-set
  logging / cursor advance / history machinery works unchanged on it.
- Re-prompt knobs regenerate the unpersisted draft without any DB write; saving
  the refined draft (or post-commit refine) yields a new immutable program.
- The 5 curated programs behave **identically** to before (no progression field,
  unchanged prefill, unchanged catalog path).
- Every LLM-down path degrades gracefully (fixed-spine intake; Retry + catalog
  for generation) and **never bricks** the app.
- New engine modules and guards are unit-tested (`node --import tsx --test` over
  `src/**/*.test.ts`); `eslint . --max-warnings 0` passes.
- `ANTHROPIC_API_KEY` is server-only (never `EXPO_PUBLIC_*`); the iOS binary
  carries no LLM secret.

## Open Questions

Deferred, explicitly **not** v1-complete — to finalize during implementation:

- **LLM per-user rate limiting.** v1 ships a simple server-side daily cap. Likely
  shape: a `daily_llm_calls` counter row per user (its own small table or column),
  checked + upserted at request time on the routine routes. Sketch this **before**
  wiring the API routes — an open auth'd LLM endpoint with no cap is a cost/abuse
  risk. (Panel-flagged; not a schema blocker for the rest of the design.)
- **Per-user generated-program cap.** v1: none; programs are deletable. Revisit
  if clutter/cost warrants.
- **Exact spine question inventory + branch set.** Finalized against the typed
  `QuestionGraph` schema above. Spine (always asked): goal, days/week, available
  equipment, experience, injuries/limitations, body stats (weight/height/
  gender), current working weights for main lifts (skippable). Branches key off
  these via `showWhen`.
- **Units.** v1 is **lb-only**, consistent with the existing app (knowledge 028:
  `unit` is `'lb'` only, no picker). Intake numerics and progression weights are
  lb; a future kg toggle is out of scope.
