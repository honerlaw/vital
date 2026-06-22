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
