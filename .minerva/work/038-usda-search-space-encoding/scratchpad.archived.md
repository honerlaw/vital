# Scratchpad (archived): usda-search-space-encoding

## Quick decisions 2026-06-24
- [decided] scope check: single work unit — one server-side URL-builder fix + its regression test, no public-interface change.
- [decided] approach: build query string by hand with `encodeURIComponent` (emits `%20`) instead of `URLSearchParams` (emits `+`). Rejected: post-hoc `.replace(/\+/g,'%20')` (obscures the why); dropping the `Survey (FNDDS)` data type (loses a food source).
- [decided] whole-proposal soundness: pure function, evidence-backed by live USDA bisect (`+%28`→400, `%20%28`→200); sound, no escalation.
- [decided] review triage: no findings; `+`-space pattern isolated to this one builder (grep confirmed no other `URLSearchParams` query-string construction in `src/`).
- [decided] promote partition: PROMOTE the gateway-encoding gotcha → 038 knowledge entry (reciprocal link to 036); DISCARD quick-decision noise; TODO live-USDA confirmation kept as proposal Open Question (no separate followups.md).
- [synthesis] no-op (below threshold — 1 un-synthesized entry, no link-rot; overview stays at watermark 037)
