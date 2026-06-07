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

## Log 2026-06-07
- Work unit initialized via minerva:propose-ship-auto. Implementation not yet started.
