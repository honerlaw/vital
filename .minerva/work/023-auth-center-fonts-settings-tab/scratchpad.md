# 023 — auth-center-fonts-settings-tab · scratchpad

## Panel decisions 2026-06-07
- [3/3 accept] scope check: single unit (account→Settings migration atomic by correctness —
  the Today header links are the only sign-out path; font bump too small to justify its own
  unit, isolated as a dedicated commit instead)
- [1/3 accept → revision round] approach selection v1: Skeptic found centered ScrollView had
  no keyboard-follows-focus mechanism; avatar HSL(h,55%,38%) fails WCAG at some hues;
  single-declaration lint trap; font scope creep into mono chrome; headerRow under-specified
- [2/3 accept, skeptic's sole load-bearing fix applied verbatim, arbiter confirmed closure]
  approach selection v2 (A′): automaticallyAdjustKeyboardInsets grafted in; fonts scoped to
  six reading presets; avatar L pinned 29% (skeptic swept all 360 hues: worst h≈60 = 4.751:1
  at L=30, FAILS at 31–32); avatarColor.ts single exported function, no module-level helpers;
  prune orphaned TouchableOpacity import + dead headerRow styles (rejected: B — layout-wrapper
  centering can't work, runtime font multiplier breaks tokens-as-source-of-truth, Clerk
  imageUrl is a silhouette for password users; C — modular scale rewrite too broad, external
  avatar service adds network dep; C's KeyboardAvoidingView idea grafted into A′)
- [1/3 accept → revision round] whole-proposal v1: Skeptic — bare `grep -r "account"`
  unpassable (matches auth copy); criteria 1–2 lacked named verification methods; null-user
  contract implicit
- [3/3 accept] whole-proposal v2: narrowed greps verified exhaustive against the real code
  (only router.push('/account') ×2 + name="account" ×1 exist); criterion 1 split into style
  proxy + manual-visual; criterion 2 names its git-diff check; prop renamed `seed: string`
  (the `?? user.id` fallback can feed a non-email; hash accepts any string)

## Panel concerns 2026-06-07 (for review phase)
- Approach skeptic (medium, logged): scroll={false} Settings clips if content grows later —
  acceptable now, revisit when Settings gains preferences.
- Approach skeptic (low, logged): visual center shifts slightly between auth sub-states as
  error text/links render — cosmetic, accepted.
- Proposal skeptic (low, logged): avatar test sweep must include id-shaped seeds (user.id
  fallback path), not only email-shaped — folded into criterion 6.

## Panel decisions 2026-06-07 (work phase)
- [3/3 accept] completion verification: all gates independently re-run by every panelist
  (lint clean, 68/68 tests, tsc 0); theme commit surgically scoped; greps empty; web
  screenshots confirm centering at 390×844 + graceful top-anchor at 390×450; the
  signed-in surfaces (4-tab bar, Settings render, live sign-out) honestly downgraded to
  proxy — named blockers: Postgres 5432 held by an unrelated container, no Clerk test
  credentials; code path structurally verified (signOut → Stack.Protected flips)

## Panel decisions 2026-06-07 (review phase)
- [skipped — small] review triage: all 4 findings low-severity per the taxonomy row
  (evidence: independent reviewer reported "No high or medium severity issues found";
  verified worst-hue contrast 4.996:1, hash arithmetic exact, lint clean). Dispositions:
  F1 SUGGEST, F2 SUGGEST, F3 FIX (one-word comment edit), F4 IGNORE (house convention).
  Replan-vs-FIX not triggered — no load-bearing finding.

## Review finding 2026-06-07
- SUGGEST (F1, low): `Screen`'s `center` prop is silently ignored when `scroll={false}`
  (the non-scroll View branch never consults it). Latent only — no call site combines
  them. If a future screen needs both, apply centering to the View branch or document the
  prop as scroll-only.
- SUGGEST (F2, low): Avatar's 64px circle uses raw width/height/borderRadius literals; if
  avatars spread beyond Settings, add an avatar-size token to `theme.ts`.

## Panel decisions 2026-06-07 (promote phase)
- [2/3 accept — proponent + skeptic both accepted; arbiter moot with quorum reached]
  partition: PROMOTE 029 (WCAG-safe generated colors — hue-dependent contrast cliff at
  L=30/31, sweep-with-coverage-floor test discipline, seed-not-email); MERGE §1 caveat
  (center is scroll-only) + Status→Shipped; DISCARD panel logs/cosmetic notes; TODO×3 →
  followups. Skeptic refinements applied: P1 trimmed of code-derivable restatements;
  single-declaration fragment demoted to a Related link to 003.
- [skipped — small] TODO disposition: single unambiguous disposition (evidence: all three
  TODOs route to followups.md, none seeds a proposal — T1 scroll-when-grows, T2
  center×non-scroll, T3 avatar token)

## Log 2026-06-07
- Work unit initialized via minerva:propose-ship-auto.
- Implemented in three commits: ae9c7e0 (theme bump, dedicated per criterion 2),
  35b09c4 (center prop + auth screens), 69dd92a (Settings tab + avatar + account removal).
- No divergences from the proposal: every file landed exactly where §1–§5 said. The one
  in-flight correction was house style for `void test(...)` in the new test file
  (no-floating-promises), found by the lint gate.
- Gates: `npm run lint` clean; `npm test` 68/68 (3 new avatarColor tests incl. the WCAG
  sweep with a ≥350-distinct-color coverage floor); `npx tsc --noEmit` clean.
- Criterion 4 greps verified empty; theme diff scope check verified (only the six reading
  presets touched).
