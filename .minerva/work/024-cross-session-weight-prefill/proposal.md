# 024 — Cross-session weight prefill

## Status

Implemented (2026-06-07) — review + promote complete; PR pending (`minerva:ship` flips this
to Shipped on merge). Durable knowledge in
`.minerva/knowledge/030-pattern-cross-session-weight-prefill.md`.

## Goal

When a workout starts, each exercise's weight placeholder defaults to the weight the user
last logged for that exercise (most recent session in history), so routine training costs
one tap per set instead of retyping. Bodyweight/no-weight movements keep the existing
null-weight behavior — no exercise-type flag is added.

## Why

022 shipped per-set weight tracking with in-session prefill only (nearest prior set in the
same exercise) and explicitly deferred "cross-session weight prefill" as a followup
candidate. Today set 1 of every exercise starts blank; for the catalog's predominantly
straight-set schemes the weight you open with is the weight you finished with last time,
and top-set/backoff variants (GZCLP T1/T2) degrade gracefully — the placeholder is one tap
to override. Programs are a shared global catalog, so a per-user default cannot live on the
catalog `Exercise` definition — deriving it from the user's own history gives a personal
default with zero configuration and zero schema change.

## Approach

- New pure engine helper at `src/data/engine/lastLoggedWeight.ts` (single export,
  re-exported from `src/data/engine/index.ts` like every engine function):
  `lastLoggedWeight(history: SessionLog[], exerciseName: string): number | null`. Scan
  history newest-first (already served newest-first by `GET /api/me/state` —
  `ORDER BY finished_at DESC, id DESC`); for each session with per-set data, find an
  exercise with an EXACT name match having at least one set with `done && weight !== null`;
  return the LAST such set's weight in that exercise. If a session has the exercise but no
  qualifying set (or no `exercises` field — legacy/degraded rows), continue scanning older
  sessions. No match anywhere → null. Matching is cross-program (history names are
  denormalized from the same catalog vocabulary).
- `workout.tsx` newly reads `state.history` (one-line addition — the screen previously used
  only `live`/`programs`) and derives the per-exercise history fallbacks as a plain const
  AFTER the early-return render gates — not `useMemo`: a hook there would violate hook
  ordering (004), and the React Compiler memoizes plain derivation anyway (history only
  mutates on FINISH, which navigates away). Passes a new `historyWeight: number | null`
  prop to `ExerciseBlock`.
- **The fallback chain coalesces inside `ExerciseBlock`**: the per-row value passed to
  `SetRow` becomes `priorWeight(si) ?? historyWeight`. `SetRow` keeps its single
  `weightFallback` prop and is untouched — the placeholder + commit-on-toggle machinery
  (022) is fallback-source-agnostic. (A logged weight of 0 is a real value and propagates
  through `??` as such — only `null` falls through.)
- **Deliberate qualification asymmetry, stated**: in-session `priorWeight` inherits any
  typed weight (`weight !== null`, committed or not — live in-session values are the
  freshest signal and remain one edit away), while the history helper requires
  `done && weight !== null` (persisted-set consumers trust only committed sets, per the 028
  contract "consumers filter on done"). A weight typed into set 1 but not yet toggled done
  therefore wins over history for set 2's placeholder — intended.
- Unit tests for the helper via the established node/tsx test pattern (012).
- Accepted v1 bounds, stated: (a) for top-set/backoff schemes (e.g. GZCLP T1 "5×3+") the
  last qualifying set may be a backoff weight rather than the top-set weight — acceptable
  because the prefill is a non-authoritative placeholder, one tap to override; (b)
  exact-name matching means suffixed catalog variants ("Squat (T1)" vs "Squat") do not
  share history — same-vocabulary names match, renamed/suffixed ones don't; (c) the
  per-exercise scan is O(history), computed once per workout mount via memo — accepted at
  v1 scale alongside 022's no-pagination bound.
- Explicit non-goals: no catalog/schema/API change; no bodyweight flag (weight stays
  nullable end-to-end; a never-weighted exercise gets no fallback and shows the 'lb'
  placeholder); no unit conversion (v1 is 'lb' only); no plate math or progression logic
  (prefill is last logged weight, not last + increment); no fuzzy/normalized name matching.

### Approaches considered

- **A — derive from history (chosen)**: per-user correct, zero config, zero schema change.
- **B — catalog-level `weight` field**: rejected — the catalog is global/shared; it cannot
  hold per-user weights.
- **C — explicit per-user default-weight settings**: rejected — schema + API + settings UI
  to manually maintain what A derives automatically.

## Success criteria

1. Engine helper unit-tested: exact-name match (including suffix non-match); newest-first
   scan; `done && weight !== null` filter (a non-done set with weight does not qualify);
   returns LAST qualifying set's weight; continues scanning older sessions when a newer
   session has the exercise without qualifying sets; empty/absent history → null;
   never-weighted exercise → null; legacy sessions without `exercises` skipped.
2. In-app: starting a workout whose exercise was logged with weight in a prior session
   shows that weight as the set-1 placeholder; toggling done with the field blank commits
   it.
3. Fallback precedence verified: a typed (even un-toggled) set-1 weight wins over the
   history fallback for set 2's placeholder; with nothing typed this session, the history
   weight is the placeholder for every set.
4. No API, schema, or persistence change. Lint, typecheck, and full test suite pass under
   the strict guardrails.

## Open questions

None blocking — coalescing point, done-filter asymmetry, exact-name semantics, and
top-set/backoff behavior are all decided and recorded in the Approach.
