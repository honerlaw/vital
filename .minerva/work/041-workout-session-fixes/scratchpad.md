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
