# 033 — Screen bottom edge: drop the redundant tab-bar / safe-area gap

## Status
Shipped (2026-06-23). Delivered via `minerva:propose-ship-quick` (main-model decisions; no
escalations). Implementation matched Approach A exactly — no divergence, no replan. Review
surfaced one finding (a stale intro comment in `Screen.tsx`), fixed in place. Durable learning
promoted to [[037-pattern-screen-bottom-clearance-model]]; the now-stale claims in
[[031-pattern-ios-native-tabs-liquid-glass]] "Trap 1" and
[[032-pattern-screen-flushbottom-tabbar-inset]] were corrected with reciprocal links.
**Open: on-device iOS confirmation of the post-fix bottom clearance (see Open Questions) — lower
risk than 028's top precondition because the reported gap already proves the native inset is full.**

## Goal
Remove the empty band (~tab-bar height) at the bottom of the scroll content on every
scrollable screen. Two distinct over-pads in `Screen.tsx`'s `paddingBottom` produce it:

1. **iOS scrolling tab screens** (Today / Programs / History) — the native `UITabBar` content
   view controller already insets the ScrollView for the bar + bottom safe area, yet `Screen`
   still adds `insets.bottom + space['2xl']` (~58pt) on top, leaving that as a trailing gap.
2. **Non-tab screens** (`program/[id]`, `workout`, `routine/new`) and the signed-out `(auth)`
   screens — these are root-`Stack` siblings pushed OVER `(tabs)` (or shown signed-out), so no
   tab bar is present, yet `Screen` reserves `layout.tabBarHeight` (64pt) below the last item.

## Why
`Screen.tsx`'s bottom padding was `insets.bottom + tabBarPad + space['2xl']`, where `tabBarPad`
was `layout.tabBarHeight` on every path except the iOS-tab-scroll one (which zeroed it, 025/028).
That reserves tab-bar clearance unconditionally — but the bar only overlaps the scroll content
where it is a non-self-insetting overlay/sibling the scene runs under. On this app's layout that
is **nowhere** the default expression assumed:

- iOS tab screens: the native UITabBar auto-insets the ScrollView (025 "Trap 1"), so the manual
  term is redundant. 025/028 dropped the `tabBarHeight` half but left `insets.bottom` — the
  native inset covers the safe area too, so `insets.bottom` double-counts (the bottom twin of
  the 028 top fix, which dropped the manual `insets.top` for the same reason).
- Pushed non-tab screens: root-`Stack` siblings of `(tabs)` (see `RootNavigator.tsx`,
  [[005-decision-vital-state-and-nav-boundaries]]) — they cover the tab bar by placement, so no
  bar exists on them; `tabBarHeight` is a pure ~64pt empty gap.
- `(auth)` screens: rendered in the signed-out tree, no tab bar.

The user reported a gap "about the height of the tab bar" on iOS and on non-tab screens; both
map to the terms above. The existence of a *gap* (overflow) rather than clipping on iOS tab
screens is itself runtime evidence that the native bottom inset is fully applied — which is what
makes dropping `insets.bottom` there safe (it still leaves a `space['2xl']` margin above the
native-inset boundary).

This is a pre-existing over-pad, present since the first `Screen` commit (#2) — not a regression.

## Approach
Reserve manual tab-bar clearance ONLY for `tabScreen` screens whose bar actually overlaps the
content, and drop the redundant safe-area term where the native side already supplies it.

In `src/components/Screen.tsx`:

    // tabBarHeight only for tab screens whose bar overlaps content (Android/web custom bar,
    // and the iOS non-scroll Settings tab under the native overlay); non-tab screens reserve 0.
    const tabBarPad = onNativeTabScroll || !tabScreen ? 0 : layout.tabBarHeight;
    // iOS tab-scroll (native inset covers bar + safe area) and Android/web flushBottom keep
    // only the design margin; everything else keeps insets.bottom + tabBarPad + margin.
    const designMarginOnly = onNativeTabScroll || (flushBottom && !onNativeTabBar);
    ...
    paddingBottom: designMarginOnly ? space['2xl'] : insets.bottom + tabBarPad + space['2xl'],

`(tabs)/settings.tsx` gains `tabScreen` — it IS a tab screen, and now that non-tab screens
reserve no clearance, `tabScreen` is what keeps Settings' iOS-overlay clearance (it is the one
non-scroll tab whose bare View sits under the native overlay, 031 "Trap 2"). Settings' resulting
padding is byte-identical to before on every platform.

### Considered, rejected
- **B — new `noTabBar` prop threaded to all 7 pushed-screen call sites.** More churn, more
  surface; the existing `tabScreen` prop already carries exactly the distinction needed.
- **C — flip the global default; Android/web tab screens opt back in.** Changes the Android/web
  tab path that [[032-pattern-screen-flushbottom-tabbar-inset]] documents as "fine", untested,
  for no benefit on the reported platforms.

## Success criteria
1. iOS scrolling tab screens (`index`, `programs`, `history`): `paddingBottom` is `space['2xl']`
   only (no `insets.bottom`, no `tabBarHeight`).
2. Non-tab screens (`program/[id]`, `workout`, `routine/new`) and `(auth)` screens:
   `paddingBottom` drops `tabBarHeight` → `insets.bottom + space['2xl']`.
3. Settings padding is unchanged on all platforms (iOS keeps `insets.bottom + tabBarHeight +
   space['2xl']`; Android/web keeps `space['2xl']` via `flushBottom`).
4. Android/web scrolling tab screens are unchanged (`insets.bottom + tabBarHeight + space['2xl']`).
5. `npm run lint` clean; no NEW `tsc` errors vs. baseline (the two pre-existing `/routine/new`
   typegen errors are unrelated and present on a clean tree).

## Open Questions
- Post-merge visual confirmation on an iOS build that the iOS tab-scroll bottom now sits a
  comfortable margin above the bar (analogous to 028's on-device precondition; lower risk here
  because the reported gap already proves the native inset is full). Pushed non-tab screens may
  retain a smaller `insets.bottom` residual if the native-stack ScrollView also auto-insets the
  bottom — acceptable; revisit only if observed.
