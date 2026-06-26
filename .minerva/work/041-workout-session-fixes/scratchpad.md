# Scratchpad — 041-workout-session-fixes

## Quick decisions 2026-06-26

- [decided] scope check: single cohesive work unit — 4 fixes all in the workout-logging domain,
  additive, no redesign. Decompose rejected (user batched them; one PR is the expected unit).
- [escalated to user] PPL structure: full 6-day A/B canonical vs. 3-day with completed accessories
  — genuine product coin-flip. User picked full 6-day A/B canonical (Metallicadpa).
- [decided] approach issue 1: opt into `Screen keyboardAware` (034's mechanism) — dominant, minimal.
- [decided] approach issue 3 storage: persist `duration_sec` column directly rather than `started_at`
  + derive — dominant (no client math on hydrate, no redundancy with finished_at).
- [decided] approach issue 4 storage: derive volume client-side from set_log — dominant (zero schema
  change; precomputed column rejected as drift-prone denormalization).
- [decided] completion verification: all 5 success criteria met against the diff — no divergence, no
  replan. lint/typecheck clean, 127 tests pass, `expo export -p web` builds, PPL migration JSON
  validated (6 days, conforms to {name,sets,scheme}).

## Review triage 2026-06-26

Two passes: minerva audit (spec fidelity + knowledge compliance) + independent adversarial code
review of the full diff. Reviewer found NO high/med bugs; durationSec round-trip, SQL param order
($1–$9), migration immutability/ordering, hook rules + SSR safety, finishSession determinism,
sessionVolume, and all nowISO dispatch sites verified clean.

- [FIX] (pre-review, self-caught) volume number formatting used `Number.toLocaleString('en-US')` —
  Hermes `Intl.NumberFormat` digit-grouping is engine-inconsistent and the codebase renders numbers
  via plain `String(Math.round())`. Replaced with a tested `groupThousands` util.
- [FIX] LOW (reviewer): durationSec validator accepted over-`int4` values → would 500 on INSERT
  rather than 400. Added a 366-day upper bound (generous for any real session, far below int4 max).
- [IGNORE] cosmetic: an instantly-finished session shows "0:00" in history — expected.
- [synthesis] pending (Phase 4.5).
