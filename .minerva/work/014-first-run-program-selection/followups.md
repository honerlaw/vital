# Followups — 014-first-run-program-selection

Forward work deferred from this unit. Real work, not abandoned — recorded here rather
than auto-seeded into proposals.

- **Per-program cursors (and 014 amplifies the need).** The single global cursor zeroes
  on every program switch — pre-existing, filed as an anticipated additive migration in
  knowledge 017 — but 014's "Switch & begin workout" CTA adds a *casual* switch path that
  makes the progress loss easier to trigger: a user alternating between two programs
  ratchets both back to day 0. This amplification is 014-specific (approach-panel Skeptic
  finding, 2026-06-06). A per-program cursor map restores each program's place on switch.

- **Should CANCEL_WORKOUT revert a switch committed at the Begin tap?** "Switch & begin"
  persists `SET_ACTIVE_PROGRAM` (new id, cursor 0) at the tap; cancelling the workout
  keeps the new program active and the previous program's cursor position is lost. A
  revert needs remember-previous-`{programId, cursor}` machinery — product decision, and
  it pairs naturally with the per-program-cursor bullet above (with per-program cursors,
  "revert" reduces to switching back losslessly). Seeded 2026-06-06.
