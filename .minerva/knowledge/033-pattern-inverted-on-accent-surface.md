# Pattern: text ON an accent fill must be OPAQUE white (translucency fails WCAG)

- Type: pattern
- Date: 2026-06-14
- Work unit: 029-redesign-eyebrows-hero-workout
- Related: [[029-pattern-wcag-safe-generated-avatar-colors]] (the sibling "razor-thin WCAG
  cliff" finding — same shape: a contrast trap you can't eyeball), [[027-pattern-native-stack-headers-pushed-screens]]
  (the `Platform.OS === 'web'` cross-platform guard structure the workout confirm dialog reuses)

When 029 turned the home hero into a solid `colors.accent` (#0D8348) fill with inverted
content (`HeroCard` + `StatRow inverted` + `Button variant="onAccent"`), the non-obvious trap
was the inverted **text color** — and it is the same class of cliff as the avatar-color sweep
in [[029-pattern-wcag-safe-generated-avatar-colors]].

## The gotcha: a translucent-white label blends toward the fill and fails AA
The instinct for a secondary label on a colored card is a *translucent* white
(`rgba(255,255,255,0.7)`) to dim it. On the accent green that is a WCAG **failure**: alpha
compositing blends the text toward the green background, collapsing contrast far below the
4.5:1 AA floor — even though opaque white (#FFFFFF) on this exact green is ~4.8:1 (AA, the
value `theme.ts` already documents on `colors.accent`). So:

- **All text on an accent fill is OPAQUE `colors.onAccent` (#FFFFFF)** — both the prominent
  value and the dim-looking label. Visual hierarchy comes from the existing font **size/weight**
  gap (`statValue` 16px vs `statLabel` 9px), **never** from opacity.
- **Translucency is allowed only on NON-text elements.** The one new token,
  `colors.onAccentLine` (`rgba(255,255,255,0.24)`), is for the inverted `StatRow` dividers
  only — a hairline carries no text, so WCAG contrast does not apply and a translucent rule
  reads correctly as a faint divider.

The reusable rule: on any colored fill, dim secondary text with **weight/size, not alpha** —
reserve alpha for borders/dividers. Re-check contrast against the *fill*, not against white.
