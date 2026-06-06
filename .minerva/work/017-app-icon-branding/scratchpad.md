# Scratchpad — 017-app-icon-branding

## Panel decisions 2026-06-06

- [skipped — small] scope check: single unit (evidence: one concern — branding assets; ~7 asset files + 1 script + app.json values, no code paths; no plausible decomposition seam)
- [1/3 accept → revision round] approach selection v1: Skeptic flagged expo.icon bundle under-specified, white-on-#E6F4FE Android layering, divergent blues
- [1/3 accept → escalated to user] approach selection v2: panel found iOS App Store icon is rendered from the unvalidated Icon Composer bundle by Xcode at EAS build time (auto-submit on merge); user chose flat icon.png — delete assets/expo.icon + ios.icon key
- [1/3 accept → revision round] whole-proposal v1: Arbiter demanded prebuild dry-run gate (CNG validation gap), reproducibility rewording, extraction contract, glass-claim removal, explicit aspect changes
- [3/3 accept] whole-proposal v2 (amended): prebuild gate verified against SDK 56 withIosIcons.js source by Skeptic

## Panel concerns 2026-06-06

Carried from whole-proposal v2 Skeptic (accept with concerns logged):

- [MEDIUM] `adaptiveIcon.backgroundColor` is inert when `backgroundImage` is wired — the regenerated `android-icon-background.png` gradient content is the load-bearing piece. (Addressed in proposal: criterion 2 marks the PNG load-bearing, criterion 3 marks the color a fallback.)
- [LOW] prebuild gate must verify appiconset contents, not just exit 0, and clean up generated native dirs.
- [LOW] foreground 512²→1024² and monochrome 432²→1024² resizes are intentional (now noted inline in criterion 2).
- [LOW] extraction contract unfalsifiable until the SVG exists; safe-zone math verified (174+676+174 = 1024).

## Notes
