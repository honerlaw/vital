# Pattern: Screen bottom clearance — reserve it only where the bar overlaps content

- Type: pattern
- Date: 2026-06-23
- Work unit: 033-screen-bottom-gap
- Related: [[032-pattern-screen-flushbottom-tabbar-inset]] (the prior, narrower bottom-padding
  model this generalizes — and whose Settings-protection mechanism 033 changed),
  [[031-pattern-ios-native-tabs-liquid-glass]] ("Trap 1": the iOS native UITabBar auto-inset —
  033 completes the bottom half by also dropping `insets.bottom`, the symmetric twin of 028's
  top fix),
  [[005-decision-vital-state-and-nav-boundaries]] (why the pushed screens are root-Stack
  siblings that cover the tab bar by placement — the layout fact that makes their clearance
  redundant)

Why `Screen`'s `paddingBottom` stopped reserving `layout.tabBarHeight` on most screens, and the
single rule that replaced the old per-path guesswork.

## The over-pad
`Screen.tsx` had `paddingBottom: insets.bottom + tabBarPad + space['2xl']`, with `tabBarPad =
layout.tabBarHeight` on every path except the iOS-tab-scroll one. That reserves tab-bar clearance
unconditionally — but the bar only overlaps the scroll content where it is a non-self-insetting
overlay/sibling the scene actually runs under. On this app's layout that is **nowhere** the
default assumed, so the reserved 64pt surfaced as an empty band at the end of every scroll:

- **iOS scrolling tab screens** — the native UITabBar content view controller auto-insets the
  ScrollView for bar + safe area (031 "Trap 1"). `tabBarPad` was already 0 here, but the path
  still added `insets.bottom + space['2xl']` (~58pt) on top of the native inset.
- **Non-tab screens** (`program/[id]`, `workout`, `routine/new`) — root-Stack siblings pushed
  OVER `(tabs)` (005); they cover the bar by placement, so no bar is present, yet 64pt was
  reserved below the last item.
- **`(auth)` screens** — rendered signed-out, no tab bar.

## The rule
Reserve manual clearance ONLY for `tabScreen` screens whose bar overlaps the content; drop the
redundant safe-area term wherever the native side already supplies it:

    const tabBarPad = onNativeTabScroll || !tabScreen ? 0 : layout.tabBarHeight;
    const designMarginOnly = onNativeTabScroll || (flushBottom && !onNativeTabBar);
    paddingBottom: designMarginOnly ? space['2xl'] : insets.bottom + tabBarPad + space['2xl'],

- `!tabScreen → 0`: non-tab + `(auth)` screens reserve nothing (no bar present).
- `onNativeTabScroll` now drives `designMarginOnly`, so iOS tab-scroll keeps ONLY `space['2xl']`
  — neither `tabBarHeight` nor `insets.bottom` (the native inset covers both). This is the bottom
  twin of the 028 top fix, which 025/028 had left half-done (`insets.bottom` was kept as
  "trailing scroll space" — it was a double-count, same as the dropped `insets.top`).
- Android/web scrolling tab screens are untouched (the custom `TabBar` is a relative-flow
  sibling; 032 documents that path as correct), so the change is iOS-bottom + non-tab only.

## The Settings coupling (load-bearing)
Settings is the one non-scroll tab whose bare View sits under the iOS native overlay (031 "Trap
2") and so genuinely needs the manual `tabBarHeight`. Before 033 it got it implicitly from the
`else` branch (every `tabScreen=false` screen did). Now that non-tab screens reserve nothing,
**Settings must pass `tabScreen`** to keep its iOS clearance — which is also semantically correct
(it IS a tab screen). Its resulting padding is byte-identical on every platform (iOS:
`insets.bottom + tabBarHeight + space['2xl']`; Android/web: `space['2xl']` via `flushBottom`).
This is the mechanism change that made 032's "Settings never passes `tabScreen`" note stale.

## Evidence / validation status
The trigger was a user report of a ~tab-bar-height gap on iOS and on non-tab screens. That the
symptom was a *gap* (overflow) rather than *clipping* on iOS tab screens is itself runtime
evidence the native bottom inset is FULL — which is what makes dropping `insets.bottom` there
safe (it still leaves a `space['2xl']` margin above the native-inset boundary). Still
UNCONFIRMED on-device (carried as the work unit's open question, lower-risk than 028's top
precondition for that reason): the exact post-fix clearance on an iOS build, and whether pushed
non-tab screens retain a small `insets.bottom` residual if the native-stack ScrollView also
bottom-auto-insets (acceptable; revisit only if observed).
