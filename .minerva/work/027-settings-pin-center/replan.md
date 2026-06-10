# 027 — settings-pin-center · replan log

## 2026-06-10 — flushBottom must restore the inset on iOS (025 native tab bar landed on main)

### Original plan
`Screen.flushBottom` (default false) collapses `paddingBottom` to `space['2xl']` (24px) so a
bottom-pinned child (Settings' "Sign out") sits one design margin above the tab bar. The
premise was that the tab bar is the custom `TabBar.tsx` — a RELATIVE-FLOW sibling laid out
below the scene, so the scene already ends at the bar's top and the default
`insets.bottom + tabBarHeight` term double-counts. The work unit's own knowledge entry
flagged the coupling explicitly: flushBottom is safe ONLY while the bar stays relative-flow;
if it ever becomes a floating / overlay bar, flushBottom screens "must restore an inset."

### What changed
PR #32 (`025-ios-liquid-glass-tabs`) merged to `main` while this PR (#33) was still open. On
iOS the tab bar is now the native `UITabBar` / Liquid Glass via
`expo-router/unstable-native-tabs` (`AppTabs.ios.tsx`) — an OVERLAY: content runs under it,
and a NON-scroll screen (Settings is `scroll={false}`) gets no native auto-inset. Android +
web keep the custom relative-flow `TabBar.tsx`. The exact precondition the knowledge caveat
predicted has occurred. A mechanical merge keeping unconditional `flushBottom ? space['2xl']`
would place Settings' Sign out 24px from the true screen bottom on iOS — BEHIND the native
overlay bar. A 3/3 consensus panel confirmed this is a load-bearing divergence.

### New plan
Gate flushBottom on the relative-flow platforms only, reusing main's existing
`process.env.EXPO_OS === 'ios'` signal (the same one main's `tabBarPad` already uses):

```ts
const onNativeTabBar = process.env.EXPO_OS === 'ios';
const tabBarPad = tabScreen && onNativeTabBar && scroll ? 0 : layout.tabBarHeight;
paddingBottom: flushBottom && !onNativeTabBar
  ? space['2xl']
  : insets.bottom + tabBarPad + space['2xl'],
```

- **iOS:** `flushBottom` is a no-op → Settings keeps `insets.bottom + tabBarHeight + space['2xl']`,
  BYTE-IDENTICAL to current main (clears the overlay bar). This is the "restore an inset" the
  caveat mandated.
- **Android + web:** relative-flow bar → flushBottom still collapses to `space['2xl']` (the
  original 027 double-count fix, still valid).
- The `settings.tsx` restructuring (title / `flex:1` centered profile / Sign out) is
  platform-agnostic and applies everywhere — an unconditional improvement over the old
  top-anchored profile + spacer.
- The `Screen` `Props` interface keeps BOTH `flushBottom?` (027) and `tabScreen?` (025); the
  conflict resolution is a union of the two opt-ins, not a replacement.

### Success-criteria amendment
Criterion #1 ("Sign out ~24px above the tab bar") is now met on **Android + web only**. On iOS
Sign out clears the native overlay bar with the full safe inset (≈ `tabBarHeight + inset +
24px` above the screen bottom); 24px is unachievable on a bare iOS View under the overlay
without losing clearance, so the larger, safe padding is the deliberate, correct iOS behavior
and iOS Settings padding is unchanged from main. The `flushBottom` code comment, the
`settings.tsx` header comment, and the knowledge entry were updated to describe the platform
gate (replacing the now-resolved "unmerged 025 branch" caveat with the shipped reality).

### Knowledge record
The work unit's durable entry collided with main's #32 entry (both numbered `031`): it was
renumbered `031-pattern-screen-flushbottom-tabbar-inset` →
`032-pattern-screen-flushbottom-tabbar-inset`, with cross-references in
`005-decision-vital-state-and-nav-boundaries`,
`027-pattern-native-stack-headers-pushed-screens`, `proposal.md`, and `scratchpad.md`
updated, and reciprocal `## Related` links kept to BOTH `031-pattern-ios-native-tabs-liquid-glass`
(025) and the renumbered `032`.
