# Scratchpad — 033-screen-bottom-gap

## Quick decisions 2026-06-23
- [decided] scope check: single work unit — focused 2-file layout fix, no decomposition
- [decided] approach: A (reserve tabBarHeight only for `tabScreen`; drop `insets.bottom` on iOS
  tab-scroll via `designMarginOnly`; mark Settings `tabScreen`). Dominant over B (new `noTabBar`
  prop, 7 call sites — more churn) and C (flip default + Android/web opt-in — untested, contradicts
  032 "fine")
- [decided] whole-proposal soundness: sound. Shared `Screen.tsx` but every consumer traced;
  bounded/reversible. 032's "Settings protected by two facts" paragraph shifts (now via `tabScreen`
  path) — outcome preserved, update 032 in promote; not a knowledge conflict
- [decided] origin/main base: my 2 changed files don't overlap the 2 nutrition commits (032) on
  origin/main; branched 033 from origin/main, moved the working-tree diff in via patch
