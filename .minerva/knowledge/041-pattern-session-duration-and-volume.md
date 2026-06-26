# Pattern: session duration + total volume — injected start stamp, optional column, derived stat

- Type: pattern
- Date: 2026-06-26
- Work unit: 041-workout-session-fixes
- Related: [[028-pattern-per-set-log-tracking]] (the optional/best-effort `set_log` round-trip this
  duplicates for `duration_sec` — strict writer, tolerant reader at BOTH boundaries),
  [[017-pattern-per-user-state-persistence]] (the mirror-determinism contract the start stamp
  rides), [[020-pattern-per-program-cursors]] (the one-shared-guard-across-boundaries discipline),
  [[014-pattern-server-pg-access-expo-routes]] (the single-statement CTE the new column joined as
  one more positional param), [[015-pattern-generated-seed-drift-guard]] (its remediation note: an
  applied seed migration is immutable, so re-seed the catalog via a NEW `UPDATE` migration).

How VITAL added per-session elapsed time and a derived total-volume stat (041), and the two reusable
techniques that fell out. Fundamentals (determinism, optional-field degrade) live in 028/017 — this
records only the delta.

## Two storage shapes, chosen per how the value is consumed

- **Duration → a persisted column.** Wall-clock seconds is NOT derivable from the per-set log, so it
  needs storage. `LiveSession.startedAtISO` is stamped at the dispatch site (the Begin tap), exactly
  like `FINISH_WORKOUT`'s `nowISO` — so `startSession`/`finishSession` stay pure and the reducer and
  the fire-and-forget write-through compute an IDENTICAL `durationSec` (012/017 determinism). The
  actions `START_WORKOUT` / `SWITCH_AND_START_WORKOUT` therefore both gained a `nowISO` field;
  every dispatch site stamps `new Date().toISOString()`. `finishSession` computes
  `max(0, round((finish − start)/1000))` (floor guards a backwards clock; `Number.isFinite` guards a
  malformed anchor → 0). Persisted as a NULLABLE `int4` `duration_sec` column, optional/best-effort
  at every boundary (post body → POST validator → INSERT `$9::integer` → SELECT → mapper → client
  sanitizer) — a pre-041 row reads NULL → omitted, never a 500. This is the 028 `set_log` posture
  applied to a scalar.
- **Total volume → a derived stat, NO column.** Σ `weight × reps` over `done` sets with both values
  non-null is a pure function of data already in `set_log` (`sessionVolume(log)` in the engine).
  Persisting it would denormalize a trivially-derivable value and risk drift — so it is computed
  client-side at render and the display is gated on `> 0` (a bodyweight-only or no-data session shows
  nothing). **Rule of thumb that decided both: persist only what you can't recompute from data you
  already store.**

## Two reusable gotchas

- **Validate against the COLUMN's range, not just the JS type.** The strict-writer validator first
  only checked `Number.isInteger && >= 0` — but an over-`int4` value (> 2,147,483,647) passes that
  and then OVERFLOWS on INSERT, turning a "400 at the door" into a 500. Cap absurd values in the
  validator (041 uses 366 days — generous for any real session, far below int4 max). Any
  client-supplied number that lands in a fixed-width SQL column wants an explicit upper bound.
- **Don't use `Intl.NumberFormat` / `Number.toLocaleString` for digit grouping in RN.** Hermes'
  number-grouping support is engine-inconsistent; the app renders numbers via plain
  `String(Math.round(...))` (see `FoodLogRow`) and groups thousands with a deterministic string
  helper (`groupThousands`, regex `\B(?=(\d{3})+(?!\d))`). `Date.prototype.toLocaleDateString` IS
  used (`historyDate`) and works — the caution is specific to number grouping, not all of Intl.

## Live timer: recompute from the clock, never self-increment

The in-session elapsed display (`useElapsedSeconds(startISO)`) recomputes `floor((Date.now() −
start)/1000)` every second rather than incrementing a counter — so it stays accurate across
re-renders and JS stalls. It is called UNCONDITIONALLY above the screen's early-return gates (rules
of hooks); a null start (no live session, e.g. the boot gate) returns 0 and schedules no interval.
SSR-safe because `live` is in-memory only (never persisted/hydrated) — a server render always sees
`live: null` → 0, matching the client's first paint, so no hydration mismatch.
