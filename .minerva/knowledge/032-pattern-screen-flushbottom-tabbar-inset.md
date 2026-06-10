# Pattern: Screen flushBottom — bottom-pinned content vs the relative-flow tab bar

- Type: pattern
- Date: 2026-06-10
- Work unit: 027-settings-pin-center
- Related: [[027-pattern-native-stack-headers-pushed-screens]] (the sibling `hasHeader`
  inset-propagation opt-in on the same `Screen` component — same default-false discipline),
  [[005-decision-vital-state-and-nav-boundaries]] (tabs vs top-level routes — why the tab
  bar is a relative-flow sibling of the scene in the first place)

Why `Screen` grew a third opt-in padding prop, and the layout fact that makes it correct.

## The double-count (Android + web)
On Android + web the tab bar is the custom `TabBar.tsx`, handed to expo-router's `Tabs` via
the `tabBar` prop with NO `position:'absolute'`, so React Navigation lays it out as a
normal-flow sibling BELOW the scene container. The scene therefore already ends at the bar's
top edge, and the bar's own View reserves the home-indicator inset
(`height: tabBarHeight + insets.bottom`, `paddingBottom: insets.bottom`). `Screen`'s default
`paddingBottom: insets.bottom + tabBarHeight + space['2xl']` is fine as trailing SCROLL
space, but for a child PINNED to the scene's bottom (a `flex:1` spacer or centered region
above a button) it double-counts `insets.bottom + tabBarHeight` — the button floats
~`tabBarHeight + inset` above the bar. This bit the Settings "Sign out" button (023 → 027).

## flushBottom (platform-gated)
`Screen` gained `flushBottom?: boolean` (default false) alongside `hasHeader`/`center`: when
true AND the bar is relative-flow, `paddingBottom = space['2xl']` only. Settings passes
`scroll={false} flushBottom` and lays out title / `flex:1` centered profile / Sign out — the
button now sits one design margin above the bar on Android + web. The flush branch is gated
`flushBottom && !onNativeTabBar` (`onNativeTabBar = process.env.EXPO_OS === 'ios'`); the
default/else branch keeps the same padding expression as before, so no other `Screen`
consumer moves (the prop is opt-in and only Settings passes it). Written as an inline ternary
in the `pad` object to stay clear of `local/single-declaration`, matching how
`hasHeader`/`center` are expressed.

## The coupling (resolved: iOS native overlay bar, 025/031)
flushBottom is SAFE ONLY where the tab bar is relative-flow. The caveat this entry originally
flagged — "if the bar is ever made a floating / overlay bar, flushBottom screens must restore
an inset" — has since come true: work 025 ([[031-pattern-ios-native-tabs-liquid-glass]])
made the iOS tab bar the native `UITabBar` (Liquid Glass) OVERLAY, where content runs under
the bar and a non-scroll screen gets no native auto-inset. So flushBottom is now gated OFF on
iOS (`!onNativeTabBar`): the iOS path falls through to `insets.bottom + tabBarPad + space['2xl']`,
restoring the clearance and staying byte-identical to the default. The inset is restored, not
dropped — exactly as the original caveat demanded.

Mechanically, Settings is protected on iOS by TWO independent facts, neither of which is the
`tabScreen` auto-inset path (Settings never passes `tabScreen`): on the flush branch by
`!onNativeTabBar`, and on the else branch by `scroll === false` (the `tabScreen && … && scroll`
gate that zeroes `tabBarPad` requires `scroll`, so a non-scroll screen keeps the full
`tabBarHeight` term regardless). Both routes land on the full safe padding that clears the
overlay.
