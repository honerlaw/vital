# 029 — redesign-eyebrows-hero-workout · scratchpad

## Panel decisions 2026-06-14 (via propose-ship-auto)
- [3/3 accept] scope check (rev): single work unit. Vote 1 (2/3, skeptic revise on spec gaps
  not decomposition — its own #1 argued FOR atomic shipping) → consensus failure at 3/3 quorum
  → revision round folding the spec resolutions → vote 2 3/3 accept.
- [concern logged] scope: coarse rollback granularity (medium) if part 2 rejected while 1+3 ok
  — accepted as known tradeoff.
- [3/3 accept] approach selection: A (surgical, per-call-site). Rejected: B (theme-level label
  removal — breaks functional TextField/HistoryRow labels); C (new design-system primitives —
  too heavy for a slight redesign, lint surface). Skeptic accept-with-concerns: translucent-white
  not a token, Alert-dismiss no-op, grep-verify CornerCard, inline-headerLeft lint — all folded in.
- [revise→folded] whole-proposal acceptance: Vote 1 (proponent accept / skeptic revise) found
  3 load-bearing defects — WCAG (translucent-white text on green ~1.5:1 fails AA), SSR (bare
  window.confirm), undefined headerTitle on loading/error branches → revision round. Vote 2
  (proponent accept / skeptic revise): both prior defects confirmed RESOLVED; skeptic's remaining
  HIGH items were precise, agreed implementation specs for the onAccent Button variant (declared-
  but-ignored variant prop; buttonLabel hardcodes white). Two-vote budget reached, escalation
  trigger (≤1/3) did not fire, no strategic decision for the user → specs folded into proposal
  implementation notes; non-skippable completion-verification panel (3/3) will re-check the build.

- [3/3 accept] completion verification: all 4 success criteria honestly met (Proponent +
  Skeptic both verified against files; Arbiter concurred). Skeptic logged 2 non-blocking
  cleanup findings → carried into review.
- [revise→folded] review triage: Proponent accept / Skeptic revise. Skeptic surfaced a real
  MISSING finding (F5) — eyebrow removal made the screen title the first child of the centered
  auth screens, so the leftover `styles.title` marginTop off-centers the form. Folded in:
  F1 FIX (delete dead `src/utils/dateEyebrow.ts`), F2 FIX (remove orphaned `border.accent`
  token — CornerCard was its only consumer), F5 FIX (drop the artifact marginTop on the 3 auth
  titles), F3 SUGGEST, F4 IGNORE. No load-bearing divergence → no replan-vs-FIX panel.

## Review finding 2026-06-14 (SUGGEST)
- F3: the home screen no longer shows the numeric per-week cadence ("3×/wk") — it lived in the
  removed "Up next" row (removed per explicit product direction). Relative weekday hints
  (`cadenceDayLabel`) remain on the upcoming list, and the numeric cadence is still on program
  detail + program cards. If product later wants the numeric form back on home, add a small
  cadence summary line above the upcoming list.

## Notes
- Verification: `npm run lint` (--max-warnings 0), `npm run typecheck`, `npm run test`.
- Slug is 029 (028 taken by remote branch `origin/028-ios-tab-top-inset`).
