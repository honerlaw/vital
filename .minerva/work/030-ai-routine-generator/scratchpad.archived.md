# Scratchpad: ai-routine-generator

> **Ephemeral working memory.** Most of what lands here is noise — small
> decisions that don't matter, dead ends, momentary confusion. At feature
> completion, run `minerva:promote`: significant items get promoted to
> `.minerva/knowledge/`, `proposal.md` gets updated to match reality, and
> the raw scratchpad is archived.

## Panel decisions 2026-06-22

- [user-directed] scope: single work unit ("everything at once") — user explicitly chose after being warned the unit is large.
- [user-directed] approach selections: one-shot planner (over turn-by-turn/hybrid); generated-only progression; closed progression vocabulary; draft-then-immutable refine; LLM-prescribed start weights; catalog as generation fallback — each explicitly chosen by the user during explore/grill.
- [1/3 accept → revise] whole-proposal acceptance r1 (quorum 3/3): Proponent accept; Skeptic + Arbiter revise. Load-bearing gaps: (1) untyped LLM output schema, (2) plan/generate boundary, (3) startWeight "top rung vs never-clamp" contradiction, (4) unparameterized progression vocabulary.
- [3/3 accept] whole-proposal acceptance r2 (quorum 3/3): revised draft added typed QuestionGraph + ProgressionRule discriminated unions with cast-free guards, clarified plan/generate/refine boundary, resolved prefill chain (startWeight = session-1 anchor only, derived target reads history, nothing clamps).

## Panel concerns 2026-06-22 (work-phase, logged for implementation)

- /refine is stateless: client sends full IntakeSpec + knob deltas every call; server holds no draft state.
- Rate-limit: sketch the per-user daily-cap shape (counter row) BEFORE wiring the LLM API routes.
- showWhen grammar: single equality `{ questionId, equals }` — not an arbitrary expression evaluator.
- ADD_USER_PROGRAM / hydrate merge must dedupe by program id (avoid duplicate cursor slots on reload).
- Define `successfulCompletions` in the engine (v1: every done working set met/exceeded target reps).
- Weight units: lb-only in v1; no unit field needed (consistent with knowledge 028).

## Work log 2026-06-22

- LLM calls go through the platform `fetch` (Anthropic Messages API), NOT `@anthropic-ai/sdk` —
  no new dependency, no package-lock churn (avoids the npm10/11 lockfile trap, knowledge 024).
  Model pinned to `claude-sonnet-4-6` in `src/server/llm/model.ts`.
- Progression is derived statelessly from history (`progressionTarget` + per-rule engine modules);
  no persisted progression counter. Verified by 12 engine unit tests.
- Generated programs MERGE into `AppState.programs` (single array) + `userProgramIds`; the
  active-id re-point now waits on all THREE hydrations (catalog + user-state + user-programs) via
  `normalizeActiveId`, so a generated active program isn't dropped during the load window.
- OPS FOLLOW-UP (not code): `ANTHROPIC_API_KEY` must be set in Doppler (local) and DO App Platform
  prod server env. It is server-only — NEVER `EXPO_PUBLIC_*`. Without it the routine routes 502 and
  the client falls back to the catalog (no brick).
- Migration `1782168584621_user-programs.sql` is additive; it runs via the prod pre-deploy migrate
  job (knowledge 010). Not yet applied to any live DB from here.
- Verify gates all green: typecheck, `eslint --max-warnings 0`, 90 unit tests, `expo export -p web`.

## Panel decisions 2026-06-22 (work phase)

- [3/3 accept] completion verification: all 8 success criteria honestly met (lint/typecheck/90 tests/web-export green; agents inspected source).

## Panel concerns 2026-06-22 (completion — low, deferred to followups)

- Rate-limit counter increments even on a rejected 429 (over-cap). Low; "rate-limit tuning" deferred.
- Re-prompt knobs re-seed from the original spec (stateless design) — knobs don't compose. By design (SC4).
- plan + generate + refine each consume one daily cap slot (cap 30 — not practical). Deferred tuning.
- isQuestion `number` kind has optional `min`; an LLM-emitted question could omit it (negative input). Low; "spine inventory" deferred.

## Review triage 2026-06-22

- [skipped — small] per-finding triage: all 4 findings low-severity, none medium+ (evidence: 3/3 completion panel inspected source and classified all four as low/deferred/by-design). Disposition: all → followups.md (deferred). No FIX items; no load-bearing finding → no Replan-vs-FIX.
- minerva audit: PASS — diff achieves Goal/Approach/Success criteria; complies with knowledge 028/030/014/015/019/005.

## Panel decisions 2026-06-22 (promote)

- [2/3 accept, skeptic dissented] promote partition + TODO disposition: PROMOTE 034/035, MERGE as-built note, TODO→followups.md, DISCARD run noise. Skeptic low concerns (logged): consider splitting the intake pattern into its own entry; add one-line glosses for "three-hydration gate" / "strict-writer guard"; name the `label` field precisely. All advisory entry-polish, deferrable.
