# 021 — native-stack-headers

## Status

Shipped (2026-06-07). Delivered via `minerva:propose-ship-auto` consensus panels (scope
2/3×2→user-confirmed, approach 1/3→2/3 with dissent absorbed as commitments,
whole-proposal 3/3, completion 3/3). Durable learnings:
[[027-pattern-native-stack-headers-pushed-screens]]; reciprocal links added in 003/004/
005/017. Forward-looking items in `followups.md`.

## Goal

The three pushed stack screens (`program/[id]`, `account`, `workout`) use the native
expo-router Stack header for back navigation instead of the hand-rolled inline `BackLink`
chrome, and a live workout has no uncontrolled exit on either platform — every exit path
runs the existing cancel/finish dispatches.

## Why

Today every navigator sets `headerShown: false` and the pushed screens render a custom
inline `BackLink` ("← PROGRAMS" / "← BACK" / "← Cancel" — a `TouchableOpacity` with arrow
text). No native back affordance, duplicated safe-area handling in `Screen.tsx`, and a
latent bug: the native stack's iOS swipe-back is enabled even with the header hidden, so
swiping back on a live workout pops the route WITHOUT dispatching `CANCEL_WORKOUT` —
stranding the live session and leaving a `SWITCH_AND_START_WORKOUT` program switch
un-reverted (the 015 revert semantics in `src/state/reducer.ts:114`, tested at
`reducer.test.ts:226`). The user asked: "use the actual nav header instead of the weird
custom nav header we have today."

## Approach

1. **`src/auth/RootNavigator.tsx`** (the auth-gated root Stack): `headerShown: false`
   stays the Stack-level default. `program/[id]` and `account` get `headerShown: true` +
   a shared themed-options data const (exempt from the `local/single-declaration` lint
   rule — verified against the rule source; no new file): `headerStyle
   { backgroundColor: colors.bg }`, `headerShadowVisible: false`, `headerTintColor
   colors.ink`, empty header title, minimal back chevron with no back text (UX delta
   explicitly user-accepted). Exact v56 option names (e.g.
   `headerBackButtonDisplayMode: 'minimal'` vs alternatives) pinned against the Expo
   SDK 56 docs at implementation (AGENTS.md mandate). `workout` gets
   `headerShown: true` + `gestureEnabled: false` STATICALLY in the navigator
   (unconditional iOS gesture lock — cannot be lost to an in-screen early return).
2. **`workout.tsx`** (as shipped): the `<Stack.Screen options={{ headerLeft }}>` element
   is hoisted into a shared `headerScreen` const (built before the early returns) and
   rendered in every render branch so the Cancel affordance exists in all reachable
   states — the whole non-ready branch (`bootStatus !== 'ready'` — covers loading AND
   error/retry) returns `<>{headerScreen}<CatalogStatus hasHeader/></>`, and the `!live`
   branch returns `headerScreen` directly (never bare `null`, which would mount no
   `Stack.Screen` and drop the Cancel chrome exactly when it matters). The Cancel is an
   INLINE ARROW inside the options object — verified (empirical lint probe) to clear
   both `local/single-declaration` (rule walks only `program.body`) and
   `react/no-multi-comp` (`{ ignoreStateless: false }`) — with
   `accessibilityRole="button"` and `accessibilityLabel="Cancel workout"`, routing
   through `onCancel` (`CANCEL_WORKOUT` dispatch + `router.back()`), which is
   `useCallback`-wrapped so the headerLeft and the BackHandler share ONE cancel path
   (exhaustive-deps required the stable reference; note the provider's dispatch is
   re-memoized on `[state]`, so the effect still re-subscribes per dispatch — benign,
   documented in-code). It REPLACES the default native back button. Android:
   hardware/system back routed to `onCancel` via `BackHandler` from `react-native`
   (COMMITTED — `usePreventRemove` is not publicly exported by expo-router ~56.2.8,
   verified against node_modules exports; no `@react-navigation/native` installed).
   Documented caveat: the Android predictive-back gesture
   (`enableOnBackInvokedCallback`) is NOT enabled in this app (CNG prebuild, no manifest
   flag), so `BackHandler` intercepts classic back reliably; a code comment + this note
   flag revisiting if predictive back is ever enabled.
3. **Delete `src/components/BackLink.tsx`** and its 4 call sites: `account.tsx:42`,
   `workout.tsx:58`, `program/[id].tsx:69` (main) and `:31` (not-found branch — an
   alternate render path; its `<Screen>` also needs `hasHeader`). The `backLink` theme
   variant STAYS — verified surviving consumers: `(tabs)/index.tsx:40,90` (Account
   links), the `(auth)` screens, `RestTimerBar.tsx:36`.
4. **`src/components/Screen.tsx`** (and, via review F6, **`CatalogStatus.tsx`**): opt-in
   `hasHeader` prop threaded through BOTH the scroll and non-scroll branches: when set,
   `paddingTop = layout.screenPaddingTop` only (the native header consumes the top
   inset); when unset, byte-for-byte the prior behavior — tab and auth screens
   untouched. `CatalogStatus` forwards its own optional `hasHeader` (default false —
   headerless tabs share it) so the non-ready branches of `workout`/`program/[id]` don't
   double-inset under their now-visible headers. `workout`'s nested structure (`Screen`
   inside a root `View` with bottom-anchored `RestTimerBar` sibling) passes `hasHeader`;
   the nested-header inset interaction is a named manual-verify item.
5. **Large screen titles stay INLINE** in content (intentional hybrid: the native header
   is a chrome-only back-affordance bar — native large titles cannot reproduce the
   JetBrains-Mono-eyebrow-over-Archivo-title composition).
6. **Tab screens** (`index`/`programs`/`history`) out of scope; "migrate tab-screen
   header rows / Account link to native header chrome" recorded in `followups.md`.

## Success criteria

1. `npm run lint` (`--max-warnings 0`), `npm run typecheck`, `npm test` all pass.
   (automated)
2. `BackLink.tsx` deleted; grep shows zero `BackLink` references. (automated)
3. `program/[id]` and `account` render the themed native header (chevron-only) and pop
   via the chevron; `workout` shows the Cancel headerLeft in ALL branches — the whole
   non-ready branch AND the `!live` branch (fragment-with-`Stack.Screen`, not bare
   null). (manual-verify: code review + simulator)
4. A live workout has no uncontrolled exit: iOS swipe disabled (static
   `gestureEnabled: false`), headerLeft replaces the back button, Android hardware back
   dispatches through `onCancel` (`BackHandler`). The `CANCEL_WORKOUT` program-switch
   revert is preserved — existing reducer tests still pass. (automated reducer tests +
   manual code review of wiring)
5. Headered screens show no double top inset (including `workout`'s nested
   `Screen`-in-`View` structure); tab/auth screens visually unchanged (Screen default
   path unchanged). (manual-verify)
6. No header/content seam (both `colors.bg`), status-bar contrast unchanged, no
   accidental large title. (manual-verify)

## Open questions / logged limitations

- Exact v56 minimal-chevron option name pinned at implementation (AGENTS.md docs
  mandate).
- Android predictive-back caveat documented; not active in this app today.
- Tab-screen header chrome migration deferred to `followups.md`.
