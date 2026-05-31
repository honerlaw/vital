# Pattern: ESLint strict-config gotchas (editing eslint.config.js)

- Type: pattern
- Date: 2026-05-31
- Work unit: 001-strict-lint-guardrails
- Related: [[001-constraint-strict-eslint-guardrails]] (the invariants these rules enforce)

Hard-won, non-obvious facts for anyone editing `eslint.config.js`, `eslint-rules/`, or the
lint scripts. Several were discovered by closing real bypasses — re-introducing them silently
reopens holes.

## max-len exemptions must be structurally anchored — whole-line exemptions are bypasses
`@stylistic/max-len`'s `ignoreUrls`, `ignoreStrings`, and `ignoreTemplateLiterals` each exempt
the **entire line**, not just the offending token. They were tried and **removed**: a 110-col
line passed merely by ending in a `// https://...` comment (`ignoreUrls`), and a 112-col line
passed by wrapping an expression in backticks (`ignoreTemplateLiterals`). Do **not** re-enable
them — they are trivial, deterministic bypasses of a cap that is meant to be un-bypassable.

`ignorePattern` is also a hole if written as a prefix/substring match. Two earlier forms leaked:
- `^\s*(import|export)\s` exempted every `export const`/`export function` code line.
- `^\s*(import|export)\b.*\bfrom\b` exempted any line that merely *contained* the word `from`
  (an object key `{ from: x }`, a string "... from ..."). 

The rule: **anchor an exemption to a full structural match**, not a line prefix or a loose
substring. The surviving, safe pattern matches only complete module-specifier statements:
`^\s*(import|export)\b.*\bfrom\s+['"][^'"]*['"];?\s*$|^\s*import\s+['"][^'"]*['"];?\s*$`
(ends in `from '...';` or is a bare `import '...';`). Such a line cannot smuggle arbitrary code.

## consistent-type-assertions `'never'` permits `as const`
On `typescript-eslint@8.60.0`, `consistent-type-assertions: { assertionStyle: 'never' }` blocks
`x as Foo`, `<Foo>x`, and `x as unknown as T` but **permits** all `as const` forms. Verified by
direct `Linter` probe. No `no-restricted-syntax` fallback is needed — don't add one.

## The local `single-declaration` rule has three load-bearing subtleties
- **Report on each counted node as it passes the first.** Aggregating and reporting on one
  deferred node makes the FAIL cases silently no-op (the worst failure for a guardrail).
- **Unwrap wrapper calls by an allow-list of callee names** (`memo`, `forwardRef`, incl.
  `React.`-prefixed), NOT by unwrapping any `CallExpression`. Unwrapping arbitrarily miscounts
  data as functions: `[].map(fn)`, `debounce(fn)`, `StyleSheet.create({})` must stay data.
- **Count anonymous/wrapper default exports but not identifier re-exports.** `export default
  () => ...`, `export default memo(...)`, `export default forwardRef(...)` are declarations and
  must count (this was an initial miss). `export default <Identifier>` references an
  already-counted declaration and must NOT double-count.

## projectService type-checked rules must be scoped, with a `.js` escape
`recommendedTypeChecked` + `parserOptions.projectService: true` throws "file not found in any
project" on files outside the TS program. Scope the type-checked configs and the strict rules
to `files: ['**/*.ts','**/*.tsx']`, and add a `**/*.js` override applying
`tseslint.configs.disableTypeChecked` (+ Node globals) so `eslint.config.js` and `eslint-rules/*.js`
(CommonJS, not in tsconfig) lint clean. Also `globalIgnores` `.expo/*`, `dist/*`, generated types.

## `node --test <dir>` fails on Node 24
Node 24 treats `node --test eslint-rules/` as a module entry point ("Cannot find module
.../eslint-rules"). Use a shell-expanded glob instead: `node --test eslint-rules/*.test.js`.
Wire `RuleTester` to the node test runner with `RuleTester.describe = test.describe;
RuleTester.it = test.it;`.
