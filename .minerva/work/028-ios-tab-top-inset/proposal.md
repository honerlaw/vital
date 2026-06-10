# 028 — iOS tab screens: drop the double-counted top safe-area inset

## Status
Shipped (2026-06-10). Delivered via `minerva:propose-ship-auto` consensus panels (approach,
whole-proposal, completion, and promote-partition panels all reached consensus; scope and review
triage resolved via the skip predicate — see `scratchpad.md` archive). Implementation matched
Approach A exactly (no divergence, no replan). Durable learning folded into
[[031-pattern-ios-native-tabs-liquid-glass]] "Trap 1" — now covering BOTH safe-area axes, with the
both-axes lesson and the updated validation status. **On-device notch-clearance verification on
both UITabBar generations (iOS 26 Liquid Glass + older opaque) remains a hard merge precondition;
if the native top inset is partial, fall back to Approach B (see below).**

## Goal
Remove the large empty band (~47–59pt, the notch / Dynamic Island height) above the
content of the three scrolling iOS tab screens — Today, Programs, History. Achieved by
dropping the manually-added top safe-area inset on the iOS native-tab scroll path, where the
native tab bar's content view controller already applies a top content-inset to the ScrollView.

## Why
Work 025 ([[031-pattern-ios-native-tabs-liquid-glass]]) moved the iOS tab bar to the native
`UITabBar` (NativeTabs). The native tab content view controller hosts each tab's first
ScrollView with the default `contentInsetAdjustmentBehavior`, which applies a content-inset
for the safe area. Work 025 acted on the BOTTOM half of this (031 "Trap 1"): on the gate
`tabScreen && process.env.EXPO_OS === 'ios' && scroll` it dropped the manual
`layout.tabBarHeight` from `Screen`'s `paddingBottom`, because the native bar already insets
the bottom. But `Screen`'s `paddingTop` still adds `insets.top` manually for every
non-headered screen (`src/components/Screen.tsx:33`):

    paddingTop: hasHeader ? layout.screenPaddingTop : insets.top + layout.screenPaddingTop

The native content-inset also covers the TOP safe area, so on iOS scrolling tab screens the
top safe-area inset is applied twice — once by the native content-inset, once by this manual
`insets.top` — producing the empty band (its height ≈ `insets.top`, ~47–59pt on a notched
device). The symptom appears on exactly the three ScrollView tab screens (`index` in both its
branches, `programs`, `history` — all `<Screen tabScreen>`); Settings (`scroll={false}`, a
bare View with no native auto-inset) is correctly unaffected, matching the observed report.

This is the precise top-side twin of the bottom fix 025 already shipped. The band is also the
on-device manifestation 031 "Trap 1" was waiting for: it confirms the native content-inset is
real. The remaining open question is its exact top extent (full vs partial), addressed in the
verification precondition below.

## Approach
Mirror the proven 025 bottom fix and the existing `hasHeader` precedent (021): when a native
consumer has already supplied the top safe-area inset — a stack header (`hasHeader`) or, now,
the native tab content-inset — the screen keeps only the `screenPaddingTop` design margin and
must NOT add `insets.top` again.

In `src/components/Screen.tsx`, factor the existing inline gate into a named local and reuse
it for the top:

    const onNativeTabBar = process.env.EXPO_OS === 'ios';
    const onNativeTabScroll = tabScreen && onNativeTabBar && scroll;
    const tabBarPad = onNativeTabScroll ? 0 : layout.tabBarHeight;
    ...
    paddingTop:
      hasHeader || onNativeTabScroll ? layout.screenPaddingTop : insets.top + layout.screenPaddingTop,

`onNativeTabScroll` is exactly the gate already inlined in `tabBarPad`, so `paddingBottom`
stays byte-identical (no bottom behavior change). Only `paddingTop`'s else-branch changes, and
only on the iOS tab scroll path. Every other consumer is byte-identical: non-scroll Settings
(`scroll` false), headered screens (`hasHeader` already kept only the design pad), all non-tab
screens (`tabScreen` default false), and Android + web (`onNativeTabBar` false → falls to
`insets.top + screenPaddingTop`, unchanged).

The own-line comments are updated to state the mechanism **accurately**: the native tab content
VC supplies the top safe-area inset on the scroll path, the symmetric counterpart to the bottom
term 025 dropped. The comment must NOT claim the native inset replaces every manual safe-area
term — the bottom path deliberately keeps `insets.bottom` (the native bottom inset clears the
bar; `insets.bottom + space['2xl']` remains as trailing scroll space, unchanged here).

Approaches considered:
- **A (chosen): drop the manual `insets.top` on the iOS tab scroll path.** Minimal; mirrors the
  shipped 025 bottom fix and the `hasHeader` precedent; one expression, one path; every other
  path byte-identical; reversible (one revert if device verification falsifies it).
- **B: disable the native auto content-inset** (`disableAutomaticContentInsets` on the
  NativeTabs triggers, or `contentInsetAdjustmentBehavior="never"` on the ScrollView) and own
  all padding manually — which also reverts the 025 bottom fix. This is the fallback 031 "Trap
  1" named for IF the native auto-inset proved FALSE. The band is evidence it is TRUE, so B
  would tear out working native behavior for no benefit. **B is retained as the named fallback**
  if the on-device verification below shows the native top inset is absent or only partial.
- **C: keep manual `insets.top`, cancel it with a negative margin / contentInset override.**
  Fights the platform, adds a magic number to keep in sync; rejected.

A is strictly dominant given the band confirms the native inset and A is the smallest reversible
step.

## Device-dependency / blast radius (read before merge)
A's correctness hinges on the native tab content VC applying a **full** top safe-area inset —
the same assumption 031 "Trap 1" flagged as "not yet validated on a real iOS 26 device". If
that inset is only **partial**, A leaves just `screenPaddingTop` (8pt) of manual top margin and
content could sit too close to the notch / Dynamic Island. The blast radius is higher than the
025 bottom fix: this affects the top of all three primary screens — the first thing a user sees.
Therefore **shipping without a real-device check risks a visible top-inset regression on all
three primary screens.** This is gated behind the manual merge precondition in Success criteria
#1–2, with Approach B as the pre-designed fallback.

## Success criteria
1. **[visual — verified by simulator / manual inspection on a real notched iOS device; no UI
   test harness exists]** On iOS, the three scrolling tab screens (Today, Programs, History) no
   longer show the large empty band above their content, AND the content **clears** the notch /
   Dynamic Island (eyebrow/title sits a normal design margin below the safe-area top, not
   overlapping it). Verifying *clearance*, not just *band-gone*, is required because A reduces
   the manual top margin to `screenPaddingTop` (8pt) and relies on the native content-inset for
   the safe area.
2. **[visual]** Verified on both bar generations where feasible — iOS 26 (translucent Liquid
   Glass bar) and an older opaque `UITabBar` — since one un-versioned gate (`EXPO_OS === 'ios'`)
   covers both and their content-inset behavior could differ.
3. **[visual]** Settings (iOS, non-scroll) is visually unchanged.
4. **[code-verifiable]** `Screen`'s `paddingBottom` expression is byte-identical to before —
   only the top changes.
5. **[code-verifiable]** Android + web `paddingTop` is byte-identical to before — the new
   `onNativeTabScroll` branch is gated by `onNativeTabBar` (iOS-only), so non-iOS falls through
   to `insets.top + screenPaddingTop` exactly as today.
6. Lint (strict ESLint incl. `local/single-declaration`), typecheck, and the node unit-test
   suite pass. *(Lint pass for the new body-level `onNativeTabScroll` const is expected from the
   `onNativeTabBar`/`tabBarPad` body-level precedent but is to be confirmed at work-time, not
   assumed. Criteria 1–3 are visual and NOT covered by this suite.)*

## Open Questions
None block the code change. The single verification-gated item — criterion 1's notch-clearance
and criterion 2's older-iOS behavior — requires a real device and cannot be confirmed in the
build environment; it is a manual merge precondition for the human reviewer (see
"Device-dependency / blast radius"). If that check shows the native top content-inset is absent
or partial on any supported iOS generation, fall back to Approach B (031 "Trap 1"'s named
fallback) rather than patching A. A knowledge update to [[031-pattern-ios-native-tabs-liquid-glass]]
— flipping its "not yet validated on a real iOS 26 device" caveat to validated-by-this-report
and noting the top inset — will be handled at promote.
