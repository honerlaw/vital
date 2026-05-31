# Followups — 002-ui-component-library

Deferred scope, explicitly out of the mock-only pass (handoff §9). Real forward work, not
abandoned — recorded here rather than auto-seeded into proposals.

- **Per-set weight/load logging.** Make `SetChip` able to show/edit a load; extend `Exercise` /
  `LiveSession` to carry weights. Auto-calculate for percentage programs (5/3/1, nSuns) from
  training maxes. Currently sets are boolean done/not-done only.

- **Real scheduling model — replaces the `cadenceDayLabel` placeholder.** `cadenceDayLabel`
  (`src/data/engine/cadenceDayLabel.ts`) and the Today "Up next" weekday labels are a v1 stand-in
  derived from `perWeek` via `new Date()` (non-deterministic — flagged in the proposal's Open
  Questions). Decide between fixed calendar days vs. a flexible "you're due" model (the latter is
  simpler and tends to keep people consistent). This is the forward home for that Open Question.

- **Persistence.** Wrap the reducer state in `AsyncStorage` (or `expo-sqlite`). `AppState` is
  already serializable (activeProgramId / cursor / history / live), so this is mostly a hydration
  + write-through layer around the existing store. The rest timer stays local (see
  `.minerva/knowledge/005-decision-vital-state-and-nav-boundaries.md`).

- **Dark mode.** Flip the structural tokens (`bg`, `ink`, `line`, `line2`) in `theme.ts`; the
  green accent carries over unchanged (it's a mid-luminance accent chosen to survive the flip).
  `AppText` and the token-driven components already centralize all color usage.

Seeded 2026-05-31.
