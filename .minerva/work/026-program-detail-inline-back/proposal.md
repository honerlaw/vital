# 026 — Program-detail inline back (drop the blank native header)

## Status
Implemented (2026-06-10) — review + promote complete; PR pending (`minerva:ship` flips this to
Shipped on merge). Delivered via `minerva:propose-ship-auto` consensus panels (approach selection
2/3 after one revision round; completion verification 3/3). Durable learning: [[027-pattern-native-stack-headers-pushed-screens]]
amended (program/[id] now uses an inline BackButton; workout retains the native Cancel header).

## Goal
Remove the blank, chrome-only native navigation bar at the top of the Program-detail screen
(`src/app/program/[id].tsx`) — today an empty white shadowless header (`headerTitle: ''`, only a
back chevron) that adds a native nav-bar row above the status-bar inset the tab screens already
carry. Replace it with an inline ink back chevron so the detail screen's top rhythm matches the
tab screens, while keeping a discoverable, accessible back affordance in every render state
(loading, not-found, ready). `workout` is explicitly out of scope — its header is functional
(it holds the Cancel button, the screen's only guaranteed exit per [[027-pattern-native-stack-headers-pushed-screens]]).

## Why
Work 021 ([[027-pattern-native-stack-headers-pushed-screens]]) deliberately gave the pushed
screens "chrome-only hybrid headers": an empty native bar carrying only a back chevron, with the
large title kept inline in screen content. On `program/[id]` that bar reads as wasted vertical
space — a white nav row that does nothing but show a chevron, sitting above the safe-area inset
the tab screens already consume. The user flagged it directly ("a top nav bar which we don't use
for anything"). `workout`'s bar looks similar but is load-bearing — its `headerLeft` is the
Cancel button — so only `program/[id]` is genuinely blank and in scope.

## Approach
1. **Drop the native header on `program/[id]` only** (`src/auth/RootNavigator.tsx`): remove
   `options={pushedHeaderOptions}` from the `program/[id]` `<Stack.Screen>` so it inherits the
   Stack's default `screenOptions={{ headerShown: false }}`. The shared `pushedHeaderOptions`
   const and the `workout` entry (which spreads it plus the static `headerBackVisible: false` /
   `gestureEnabled: false` exit-lock) are untouched.
2. **New `src/components/BackButton.tsx`** — one default-exported component (clears
   `local/single-declaration` + `react/no-multi-comp`; see
   [[003-pattern-conforming-code-under-strict-guardrails]]). A `TouchableOpacity` rendering a
   Feather `chevron-left` glyph in `colors.ink` (matching 027's chrome chevron; **not** the
   muted `backLink` type variant), `accessibilityRole="button"`, `accessibilityLabel="Back"`,
   no visible back text (preserves 021's minimal no-back-text UX). Its `onPress` guards for the
   cold deep-link case: **`router.canGoBack() ? router.back() : router.replace('/')`** so the
   affordance always lands somewhere — the native chevron auto-hid when there was no back entry,
   so an unguarded `router.back()` would be a dead tap on a first-route deep link
   (`router.canGoBack()` is exported and mount-safe in expo-router 56; `/` is the established
   fallback already used at `program/[id].tsx`'s `onChoose` and `workout.tsx`'s finish).
3. **Render the back affordance in all three `program/[id]` branches** (`src/app/program/[id].tsx`):
   add `<BackButton />` as the first child of the ready `<Screen>` body and the not-found
   `<Screen>`, and via `CatalogStatus` for the loading branch (step 4). Drop `hasHeader` from the
   two `<Screen>` usages so they use the default `insets.top + layout.screenPaddingTop`
   (`Screen.tsx`) — the tab-screen rhythm, correct now that no native bar consumes the top inset.
4. **`CatalogStatus` gains an optional `back?: boolean`** (`src/components/CatalogStatus.tsx`):
   when set it renders the self-routing `<BackButton />` above its content. (Shipped as a boolean
   flag rather than the originally-drafted `onBack?: () => void` callback — since `BackButton`
   owns its own routing + cold-deep-link guard, a flag gives the loading branch the same guard for
   free with no duplicated handler.) `program/[id]`'s loading-branch call passes `back` and **drops
   `hasHeader`** (avoiding the inset double-count 027 §"hasHeader inset propagation" warns about).
   The `workout` and `(tabs)/_layout` call sites pass no `back` (it defaults `false`) and keep
   their existing args — unchanged.
5. **`workout` untouched** — native Cancel header + four-piece guaranteed-exit recipe (027) intact.

### Candidate approaches considered (approach panel, 2 rounds)
- **(A) Fill the native header title** with the program name. Rejected: doesn't reclaim the blank
  space (the actual complaint), and 027 deliberately avoided native titles (they can't reproduce
  the JetBrains-Mono-eyebrow-over-Archivo-title composition).
- **(B) `headerTransparent: true`, float the chevron over content.** Rejected: the header
  background is already `colors.bg` (white) and shadowless, so a transparent header is visually
  identical to today and reclaims nothing — content must still clear the floating chevron.
- **(C) Drop the bar, inline ink back chevron in every branch (recommended).** The only option
  that removes the blank bar while keeping a discoverable cross-platform back affordance.

Honest framing: this replaces a fixed empty native bar with a tighter inline back row; the detail
screen's top rhythm now matches the tab screens — not a literal "44px reclaim" (dropping
`hasHeader` re-adds the safe-area inset the header used to absorb, and the inline row has height).

## Success criteria
1. `program/[id]` shows **no native header bar** in any state (loading, not-found, ready).
2. A discoverable, accessible back affordance (Feather `chevron-left`, `colors.ink`,
   `accessibilityRole="button"`, `accessibilityLabel="Back"`) appears at the top of all three
   states and navigates back; on a cold deep-link (no back entry) it lands on `/` rather than
   dead-tapping.
3. `program/[id]`'s top spacing equals the tab screens' (`insets.top + screenPaddingTop`); the
   loading branch no longer passes `hasHeader`, so there is no inset double-count.
4. iOS interactive swipe-back and Android hardware/system back still pop from `program/[id]`.
5. `workout` is unchanged — Cancel header + guaranteed-exit recipe intact; `(tabs)/_layout`'s
   `CatalogStatus` gate unchanged.
6. `npm run lint` (`--max-warnings 0`), `tsc --noEmit`, and unit tests pass; web export bundles
   all routes.

## Open Questions
- None blocking. The cold-deep-link back behavior (fall back to `/` vs hide the chevron) was
  resolved by the approach panel to **fall back to `/`** (the affordance always works).
- Promote will need to amend [[027-pattern-native-stack-headers-pushed-screens]]: `program/[id]`
  now uses an inline back affordance while `workout` retains the native Cancel header.
