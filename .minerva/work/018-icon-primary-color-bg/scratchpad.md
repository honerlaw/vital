# 018 — icon-primary-color-bg · scratchpad

## Panel decisions 2026-06-06

- [skipped — small] scope check: obviously a single unit (evidence: one concern —
  icon background hue; surfaces are master SVG + app.json + regenerated artifacts;
  no plausible decomposition)
- [skipped — small] approach selection: gradient re-anchored on theme accent
  dominant (rejected: B flat fill — abandons gradient depth of a liked logo;
  C un-anchored green — fails "reflective of the actual primary color")
- [2/3 accept → revise] whole-proposal acceptance round 1: Arbiter requested two
  doc additions — (a) splash full-bleed-accent consequence on the record,
  (b) glyph PNGs pinned as expected zero-diff tripwire
- [3/3 accept] whole-proposal acceptance round 2: both additions verified accurate
  and load-bearing by independent code checks (splash hold in RootNavigator;
  glyph-only PNG derivation in generate-icons.mjs)
