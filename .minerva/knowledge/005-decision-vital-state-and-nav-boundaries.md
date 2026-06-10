# Decision: VITAL state + navigation boundaries

- Type: decision
- Date: 2026-05-31
- Work unit: 002-ui-component-library
- Related: [[004-pattern-expo56-react-compiler-hook-rules]] (the timer's compiler-safe
  implementation), [[003-pattern-conforming-code-under-strict-guardrails]],
  [[019-pattern-null-active-program-first-run]] (the first-run null-id semantics, 014),
  [[027-pattern-native-stack-headers-pushed-screens]] (021's native header chrome on the
  pushed routes this placement defined),
  [[031-pattern-ios-native-tabs-liquid-glass]] (025's iOS NativeTabs bar — the pushed routes
  here still cover it by placement, no visibility toggling),
  [[032-pattern-screen-flushbottom-tabbar-inset]] (why the tabs tab bar is a relative-flow
  sibling on Android/web — the layout fact the flushBottom padding fix depends on)

Two architectural choices made building VITAL's UI that future work should preserve (or
consciously revisit), not rediscover.

## The rest timer is LOCAL UI state, not global app state
The 90s rest countdown lives in a `useRestTimer` hook owned by the Workout screen — deliberately
**not** in the Context/`useReducer` app state. Rationale: it is ephemeral UI, not part of the
serializable domain model (`AppState` = activeProgramId / cursor / history / live). Keeping it out
of the reducer means every `TOGGLE_SET` dispatch does not also churn timer state, the timer can't
desync from app state on cancel/finish, and the persistence follow-up (serializing `AppState`)
stays clean. The countdown uses a self-scheduling `setTimeout` effect (see [[004]]) and the bar
animates via the **`Animated` API**, not Reanimated — chosen to avoid a worklet→JS boundary for the
"auto-hide at 0" hop (Reanimated is an available dep but unused here).

## The in-progress Workout is a top-level route, NOT a tab
`workout.tsx` is registered on the **root Stack outside the `(tabs)` group** (sibling of `(tabs)`,
`program/[id]`). Pushing it covers the whole screen including the tab bar, so the tab bar is hidden
during a live session **by route placement** — no `tabBarStyle`/visibility toggling needed. This is
the idiomatic expo-router way to get a full-screen, tab-less flow. `program/[id]` (program detail)
uses the same placement. Returning to Today after finish/cancel is `router.replace('/')` /
`router.back()`.
