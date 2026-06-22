# Followups — 030-ai-routine-generator

Deferred, non-blocking items surfaced during work/review (2026-06-22). None are regressions.

## Ops (required for the live feature)

- **Set `ANTHROPIC_API_KEY` in server env** — Doppler (local/dev) and DO App Platform (prod
  server, NOT EXPO_PUBLIC_*). Without it the routine routes 502 and the client falls back to the
  curated catalog (no brick), so the app ships safely either way, but the generator is inert until
  the key is present.
- **Migration `1782168584621_user-programs.sql`** is ADDITIVE (creates `user_programs` +
  `llm_usage`; alters/drops nothing existing) and applies automatically via the prod pre-deploy
  migrate job (knowledge 010) on the next deploy — the same path every prior migration used. This
  is **not a ship blocker**; just verify it ran in the deploy logs afterward.

## Low-severity code findings (deferred)

- Rate-limit counter increments even on a rejected (over-cap) call — wastes daily slots. Consider
  check-before-increment if abuse tuning is revisited.
- Re-prompt knobs re-seed from the ORIGINAL spec (stateless-server design) — they don't compose. A
  future "apply knobs cumulatively" mode would need the client to thread the evolving spec.
- `plan` + `generate` + `refine` each consume one daily cap slot (cap 30 — not practical today).
  Consider weighting or a separate budget if usage grows.
- `isQuestion` `number` kind has optional `min`; an LLM-emitted question could omit it, allowing
  negative numeric input. The fixed spine sets `min: 0`; consider defaulting `min` for LLM plans.

## Product / scope (from the proposal's Open Questions)

- Per-user generated-program cap (v1: none; programs are deletable).
- Exact spine question inventory + branch set tuning.
- kg unit support (v1 is lb-only, consistent with knowledge 028).
