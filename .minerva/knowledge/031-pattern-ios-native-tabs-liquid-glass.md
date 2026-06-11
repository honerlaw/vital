# Pattern: iOS Liquid Glass tab bar via NativeTabs, behind a platform abstraction

- Type: pattern
- Date: 2026-06-10
- Work unit: 025-ios-liquid-glass-tabs
- Related: [[005-decision-vital-state-and-nav-boundaries]] (the in-progress workout / program
  detail are root-Stack siblings of `(tabs)` and still cover the native tab bar by placement —
  untouched here),
  [[027-pattern-native-stack-headers-pushed-screens]] (its v56-fragility mandate is why the
  NativeTabs API below was pinned against the installed package; the inline-arrow lint pattern
  it documents is what lets the moved `tabBar` arrow stay inline),
  [[002-pattern-eslint-strict-config-gotchas]] (the data-const exemption the `TABS` map relies
  on — `local/single-declaration` counts only function/class/component declarators),
  [[016-pattern-ssr-safe-startup-hydration-gate]] (the boot render-gate `(tabs)/_layout` keeps
  above `<AppTabs/>`, so SSR is unaffected by the swap)

How work 025 gave iOS the real Apple Liquid Glass tab bar. The file layout and option names are
readable from `components/AppTabs(.ios).tsx` and `components/Screen.tsx`; this entry preserves
the decisions, the v56 API pin, and the two non-obvious traps.

## The seam: a Metro platform fork, custom bar everywhere else
The tab navigator was lifted out of `(tabs)/_layout.tsx` into a platform-resolved `AppTabs`
component: `AppTabs.ios.tsx` (NativeTabs) vs `AppTabs.tsx` (the pre-025 custom `Tabs`+`TabBar`
body, moved verbatim — the default for Android **and web**). `_layout` keeps its boot
render-gate and just renders `<AppTabs/>`, staying platform-agnostic. **Why not NativeTabs
everywhere:** web NativeTabs is unstable and the app ships web with SSR (the gate at
[[016]]); Android NativeTabs would mean Material 3, discarding the brand bar for zero glass
payoff. So the native bar is confined to iOS, exactly where the glass lives. The `.ios.tsx`/
default split makes a future Android flip trivial.

## Liquid Glass is a property of the native UITabBar, not a backdrop
NativeTabs adopts Apple Liquid Glass **automatically** on an iOS 26 build (no code branch) and
falls back to the standard opaque bar on older iOS. This is the load-bearing reason a
`GlassView`/`expo-glass-effect` veneer under the old custom `<View>` bar was rejected: a
backdrop cannot produce the system scroll-edge transparency, minimize-on-scroll, or material
morph — those are behaviors of the UIKit control. The product owner chose the system bar over
the bespoke iOS chrome (accent-dot indicator, JetBrains-mono labels, Feather icons); the brand
green survives only as `tintColor`. That divergence between iOS and Android/web is the
intended, irreducible cost of asking for the system glass.

## v56 NativeTabs API (pinned, per [[027]]'s fragility mandate)
`import { NativeTabs } from 'expo-router/unstable-native-tabs'` (expo-router 56.2.8). The
subpath is `unstable-` — treat the surface as movable across SDK bumps and re-pin on upgrade.
SDK 56 uses the **compound** element form `NativeTabs.Trigger.Icon` / `NativeTabs.Trigger.Label`
(NOT the SDK-54 standalone `Icon`/`Label` imports); `Icon sf={{ default, selected }}` (a glyph
with no `.fill` variant, e.g. `list.bullet`, simply repeats the name); `tintColor` lives on the
`NativeTabs` host; `Trigger name` must match the route name under `(tabs)`.

## Trap 1 — the shared Screen safe-area padding double-counts under the native bar (BOTH edges)
`Screen.tsx` (used by ALL screens, tab and non-tab) hard-coded `layout.tabBarHeight` into its
bottom padding and adds `insets.top` to its top padding, because the old custom bar was not a
real safe-area consumer. The native UITabBar's content view controller **is** one and auto-insets
a tab screen's first ScrollView for the safe area — so any manual safe-area term we also add on
that path double-counts. The fix gates on `tabScreen && process.env.EXPO_OS === 'ios' && scroll`
(named `onNativeTabScroll`); only the three scrolling tab screens opt in (`index` in both its
branches, `programs`, `history`).

**A safe-area double-count has TWO axes, and 025 fixed only one.** Work 025 dropped the manual
`tabBarHeight` on the BOTTOM but left `insets.top` on the top. The top term survived as a
~`insets.top` (≈47–59pt) empty band above all three scrolling iOS tab screens until work **028**
applied the symmetric top fix: `paddingTop: hasHeader || onNativeTabScroll ? screenPaddingTop :
insets.top + screenPaddingTop` — i.e. when a native consumer already supplies the top inset (a
stack header via `hasHeader`, or now the native tab content-inset), keep only the 8pt design
margin. **Lesson: when a native consumer takes over insets, audit TOP and BOTTOM in the same
change — a one-sided fix leaves the mirror-image bug latent (here, ~7 months).** Note the bottom
deliberately still keeps `insets.bottom + space['2xl']` as trailing scroll space; only the
redundant `tabBarHeight`/`insets.top` terms were dropped.

**Validation status (updated by 028):** 025 originally flagged the auto-inset as "not yet validated
on a real iOS 26 device." The 028 top-whitespace report now *confirms a native top inset is
applied* — the band is precisely the native top inset summed with the manual `insets.top`, so the
inset demonstrably exists. What is still UNCONFIRMED on-device is whether that inset is FULL or only
PARTIAL: if partial, dropping `insets.top` to an 8pt margin could let content sit too close to the
notch / Dynamic Island. So notch/Dynamic-Island *clearance* (not just "band gone") on BOTH UITabBar
generations — iOS 26 Liquid Glass and the older opaque fallback — remains a merge precondition for
028. If that check shows a partial inset, the fallback is approach B: set
`disableAutomaticContentInsets` on the triggers and own the padding manually — that fallback is the
non-derivable kernel; the conditional itself is in the code.

## Trap 2 — non-scroll tab screens get NO native auto-inset
The Settings tab is `<Screen scroll={false}>` (a bare `View`, with a flex spacer pinning
Sign-out to the bottom). The native auto-inset only applies to a ScrollView, so a bare View
gets nothing — dropping `tabBarHeight` there would let the bar clip Sign-out. Hence the `&&
scroll` clause: non-scroll tab screens deliberately KEEP the manual padding. Every non-tab
`Screen` consumer (workout, program/[id], the auth screens, CatalogStatus) keeps the default
`tabScreen=false` and is byte-for-byte unchanged.
