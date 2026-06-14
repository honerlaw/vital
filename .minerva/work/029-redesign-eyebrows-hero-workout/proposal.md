# 029 — Redesign: drop eyebrow overlines, fill the hero card, glass-back the workout

## Status
Shipped (2026-06-14). Delivered via `minerva:propose-ship-auto` consensus panels. Durable
learning: `.minerva/knowledge/033-pattern-inverted-on-accent-surface.md` (new) and a dated
`(029)` addendum on `.minerva/knowledge/027-pattern-native-stack-headers-pushed-screens.md`.
Review fixes applied before ship: deleted the now-dead `src/utils/dateEyebrow.ts`, removed the
orphaned `border.accent` theme token (the deleted `CornerCard` was its only consumer), and
dropped the leftover `marginTop` on the three centered auth screen titles (eyebrow removal made
the title the first child, where the margin off-centered the form). A forward-looking note about
the numeric per-week cadence no longer showing on home is in `followups.md`.

## Goal
A slight, cohesive redesign in three coordinated parts:
1. **Eyebrows** — remove the decorative "eyebrow overline" text (the tiny tracked-out
   UPPERCASE JetBrains-Mono `variant="label"` kickers that float above screen/card titles,
   plus the tiny section kickers like "Up next" / "The cycle") throughout the app.
2. **Hero** — convert the home hero from `CornerCard` (a thin-border card with four
   absolutely-positioned green corner brackets) into a real *filled green card* with
   inverted (white) content.
3. **Workout** — replace the "Cancel" text affordance with a native back chevron, move the
   program/day header into the native header bar, and gate exit behind an
   "Are you sure?" confirmation dialog.

## Why
The eyebrow kickers read as "superscript" clutter (the product owner's word) sitting above
every title. The corner-bracket hero reads as a *frame*, not a card. The workout screen's
"Cancel" is an unguarded text link, and its program/day title is stranded in screen content
below a blank chrome-only bar — an accidental tap or system back silently discards a live
session.

Removing the eyebrows is also what *unblocks* part 3: knowledge `027` kept the workout title
inline specifically because the native large-title bar "cannot reproduce the
JetBrains-Mono-eyebrow-over-Archivo-title composition." With the eyebrow gone, the title is a
plain string that the native `headerTitle` can hold.

## Approach
Surgical, per-call-site (the smallest delta that hits the goal; preserves the design
language). No new top-level components — additive props on existing ones, to stay inside the
strict ESLint guardrails (`local/single-declaration`, `react/no-multi-comp`, `noInlineConfig`).

### 1. Eyebrow / section-kicker removal
Delete the `variant="label"` kickers at these call sites and tighten the following title's top
margin with existing `space` tokens:
- `src/app/(tabs)/index.tsx` — the date eyebrow (both the chooser branch and the session
  branch), the program-name overline inside the card, and the `Up next` / `${perWeek}×/wk`
  section row (remove the now-empty `<View style={styles.sect}>` and its style too, so no
  ~40px blank gap is left behind — fold any needed spacing into the list's `marginTop`).
- `src/app/(tabs)/programs.tsx` — the `Library / NN programs` eyebrow.
- `src/app/(tabs)/history.tsx` — the `Log` eyebrow.
- `src/app/program/[id].tsx` — the `cred / N days per week` meta line and the `The cycle`
  section kicker (the per-day blocks already carry `borderTop` separators).
- `src/app/(auth)/sign-in.tsx`, `sign-up.tsx`, `forgot-password.tsx` — the auth kickers
  (`Welcome back`, `Get started`, `Account recovery`).

**Keep** `variant="label"` where it is a functional control label, not a decorative kicker:
`src/components/TextField.tsx` (form field labels) and `src/components/HistoryRow.tsx`
(sub-label). The `label` preset stays in `src/theme.ts`.

Removing the *section* labels ("Up next", "The cycle") is **per the product owner's explicit
direction** — they named "UP NEXT" when clarifying what "superscript" meant. Under-labeling is
an accepted risk: those sections rely on existing top borders + self-describing rows.

### 2. Hero card (`CornerCard` → `HeroCard`)
Rename `src/components/CornerCard.tsx` → `src/components/HeroCard.tsx` (grep-verified:
`index.tsx` is its only importer — re-confirm at edit time), drop the four bracket Views, and
fill the card with `colors.accent` (#0D8348). Invert the content:
- The day name (`displayDay`) and **all** `StatRow` text (labels *and* values) use **opaque
  white** (`colors.onAccent` #FFFFFF, ~4.8:1 on the accent green = WCAG AA). Visual hierarchy
  comes from the existing fontSize/weight gap (`statLabel` 9px vs `statValue` 16px), **not**
  from opacity — a translucent-white label would blend toward green and fail AA.
- The only new theme token is `onAccentLine: 'rgba(255,255,255,0.24)'`, used **solely** for
  the inverted `StatRow` divider borders (no text on it → WCAG N/A). Co-locate it with the
  other accent tokens in `theme.ts` with a one-line "dividers only" comment.
- `StatRow` (`src/components/StatRow.tsx`) gains an `inverted?: boolean` prop that swaps the
  label/value colors to white and the divider colors to `onAccentLine`.
- `Button` (`src/components/Button.tsx`) gains an `onAccent` variant. The `variant` prop is
  currently **declared but ignored** — the body must actually branch on it:
  `disabled ? styles.disabled : variant === 'onAccent' ? styles.onAccent : styles.primary`,
  with `styles.onAccent` = white background + accent border. The `buttonLabel` preset
  hardcodes white, so the label color must be threaded explicitly:
  `color={variant === 'onAccent' ? colors.accent : (disabled ? colors.faint : colors.onAccent)}`
  — otherwise the label is white-on-white and invisible.

### 3. Workout screen (`src/app/workout.tsx`)
Preserve knowledge `027`'s guaranteed-exit recipe; the chevron + confirm replace the Cancel
text *within* that recipe.
- The shared `headerScreen` const (rendered in **every** render branch per `027`) sets
  `headerLeft` to an **inline** `() => <TouchableOpacity>` (NOT a named component — the `027`
  lint pattern) holding a Feather `chevron-left` glyph (the native chevron rides the iOS
  liquid-glass bar; the bar is the glass, per `031`). It also sets a **stable**
  `headerTitle: 'Workout'` so the loading/error branches never read an undefined `day`.
- The live render adds a second `<Stack.Screen options={{ headerTitle: day.name }} />` to
  override the title once `day` exists. **Verify against the installed expo-router 56 docs**
  (AGENTS.md mandate) that two in-render `<Stack.Screen>` elements compose / last-wins; the
  `'Workout'` fallback is a safe degradation if they don't.
- A single `onCancel` `useCallback` shows the confirmation (no second named declaration → no
  `single-declaration` violation). Cross-platform:
  `Platform.OS === 'web' ? window.confirm('Cancel workout? Your logged sets will be discarded.')`
  `: Alert.alert('Cancel workout?', 'Your logged sets will be discarded.', [...])`. Buttons:
  **Keep going** (`cancel` style — no-op) and **Discard** (`destructive` →
  `dispatch(CANCEL_WORKOUT)` then `router.back()`). The handler only ever runs inside an
  event / `BackHandler` callback, never at SSR, so `window` behind the `Platform.OS` guard is
  safe.
- The **existing single** `BackHandler` effect is retargeted to this same `onCancel`
  (Android hardware back shows the dialog) — not a second handler; same per-dispatch
  re-subscribe behavior documented in `027`.
- The navigator lock (`gestureEnabled: false`, `headerBackVisible: false` in
  `RootNavigator.tsx`) is unchanged, so the iOS swipe-back path stays unreachable. Add
  `headerTitle: 'Workout'` to `pushedHeaderOptions` (currently `''`) as the base fallback.

## Success criteria
1. **[visual — manual/simulator; no UI test harness exists]** No decorative eyebrow or
   section-kicker overlines remain in `index`, `programs`, `history`, `program/[id]`,
   `workout`, or the three auth screens; the `label` variant survives only in `TextField` and
   `HistoryRow`.
2. **[visual]** The home hero renders as a solid green filled card (no corner brackets) with
   all-white, AA-legible content and a readable inverted "Begin →" button.
3. **[visual + behavioral]** The workout screen shows a back chevron in the header and the day
   name as the native bar title (`'Workout'` on loading/error). Tapping the chevron **and**
   Android hardware back both raise the confirm dialog; **Discard** runs `CANCEL_WORKOUT` then
   navigates back, **Keep going** is a no-op (session intact).
4. `npm run lint` (strict, `--max-warnings 0`), `npm run typecheck`, and `npm run test` pass.
   (Criteria 1–3 are visual/behavioral and are NOT covered by the node unit suite — see notes.)

## Open Questions
- Removing the "Up next" / "The cycle" section labels leaves those lists without a textual
  heading (accepted per explicit product-owner direction; mitigated by borders + self-describing
  rows). If review judges a list under-labeled, the fallback is to restore a single plainer
  (non-kicker) heading.
- **Rollback granularity is coarse** (logged scope risk): if part 2's green-card direction is
  rejected in review while parts 1 + 3 are fine, the single work unit forces an all-or-nothing
  revert. Accepted as a known tradeoff (scope-check panel, 3/3).
