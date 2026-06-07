# Pattern: WCAG-safe generated (hashed) background colors

- Type: pattern
- Date: 2026-06-07
- Work unit: 023-auth-center-fonts-settings-tab
- Related: [[003-pattern-conforming-code-under-strict-guardrails]] (the generator keeps its
  hash/HSL helpers inside the single exported function body to clear `single-declaration`),
  [[012-pattern-src-unit-tests-node-tsx]] (the offline runner the contrast sweep rides on)

`src/utils/avatarColor.ts` (the Settings-tab monogram avatar, 023) derives a background from
`hash(seed) → hue` with saturation/lightness PINNED. Two facts discovered building it are
durable for ANY future white-text-on-generated-color surface:

## White-on-HSL contrast is hue-dependent, and the safe-lightness boundary is razor-thin

Pinning lightness does NOT pin contrast: perceived luminance varies with hue at equal HSL
lightness (yellow/green ≫ blue). At S=55% the adversarial hue is ≈60 (yellow): white text
clears WCAG AA (≥ 4.5:1) at **L=30% (4.75:1) but FAILS at L=31% (4.50:1) and L=32%
(4.26:1)** — a one-percentage-point cliff most people would not guess exists. The shipped
value is L=29% for rounding margin. Do not "brighten the avatars a touch" without re-running
the sweep; eyeballing one hue proves nothing about the worst one.

## Prove the invariant mechanically, with a coverage floor

The unit test (`avatarColor.test.ts`) computes real WCAG contrast (sRGB-linearized relative
luminance) for every emitted color across thousands of seeds — BOTH email-shaped and
id-shaped, because the call site is `primaryEmailAddress?.emailAddress ?? user.id` and the
Clerk-id fallback feeds non-emails (which is also why the parameter is named `seed`, not
`email`). The subtle half of the pattern: the test also asserts a **distinct-color floor**
(≥350 colors from 3000 seeds over 360 hues). Without it, a future hash change that collapses
the output space would make the contrast assertion pass vacuously while exercising a handful
of hues.
