# 023 — Centered auth forms, larger reading type, Settings tab

## Status
Shipped (2026-06-07). Delivered via `minerva:propose-ship-auto` consensus panels; durable
learnings in `.minerva/knowledge/029-pattern-wcag-safe-generated-avatar-colors.md`.

## Goal
Three UI ergonomics improvements: (1) the sign-in / sign-up / forgot-password forms render
vertically centered instead of top-anchored; (2) the app's reading text is slightly larger by
default; (3) a Settings tab (4th tab) replaces the pushed `/account` screen — showing a
generated avatar derived from the user's email plus their email, with Sign out pinned to the
bottom of the screen and the Verify /api/me debug button gone.

## Why
The auth forms currently hug the top of tall screens (40px margin), wasting the lower
two-thirds. Body text at 13–14px reads small on modern devices. The account screen is a
leftover dev surface: it carries a debug "Verify /api/me" button, lives behind a
low-discoverability header link, and sign-out deserves a stable, always-visible home. A
Settings tab gives account actions a conventional location and removes the only pushed screen
that didn't need push semantics.

## Approach
1. **`center` prop on Screen** (`src/components/Screen.tsx`): opt-in boolean mirroring
   `hasHeader` (021). When true, contentContainerStyle gains `flexGrow: 1,
   justifyContent: 'center'` and the ScrollView gets `automaticallyAdjustKeyboardInsets`
   (iOS keyboard-follows-focus; silent no-op on Android where the default `resize` mode
   re-centers content in the shrunken viewport; flexGrow degrades gracefully when content
   exceeds the viewport — it never shrinks below content height). The three auth screens pass
   `center` and drop their `marginTop: space['4xl']` eyebrow margins. Caveat (review F1):
   `center` applies only in scroll mode — the `scroll={false}` View branch does not consult
   it (no current call site combines them; see followups.md).
2. **Reading-type bump** (`src/theme.ts`, dedicated commit for revertability): body 14→15
   (lineHeight 21→22), bodySub 13→14 (19→20), screenTitle 30→32 (32→34), displayDay 24→25
   (26→27), programTitle 22→23 (26→27), exerciseName 16→17 (20→21). ALL JetBrains Mono chrome
   presets (label, tabLabel, statLabel, setLabel, tag, statValue, setValue, scheme,
   buttonLabel, progressCount, restTime, restLabel, rowWhen, historyDate, backLink) untouched
   — no tab-label overflow, no tabular-nums column drift.
3. **Settings tab**: new `src/app/(tabs)/settings.tsx` registered as
   `<Tabs.Screen name="settings" />` after history in `(tabs)/_layout.tsx`; TabBar ICONS gains
   `settings: 'settings'` (Feather glyph exists) and LABELS gains `settings: 'Settings'`. The
   screen: `Screen scroll={false}` (no hasHeader — tabs have no native header, so it keeps the
   insets.top padding) rendering a flex column — Avatar + email
   (`user.primaryEmailAddress?.emailAddress ?? user.id`) at top, `flex: 1` spacer, Sign out
   Button (`useAuth().signOut`) at the bottom; Screen's existing paddingBottom already clears
   the tab bar. No Verify button (the `/api/me` endpoint itself is untouched). Settings
   renders only inside the signed-in tree (`Stack.Protected` guard + tabs render-gate), so
   `user` is non-null there; Avatar takes a required `seed: string` prop.
4. **Account screen removal**: delete `src/app/account.tsx`; remove
   `<Stack.Screen name="account" options={pushedHeaderOptions} />` from
   `src/auth/RootNavigator.tsx`; in `src/app/(tabs)/index.tsx` BOTH branches (first-run
   chooser + session view), collapse the two-child space-between headerRow to just the eyebrow
   AppText, prune the now-unused `TouchableOpacity` import and dead `headerRow` style, and
   rewrite the stale "only path to /account and Sign out" comments to note sign-out now lives
   on the always-visible Settings tab.
5. **Avatar**: new `src/components/Avatar.tsx` — a circle (64px) showing the first character
   of the seed uppercased in white (`user.id` fallback yields 'U'); background from new
   `src/utils/avatarColor.ts`. That util is ONE exported function with NO module-level helper
   consts (the repo's `local/single-declaration` rule counts top-level function declarations):
   deterministic hash of an arbitrary seed string (the email when present, else the Clerk user
   id) → hue 0–359, saturation pinned 55%, lightness pinned 29%, HSL→RGB math inline, returns
   hex. New `src/utils/avatarColor.test.ts` (offline `node --import tsx --test` runner)
   asserts: determinism (same seed → same hex), hex format, and mechanically computed WCAG
   contrast ≥ 4.5:1 vs white across a sweep covering the hue space with both email-shaped and
   id-shaped seeds (at S=55%/L=29% the worst hue h≈60 clears 4.5:1 with margin — verified by
   panel sweep: 4.751:1 at L=30, more at L=29).

## Success criteria
1. Centering: (proxy, checkable) when `center` is passed, the ScrollView's
   contentContainerStyle includes `flexGrow: 1` + `justifyContent: 'center'` and
   `automaticallyAdjustKeyboardInsets` is set; (manual-visual) verified on device/simulator in
   both sub-states of each auth screen, keyboard not occluding the focused field on iOS,
   content scrollable when it exceeds the viewport.
2. `git diff` scoped to `src/theme.ts` shows only the six reading presets (and their
   lineHeights) touched; all mono presets unchanged; the bump is its own commit.
3. The tab bar shows 4 tabs (Today, Programs, History, Settings); the Settings screen shows
   the avatar, the email, and a bottom-pinned Sign out button; tapping Sign out returns to the
   auth group (existing StateProvider sign-out reset covers state).
4. `grep -rn "'/account'" src/` and `grep -rn 'name="account"' src/` both return nothing;
   `src/app/account.tsx` no longer exists.
5. The Verify /api/me button exists nowhere in the app; the `/api/me` endpoint and its tests
   are untouched.
6. `avatarColor.test.ts` passes, asserting determinism + hex format + WCAG ≥ 4.5:1 sweep over
   email-shaped and id-shaped seeds.
7. `npm run lint` (max-warnings 0), `npm test`, and `npx tsc --noEmit` all pass.

## Open questions
- None blocking. Deferred: whether Settings later gains preferences (units kg/lb,
  notifications) — the bottom-pinned layout leaves the upper region free for a future list; if
  content grows, `scroll={false}` must be revisited (logged in scratchpad).
