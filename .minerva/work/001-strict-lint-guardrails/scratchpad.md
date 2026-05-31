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
- Pinned eslint 9.39.4 (latest 9.x; eslint-config-expo@56 peer is >=8.10). Avoided
  eslint 10.x for eslint-config-expo@56 compatibility safety.
- RESOLVED: `consistent-type-assertions: {assertionStyle:'never'}` on typescript-eslint
  8.60.0 PERMITS all `as const` forms (literal/array/object) and BLOCKS ordinary casts
  (messageId `never`). Verified by direct Linter probe. No `no-restricted-syntax` fallback
  needed. Skeptic's memory-based claim was wrong; proponent's empirical test was right.
- Added `globals` (17.6.0, exact) as an explicit devDep since eslint.config.js requires it
  directly for Node globals on the `**/*.js` override.
- Custom rule unwraps wrapper calls by an ALLOW-LIST of callee names (`memo`, `forwardRef`,
  incl. `React.`-prefixed) rather than unwrapping any CallExpression — so `[].map(fn)` /
  `debounce(fn)` / `StyleSheet.create({})` are correctly treated as data, not declarations.
- `node --test eslint-rules/` fails on Node 24 (treats dir as a module entry). Script uses
  the shell-expanded glob `node --test eslint-rules/*.test.js` instead.

## DIVERGENCE (bug found in verification, fixed in-approach — no replan)
- The first `max-len` ignorePattern `^\s*(import|export)\s` was TOO BROAD: it exempted
  every `export const`/`export function` code line, punching a hole in the line-length
  guardrail (a 101-char `export const` PASSED when it must fail). Narrowed to
  `^\s*(import|export)\b.*\bfrom\b|^\s*import\s+['"]` — exempts only module-specifier
  lines (`import ... from`, `export ... from`, bare `import '...'`), while `export const`/
  `export function` code lines are now correctly enforced. Re-verified: 101-char export-const
  FAILS, 114-char import PASSES. Approach unchanged; this was an option-value correction.

## Success-criteria verification (all met — evidence)
1. `npm run lint` exit 0 on src/app/index.tsx + _layout.tsx (component + StyleSheet const). ✅
2. `any` -> FAIL [no-explicit-any (+ no-unsafe-return)]. ✅
3. `x as string` -> FAIL [consistent-type-assertions]; `{} as const` -> PASS. ✅
4. 101-char `export const` -> FAIL [max-len]; 114-char `import ... from` -> PASS (errorCount 0). ✅
5. two module-level functions -> FAIL [local/single-declaration]; component + StyleSheet -> PASS. ✅
6. `// eslint-disable-next-line` does NOT suppress (no-explicit-any still fires + unused-directive
   error); `@ts-expect-error` -> FAIL [ban-ts-comment]. ✅
7. `eslint .` lints eslint.config.js + eslint-rules/*.js clean (no projectService "not in
   project" error) — whole-repo run is exit 0. ✅
8. RuleTester 13/13 pass via `npm run lint:rules-test`. ✅
9. Two consecutive `eslint . --format json` runs byte-identical; all lint deps exact-pinned. ✅

## Open questions (resolved)
- Exact eslint 9.x pin -> 9.39.4. RESOLVED.
- `as const` under 'never' on 8.60.0 -> permitted. RESOLVED.
- Keep/drop reportUnusedDisableDirectives -> KEPT as a backstop; `noInlineConfig` is the
  primary gate and the disable fixture confirmed suppression is closed. RESOLVED.
