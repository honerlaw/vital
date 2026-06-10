# 025 — iOS Liquid Glass tab bar via NativeTabs, behind a platform abstraction

## Status
Draft

## Goal
On iOS, render the bottom tab bar through expo-router's `NativeTabs`
(`expo-router/unstable-native-tabs`) — a real `UITabBar` that automatically adopts Apple's
Liquid Glass appearance on iOS 26 (and falls back to the standard opaque bar on older iOS).
Do it behind a Metro platform-extension abstraction so the nav chrome varies per platform
cleanly. Android and web keep today's custom JS tab bar unchanged.

## Why
The current tab bar is a fully custom React Native `<View>` (`src/components/TabBar.tsx`)
passed to expo-router `Tabs` via the `tabBar` prop. A hand-drawn view can never get the
system Liquid Glass *material* or its iOS 26 behaviors — scroll-edge transparency,
minimize-on-scroll, the true material morph — because those are properties of the native
`UITabBar` control, not a backdrop you can paint. The only way to get genuine Apple glass on
the tab bar is to hand the bar to UIKit, which `NativeTabs` does.

The product owner explicitly chose **real system glass on iOS** over preserving the bespoke
iOS bar (see Approach), accepting that iOS chrome becomes system-native (SF Symbols + system
labels, brand accent carried as `tintColor`) and diverges from the Android/web custom bar.

## Approach
A platform-resolved `AppTabs` component using Metro's `.ios.tsx`/default file resolution —
the idiomatic Expo seam for per-platform nav. Callers stay platform-agnostic; the resolver
picks the file.

- **NEW `src/components/AppTabs.ios.tsx`** — `import { NativeTabs } from 'expo-router/unstable-native-tabs'`.
  `<NativeTabs tintColor={colors.accent}>` with one `<NativeTabs.Trigger name=...>` per route in
  the existing order (`index`, `programs`, `history`, `settings`), each containing child
  elements `<NativeTabs.Trigger.Icon sf={{ default, selected }}>` and
  `<NativeTabs.Trigger.Label>`. SF Symbol mapping (default/selected):
  - `index` → Today → `house` / `house.fill`
  - `programs` → Programs → `list.bullet`
  - `history` → History → `clock` / `clock.fill`
  - `settings` → Settings → `gearshape` / `gearshape.fill`

  SF-symbol and label maps are plain **data consts** at module scope (exempt from
  `local/single-declaration`, which counts only function/class/component declarators —
  see [[002-pattern-eslint-strict-config-gotchas]]). `AppTabs` is the file's sole declared
  component. NativeTabs renders no header and needs no nested `<Stack>` — the leaf tab
  screens render their own in-content titles directly under each `Trigger`, exactly as today.

- **NEW `src/components/AppTabs.tsx`** (default → Android + web) — the **current**
  `<Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>`
  block with its four `<Tabs.Screen>` children, moved **verbatim** out of the layout. The
  inline `tabBar` arrow stays inline inside the JSX prop: per
  [[027-pattern-native-stack-headers-pushed-screens]] an inline arrow in a JSX prop is not a
  top-level component and clears `react/no-multi-comp` (`ignoreStateless: false`),
  `local/single-declaration`, and `noInlineConfig`. The current `_layout.tsx` already ships
  this exact structure under the same lint config; the move carries no new lint risk.
  `AppTabs` is the file's sole declared component.

- **EDIT `src/app/(tabs)/_layout.tsx`** — keep the existing boot render-gate (early-return
  `<CatalogStatus .../>` until `bootStatus(state) === 'ready'`; the SSR path depends on this),
  then render `<AppTabs />` unconditionally in place of the inline `<Tabs>`. The
  `useAppStore()` hook stays above the early return.

- **EDIT `src/components/Screen.tsx`** — add `tabScreen?: boolean` (default `false`). Drop the
  manual `layout.tabBarHeight` term from `paddingBottom` **only when
  `tabScreen && process.env.EXPO_OS === 'ios' && scroll`** — i.e. only the scroll path on
  iOS, where the native `UITabBar` supplies automatic content-inset for the first ScrollView.
  Non-scroll tab screens (Settings, `scroll={false}` over a bare `View` → no native
  auto-inset) **keep** the manual padding so the bottom-pinned Sign-out is not clipped.
  The three scrolling tab screens — `index.tsx` (BOTH the program-chooser and session
  branches), `programs.tsx`, `history.tsx` — pass `tabScreen`. Settings does not need it
  (kept on the manual path). All non-tab `Screen` consumers — `workout.tsx`,
  `program/[id].tsx`, the three `(auth)` screens, and `CatalogStatus` — default `tabScreen`
  to `false` → byte-for-byte identical math on every platform.

Top-level placement (`workout`, `program/[id]` as root-Stack siblings of `(tabs)`,
[[005-decision-vital-state-and-nav-boundaries]]) and the pushed-screen native Stack headers
([[027-pattern-native-stack-headers-pushed-screens]]) are **untouched** — pushing those
routes still covers the native tab bar by route placement, no visibility toggling needed.

## Success criteria
1. **iOS** renders the tab bar via `NativeTabs` (real `UITabBar`): all four tabs present in
   order (Today / Programs / History / Settings) with SF Symbol icons and active tint =
   `colors.accent` (`#0D8348`); navigation works and the active tab reflects the route.
   Liquid Glass appears on an iOS 26 build; on older iOS the standard opaque bar renders
   (graceful fallback) — verified on a simulator, or the fallback explicitly noted if an
   iOS 26 simulator is unavailable.
2. **Web + Android** tab bar is unchanged from today (custom JS `TabBar` via `AppTabs.tsx`);
   the web SSR boot-gate path still renders `CatalogStatus` until ready, then the custom bar.
3. Tab-bar platform variation lives **only** in `AppTabs.ios.tsx` vs `AppTabs.tsx`; no
   scattered platform conditionals in the layout or screens.
4. iOS tab-screen spacing is correct for **both** the scrolling tab screens (no ~64pt
   double-gap above the bar) **and** the non-scroll Settings tab (Sign-out not clipped). The
   five non-tab `Screen` consumers + `CatalogStatus` are byte-for-byte unchanged on all
   platforms.
5. `npm run lint` (`--max-warnings 0`), `tsc`, and the existing `node --test` unit tests all
   pass.

## Open Questions
- **iOS 26 SDK build target** — Liquid Glass renders only when the app is built against the
  iOS 26 SDK (Xcode 26). If the local/EAS build image is older, `NativeTabs` renders the
  opaque legacy bar (acceptable fallback; the code is correct either way). Confirm during the
  work/verify phase which the available simulator exercises.
- **Native auto-inset assumption** — the spacing fix assumes the native `UITabBar`
  auto-insets a tab screen's first ScrollView on iOS so the manual `tabBarHeight` term is
  redundant. This is validated only on-device/simulator (already required by criterion 4). If
  it does not hold, the fallback is to keep manual padding and set `disableAutomaticContentInsets`.
- **Brand retention inside NativeTabs** — optionally push the JetBrains-mono label font via
  `NativeTabs` `labelStyle.fontFamily`; not a success criterion (custom fonts may not render
  on native UIKit tab labels). Attempt opportunistically during work.

## Out of scope (deferred)
- **Header Liquid Glass** (the "/ etc" in the ask) — the pushed-screen native headers use a
  deliberate inline-large-title white-bar design ([[027-pattern-native-stack-headers-pushed-screens]]);
  making them glass is a separate design decision that fights that language. Not done here.
- **Android Material 3 NativeTabs** — Android keeps the custom bar (no glass payoff on
  Android). The `.ios.tsx`/default split makes flipping Android to NativeTabs trivial later.
- **`minimizeBehavior` tuning** — leave the iOS 26 default (`automatic`) for v1.
