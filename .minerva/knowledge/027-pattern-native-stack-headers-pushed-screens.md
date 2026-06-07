# Pattern: native stack headers on pushed screens + guaranteed-exit recipe

- Type: pattern
- Date: 2026-06-07
- Work unit: 021-native-stack-headers
- Related: [[005-decision-vital-state-and-nav-boundaries]] (the route placement this builds
  on — pushed screens are top-level siblings of `(tabs)`),
  [[004-pattern-expo56-react-compiler-hook-rules]] (the hook rules the BackHandler effect
  is written to), [[003-pattern-conforming-code-under-strict-guardrails]] (the
  lint-clearing techniques this extends with the inline-arrow `headerLeft`),
  [[017-pattern-per-user-state-persistence]] (whose `[state]`-memoized wrapped dispatch
  is why handler effects here re-subscribe per dispatch),
  [[001-constraint-strict-eslint-guardrails]] (binds every file below)

How work 021 put native expo-router Stack headers on the pushed screens (`program/[id]`,
`account`, `workout`) and made the live workout's exits dispatch-guaranteed. The option
*names* are readable from `RootNavigator.tsx`; what this entry preserves is the placement
rationale and the dead ends.

## Chrome-only hybrid headers
The native header is a back-affordance bar only: empty `headerTitle`, white shadowless bar,
ink chevron, `headerBackButtonDisplayMode: 'minimal'` (no back text — user-accepted UX
delta). Large screen titles stay INLINE in content because native large titles cannot
reproduce the JetBrains-Mono-eyebrow-over-Archivo-title composition. The shared
`pushedHeaderOptions` is a module-level **data const** in `RootNavigator.tsx` — data consts
are exempt from `local/single-declaration`, so no extra file. Option names are
v56-fragile; they were pinned against the versioned Expo docs (AGENTS.md mandate).

## The guaranteed-exit screen recipe (workout)
A screen whose every exit must run a dispatch (CANCEL_WORKOUT, whose absence strands the
live session AND leaves a `SWITCH_AND_START_WORKOUT` program switch un-reverted — the 015
revert) needs FOUR coordinated pieces, each in a specific place:

1. `gestureEnabled: false` + `headerBackVisible: false` set **statically at the
   navigator's `Stack.Screen`** — an in-screen early return can never drop the lock.
   (Before 021, iOS swipe-back was silently enabled under `headerShown: false` — the bug
   class to check whenever a screen has exit side-effects.)
2. The in-screen `<Stack.Screen options={{ headerLeft }}>` element (it needs the
   `dispatch` closure) hoisted into a `headerScreen` const and rendered in **every render
   branch** — the early returns return `<>{headerScreen}<CatalogStatus/></>` and bare
   `headerScreen`, never bare `null`, or the Cancel chrome unmounts exactly in transient
   states.
3. The `headerLeft` arrow lives **inline inside the options object** — it is not a
   top-level component, so it clears both `local/single-declaration` (walks only
   `program.body`) and `react/no-multi-comp` (`ignoreStateless: false`) under
   `noInlineConfig` (no disable escape). Verified by lint probe; do not "extract" it.
4. Android hardware/system back routes through the **same** `onCancel` via a
   `BackHandler` effect returning `true`. Branch-safe because the reducer's
   `CANCEL_WORKOUT` is a no-op when `live` is null.

## Dead ends + caveats (the non-derivable part)
- **`usePreventRemove` is NOT publicly exported** by expo-router ~56 (it exists only at a
  deep vendored path) and `@react-navigation/native` is not installed — `BackHandler`
  from `react-native` is the only clean import for back interception.
- **Android predictive back** (`enableOnBackInvokedCallback`) is NOT intercepted by
  `BackHandler`. Fine today — this CNG app never sets the flag — but enabling it reopens
  the uncontrolled-exit hole; revisit with the react-native-screens preventRemove path
  (also noted in `workout.tsx` and 021's followups).
- **Handler effects keyed on `dispatch` re-subscribe per dispatch**: the provider's
  wrapped dispatch is re-memoized on `[state]` (see [[017]]), so a
  `useCallback([dispatch, ...])` handler is a new identity each state change. Correct
  (cleanup keeps exactly one listener with the latest closure) but churny; don't write a
  comment claiming it is stable.

## hasHeader inset propagation
`Screen` (and `CatalogStatus`, which wraps it) take an opt-in `hasHeader` prop: under a
native header the bar consumes the top safe-area inset, so headered callers keep only
`layout.screenPaddingTop`. Defaults stay `false` because headerless surfaces share both
components (`(tabs)/_layout.tsx` renders `CatalogStatus` with no header — passing `true`
there would *introduce* the inset bug this prop fixes).
