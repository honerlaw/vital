# Followups — 022-per-set-weight-reps

Forward work deferred from this unit. Real work, not abandoned — recorded here rather
than auto-seeded into proposals.

- **Decide a deliberate cap on POST /api/me/sessions set-log size** (review finding #4,
  triaged SUGGEST). The route bounds the *shape* of each exercise/set (server-side
  re-projection strips extras) but not the *count* — an authenticated client can POST an
  arbitrarily long `exercises` array into its own append-only history, and the re-projection
  makes a pathological array CPU work too. A length cap is a product/infra decision (how many
  exercises can a session legitimately have? do EAS Hosting / DO body-size limits already
  bound this?), so decide deliberately rather than invent a number under review. Cross-ref:
  the proposal's accepted v1 bound "set_log compounds payload size — history pagination
  unchanged" (017's documented bound) — solve adjacently if pagination work happens first.
  Seeded 2026-06-07.
