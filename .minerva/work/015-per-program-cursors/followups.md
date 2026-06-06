# Followups — 015-per-program-cursors

Forward work deferred from this unit. Real work, not abandoned — recorded here rather
than auto-seeded into proposals.

- **Remove the tolerant-reader transition (one release after 015 ships).** Two deletions,
  both marked "Remove next release" in code and ⚠-time-boxed in knowledge 020:
  1. `GET /api/me/state` stops serving the legacy scalar `cursor` field
     (`src/server/routes/me-state-get.ts`).
  2. `PUT /api/me/state` drops the legacy `{activeProgramId, cursor}` arm and its
     `UPSERT_STATE_LEGACY` merge (`src/server/routes/me-state-put.ts`).
  Gate: no pre-015 build live — EAS submits to the App Store on every merge to main
  (knowledge 018), so one App Store release cycle after PR #17 merges is the earliest
  safe point. Also update knowledge 020's transition section when done (the ⚠ marker
  names this file). Seeded 2026-06-06.
