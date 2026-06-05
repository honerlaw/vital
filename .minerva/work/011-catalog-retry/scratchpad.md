# 011 — catalog-retry · scratchpad

## Log 2026-06-05

- Invoked via `minerva:propose-ship-auto` ("go ahead and address those followups" → the two
  010 followups, split into 011-catalog-retry + 012-per-user-state-persistence by the scope
  panel). Pre-flight: fetched origin first (stale-main lesson from the aborted earlier run);
  main == origin/main at 724f24b; no in-flight units.

## Panel decisions 2026-06-05

- [2/3 accept → revision round → 3/3 accept] scope check: TWO sequential units (011 retry,
  012 persistence) with four binding 012 constraints folded in (persist-current-semantics-only /
  server-side-primary with AsyncStorage rejection recorded / single combined render-gate /
  best-effort v1 write-through). Skeptic notes pinned for 012's proposal: key the user-state
  fetch on Clerk isLoaded && isSignedIn; run hydrated user-state through the same
  activeProgramId-in-catalog normalization; soft reference (no DB FK) for active_program_id;
  pick a v1 column layout that anticipates the per-program-cursor followup migration; decide
  one-vs-two retry counters at 012 time. Diverted followups: per-program cursor memory
  (product-semantics change); offline-durable write queue.
- [skipped — small] 011 approach selection: RETRY_HYDRATE action + effect re-run dominant
  (evidence: additive, single concern, no public interface, conforms to 016/004; rejected:
  retry-callback context — bypasses the action/reducer pattern, new context surface at 3 call
  sites; auto-retry with backoff — changes UX semantics, can still strand).
- [3/3 accept] 011 whole-proposal: accepted with refinements folded in — status-keyed effect
  replaces the scope-pinned hydrateAttempt counter (lint-forced: unused counter dep trips
  exhaustive-deps under --max-warnings 0; verified by all three panelists), inline-Button-only
  constraint (react/no-multi-comp ignoreStateless:false), (tabs)/_layout dispatch destructure
  widening, single-fetch invariant documented in a comment, stale copy-history parenthetical
  deleted. Logged concern (Skeptic, medium): SC#2 is manual-only — no automated guard against
  reverting the effect deps to [].
