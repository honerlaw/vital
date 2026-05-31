# Scratchpad — 001-strict-lint-guardrails

## Current state
Proposal approved via consensus panels. Beginning implementation.

## Panel decisions 2026-05-31
- [2/3 accept, skeptic dissented] scope check: single work unit (proponent accept,
  arbiter accept; skeptic "revise" targeted proposal content not scope — arbiter ruled
  both agree on single unit). Concerns logged below.
- [unanimous on choice A; 2 revise = hardening] approach selection: Approach A (pure
  ESLint flat config + local custom rule). Skeptic/arbiter "revise" were implementation-
  hardening, not approach changes. B (Prettier soft line-length) and C (Biome, not eslint)
  rejected.
- [3/3 accept] whole-proposal acceptance: hardened proposal accepted. Both substantive
  reviewers empirically verified against the live toolchain.

## Panel concerns 2026-05-31 (fold into implementation)
- HIGH (resolved in proposal): one-per-file rule must exempt `StyleSheet.create`/types so
  both existing files stay compliant. Done in rule spec.
- projectService + recommendedTypeChecked throws on JS config files unless scoped +
  `disableTypeChecked` for `**/*.js`. Added as layer 5 + success criterion 7.
- consistent-type-assertions 'never': proponent tested → permits `as const` on 8.60.0.
  Skeptic disputed from memory. RE-VERIFY in work (criterion 3). Fallback: no-restricted-syntax.
- max-len hard + noInlineConfig = unescapable tokens → added import/export + url + template
  exemptions.
- custom rule must report on EACH counted node or FAIL fixtures silently no-op (proponent's
  caveat). Load-bearing implementation note.
- strict rules block MUST come after eslint-config-expo/flat spread (expo sets
  consistent-type-assertions to warn/'as').
- exact-pin lint toolchain only; runtime deps keep `~`.
- accepted cost: multi-function util/hook files blocked by design.

## Verified facts (from panel empirical runs — re-confirm as needed)
- eslint 9 + typescript-eslint@8.60.0 + @stylistic@5.10.0 + typescript@6.0.3 install clean.
- eslint-config-expo/flat does NOT enable no-explicit-any (ban is purely additive).
- eslint-config-expo sets consistent-type-assertions to warn/'as' → must override.
- app.json has experiments.typedRoutes:true + reactCompiler:true → generates .expo/types
  (ignored via globalIgnores; type-checked rules scoped to source).

## Decisions log
(append as work proceeds)

## Open questions
- Exact eslint 9.x pin.
- Confirm `as const` under 'never' on 8.60.0.
- Keep/drop reportUnusedDisableDirectives.
