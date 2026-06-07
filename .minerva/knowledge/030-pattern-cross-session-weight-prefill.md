# Pattern: cross-session weight prefill — three-rung fallback chain, asymmetric qualification

- Type: pattern
- Date: 2026-06-07
- Work unit: 024-cross-session-weight-prefill
- Related: [[028-pattern-per-set-log-tracking]] (owns the persistence + UI prefill contract this
  consumes — placeholders, commit-on-toggle, consumers-filter-on-done),
  [[004-pattern-expo56-react-compiler-hook-rules]] (the hook-rules regime behind the
  plain-const derivation note below)

How VITAL derives the workout weight placeholder (024). 028 owns how sets persist and how
placeholders commit; this entry owns the **fallback policy** — where the placeholder value
comes from and why the rungs qualify differently.

## The chain and its coalesce seam

`weightFallback` for a set row resolves: **typed in-session prior set → last logged weight in
history → null**. The chain coalesces in `ExerciseBlock` (`priorWeight` returns the prior
set's weight or falls through to the `historyWeight` prop); `SetRow` keeps its single
`weightFallback` prop and is fallback-source-agnostic. A future fallback source (training
max, plate math, progression) plugs in as another rung HERE — SetRow never changes.

The history rung is the pure engine helper `lastLoggedWeight(history, exerciseName)`:
newest-first scan (server orders `finished_at DESC`), exact-name match, LAST qualifying set
in the first session that has one, continue past sessions without qualifying data, null
terminal. Per-user by construction — programs are a shared global catalog, so a weight
default can never live on the catalog `Exercise`; history is the only per-user source.

## Asymmetric qualification, on purpose

The two rungs qualify sets differently. In-session inherits ANY typed weight
(`weight !== null`, committed or not — the freshest signal, still one edit away). History
requires `done && weight !== null` — 028's "consumers of persisted sets filter on `done`"
applied to a new consumer. Consequence: a weight typed into set 1 but never toggled done
shapes set 2's placeholder now, but won't prefill anything next session. Don't "fix" either
side to match the other.

## Accepted v1 bounds

Exact-name matching: suffixed catalog variants ("Squat (T1)" vs "Squat") do not share
history — a fuzzy-matching followup must knowingly lift this. Top-set/backoff schemes (GZCLP
T1 "5×3+"): the LAST set may be a backoff weight — acceptable because the prefill is a
non-authoritative placeholder. Bodyweight movements need no flag: never-weighted exercises
yield null and the placeholder stays 'lb'.

## Plain const after render gates, not useMemo

`workout.tsx` derives the per-exercise fallbacks as a plain const AFTER the early-return
render gates — a `useMemo` there would violate hook ordering (hooks before gates), and the
React Compiler ([[004-pattern-expo56-react-compiler-hook-rules]]) auto-memoizes plain
derivation anyway. House shape: derive, don't memoize.
