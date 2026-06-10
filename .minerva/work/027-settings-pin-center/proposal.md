# 027 — Settings layout: pin Sign out, center profile

## Status
Shipped (2026-06-10). Delivered via `minerva:propose-ship-auto` consensus panels; durable
learning in `.minerva/knowledge/031-pattern-screen-flushbottom-tabbar-inset.md`.

## Goal
On the Settings tab, pin the "Sign out" button just above the bottom tab bar (a small
design margin, not floating high), and vertically center the avatar + email block in the
space between the title and the button.

## Why
The Sign out button currently floats well above the tab bar. Root cause (verified from
code): the custom tab bar (`src/components/TabBar.tsx`) is rendered via the Expo Router
`Tabs` `tabBar` prop with NO absolute positioning, so it is a relative-flow sibling laid
out BELOW the scene container — the scene already ends at the bar's top, and the bar's own
View already reserves `insets.bottom + tabBarHeight` (height `tabBarHeight + insets.bottom`,
paddingBottom `insets.bottom`). But the shared `Screen` component sets
`paddingBottom: insets.bottom + layout.tabBarHeight + space['2xl']`, double-counting that
`insets.bottom + tabBarHeight` for any bottom-pinned child — the doubled term is the visible
float. Separately, the avatar/email sits near the top (a `marginTop` plus a single `flex:1`
spacer that pushes everything down), looking unbalanced.

## Approach
1. **`Screen` opt-in prop** (`src/components/Screen.tsx`): add `flushBottom?: boolean`
   (default false), mirroring the existing `hasHeader` (021) and `center` (023) inline-ternary
   opt-ins. When true, `paddingBottom = space['2xl']` (24px design margin above the bar)
   instead of `insets.bottom + layout.tabBarHeight + space['2xl']`. An own-line comment
   documents WHY this is safe — the relative-flow tab bar already reserves
   `insets.bottom + tabBarHeight` below the scene — AND the coupling: if the tab bar were ever
   made absolute/floating, `flushBottom` screens would lose that clearance. The false/default
   branch is behaviorally identical to today, so no other screen is affected.
2. **Settings screen** (`src/app/(tabs)/settings.tsx`): pass `scroll={false} flushBottom`.
   Flex tree (one source of vertical layout, no competing flex regions):
   - `AppText` screen title — top (auto height).
   - A single `flex:1` container with `justifyContent:'center'` + `alignItems:'center'` — the
     ONLY flex:1 region, so it absorbs all free space and centers the profile vertically
     between title and button. It KEEPS the existing
     `user !== null && user !== undefined ? (...) : null` guard wrapping the avatar+email
     children (the guard is NOT deleted as dead — it covers the brief Clerk-hydration null
     window that would otherwise crash `Avatar`'s required `seed`). The container always
     renders; only its children are guarded.
   - `Button` "Sign out" — bottom (auto height), pinned ~24px above the tab bar by
     `flushBottom`.
   - Remove the old `flex:1` spacer and the `profile.marginTop`. Removing the now-unused
     `spacer` style is hygiene (no `no-unused-styles` lint rule exists; it would not fail CI
     either way). Update the file header comment to describe the pin/center mechanism.

## Success criteria
1. **[visual — verified by iOS simulator / manual inspection; no UI test harness exists]**
   Sign out sits ~24px above the tab bar (not floating high).
2. **[visual — verified by simulator / manual inspection]** Avatar + email are vertically
   centered in the region between the title and the Sign out button.
3. `Screen`'s false/default `flushBottom` branch is behaviorally unchanged — every other
   screen renders identically.
4. `flushBottom` carries an own-line comment documenting the relative-flow-tab-bar coupling.
5. Lint (strict ESLint incl. `local/single-declaration`), typecheck, and the node unit-test
   suite pass. (Criteria 1 & 2 are visual and are NOT covered by this suite — see their
   inline notes.)

## Open Questions
None load-bearing. The name `flushBottom` is kept (consistent with `center`'s effect-style
naming) and documented; a future refactor toward a layout variant/enum is logged as
out-of-scope.
