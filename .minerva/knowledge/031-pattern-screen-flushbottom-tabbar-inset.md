# Pattern: Screen flushBottom — bottom-pinned content vs the relative-flow tab bar

- Type: pattern
- Date: 2026-06-10
- Work unit: 027-settings-pin-center
- Related: [[027-pattern-native-stack-headers-pushed-screens]] (the sibling `hasHeader`
  inset-propagation opt-in on the same `Screen` component — same default-false discipline),
  [[005-decision-vital-state-and-nav-boundaries]] (tabs vs top-level routes — why the tab
  bar is a relative-flow sibling of the scene in the first place)

Why `Screen` grew a third opt-in padding prop, and the layout fact that makes it correct.

## The double-count
The custom tab bar (`TabBar.tsx`) is handed to expo-router's `Tabs` via the `tabBar` prop
with NO `position:'absolute'`, so React Navigation lays it out as a normal-flow sibling
BELOW the scene container. The scene therefore already ends at the bar's top edge, and the
bar's own View reserves the home-indicator inset (`height: tabBarHeight + insets.bottom`,
`paddingBottom: insets.bottom`). `Screen`'s default
`paddingBottom: insets.bottom + tabBarHeight + space['2xl']` is fine as trailing SCROLL
space, but for a child PINNED to the scene's bottom (a `flex:1` spacer or centered region
above a button) it double-counts `insets.bottom + tabBarHeight` — the button floats
~`tabBarHeight + inset` above the bar. This bit the Settings "Sign out" button (023 → 027).

## flushBottom
`Screen` gained `flushBottom?: boolean` (default false) alongside `hasHeader`/`center`: when
true, `paddingBottom = space['2xl']` only. Settings passes `scroll={false} flushBottom` and
lays out title / `flex:1` centered profile / Sign out — the button now sits one design
margin above the bar. The `false` branch keeps the same padding expression as before, so no
other `Screen` consumer moves (the prop is opt-in and only Settings passes it). Written as an
inline ternary in the `pad` object to stay clear of `local/single-declaration`, matching how
`hasHeader`/`center` are expressed.

## The coupling (the non-derivable caveat)
flushBottom is SAFE ONLY while the tab bar stays relative-flow. If the bar is ever made
`position:'absolute'` (e.g. a floating / liquid-glass tab bar — there is an unmerged
`025-ios-liquid-glass-tabs` branch that would do exactly this), content slides UNDER it and
flushBottom screens lose their home-indicator clearance — at which point flushBottom screens
must restore an inset. The in-code comment on the ternary flags this; honor it before
floating the bar.
