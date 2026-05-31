# 005 — Scratchpad

Live working notes for the DigitalOcean App Platform hosting work unit.

## Panel decisions 2026-05-31

- [3/3 accept, round 2] scope check: single unit (round 1 was 1/3 — Skeptic+Arbiter "revise"
  on completeness, not decomposition; folded in @types/express, declared compression, explicit
  verification commands).
- [3/3 accept, round 2] approach selection: Option A (DO Node buildpack + DO-native Doppler
  sync + JS server.js). Round 1 both revisers endorsed the substrate but flagged: static→server
  prerequisite, build-time env scoping, devDep pruning, catch-all ordering, package name
  (expo-server not @expo/server). Skeptic's round-2 "new HIGH" concerns (6,7) were a misread of
  a slash-separated package list as one import path — clarified, Skeptic flipped to accept.
- [3/3 accept, round 2] whole-proposal acceptance. Round 1 Skeptic "revise" on one real HIGH:
  app.config.ts replaces app.json unless it spreads `...config` (verified vs @expo/config) —
  would drop scheme/plugins/experiments.reactCompiler. Fixed with mandatory `...config` spread +
  new success criterion (`npx expo config --type public` must still report existing config).
  Criterion 3 hardened to `doctl apps spec validate` (doctl installed).

## Implementation notes

(to be filled during minerva:work)
