# 026 — scratchpad

## Panel decisions 2026-06-10
- [skipped — small] scope check: single work unit (evidence: touches `RootNavigator.tsx` +
  `program/[id].tsx` + adds `BackButton.tsx` + optional `onBack` on `CatalogStatus.tsx`; one
  screen, one concern — the program-detail back affordance; not decomposable).
- [escalated to user] target disambiguation (pre-panel): user picked "empty header on pushed
  screens" over the tab-screen safe-area gap (which is required and not safely removable). This
  was the strategic-seed clarification, not a panel deadlock.
- [1/3 accept → revised] approach selection, round 1: artifact C (drop header, inline back).
  Proponent accept; Skeptic + Arbiter revise. Load-bearing concerns: affordance must cover all
  3 render branches incl. shared CatalogStatus loading; CatalogStatus `hasHeader` must flip to
  false (027 inset double-count); "ink chevron styled like backLink" self-contradictory
  (backLink is muted); "~44px reclaim" overstated.
- [2/3 accept, skeptic dissented] approach selection, round 2: revised artifact C' (BackButton
  component in all 3 branches; CatalogStatus `onBack`; ink Feather chevron; honest framing).
  Proponent accept; Arbiter accept (ruling the one new Skeptic concern a fold-in implementation
  detail, not an approach change); Skeptic revise. Approach settled with the Skeptic's concern
  ADOPTED as binding implementation notes (below). No user escalation — panel converged on the
  approach; the open item was an implementation guard.
- [skipped — small] whole-proposal acceptance: every section trivially sound & single-surface
  (evidence: approach already accepted by a 2-round panel; success criteria are mechanical —
  no header / back works / lint+tsc+tests pass; one screen + one new component + one optional
  prop; `workout` untouched; 027 convention update deferred to promote).

### Binding implementation notes (from approach panel round 2)
1. `BackButton` onPress guards `router.canGoBack() ? router.back() : router.replace('/')`
   (verified: `canGoBack()` exists in expo-router 56.2.8, mount-safe; `/` established fallback).
2. Use Feather `chevron-left` in `colors.ink` (already a dep via `TabBar`).
3. Keep the back handler inline / BackButton a single default-export component (single-declaration).

## Notes
- Base: branched off `origin/main` (cae3419, #32 NativeTabs) — local `main` was stale at bf1dac2.
  Verified `Screen.tsx`'s `hasHeader`→paddingTop branch and `RootNavigator`/`CatalogStatus` are
  unchanged at this base; #32 only added an iOS `tabScreen` inset term (irrelevant here).
- NNN: 025 was taken by `origin/025-ios-liquid-glass-tabs` (#32) → this unit is 026.
