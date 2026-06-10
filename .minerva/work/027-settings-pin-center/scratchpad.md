# 027 — Scratchpad

## Working notes

## Panel decisions 2026-06-10
- [skipped — small] scope check: single additive UI unit (evidence: touches only
  src/components/Screen.tsx — one opt-in prop — and src/app/(tabs)/settings.tsx layout;
  no decomposition possible)
- [3/3 accept] approach selection: option A — opt-in `flushBottom` prop on Screen
  (rejected: B — global paddingBottom fix, app-wide reflow / regression risk; C —
  settings-only negative-margin hack, child hard-codes parent padding). Conditions:
  specify exact flex-tree, document relative-flow-tab-bar coupling, clarify name.
- [2/3 accept, arbiter dissented → revision round] whole-proposal acceptance, round 1:
  arbiter bound two conditions (preserve user null-guard around centered avatar/email
  children; mark visual criteria #1/#2 as simulator-verified, correct "88px" overclaim +
  no-unused-styles overclaim).
- [3/3 accept] whole-proposal acceptance, round 2: both conditions folded in; Proponent +
  Skeptic re-verified against source, Arbiter confirmed no remaining concerns.
