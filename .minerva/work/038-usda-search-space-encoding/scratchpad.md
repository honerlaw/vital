# Scratchpad: usda-search-space-encoding

## Quick decisions 2026-06-24
- [decided] scope check: single work unit — one server-side URL-builder fix + its regression test, no public-interface change.
- [decided] approach: build query string by hand with `encodeURIComponent` (emits `%20`) instead of `URLSearchParams` (emits `+`). Rejected: post-hoc `.replace(/\+/g,'%20')` (obscures the why); dropping the `Survey (FNDDS)` data type (loses a food source).
- [decided] whole-proposal soundness: pure function, evidence-backed by live USDA bisect (`+%28`→400, `%20%28`→200); sound, no escalation.
