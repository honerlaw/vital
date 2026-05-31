# 001 — Strict deterministic ESLint guardrails

## Status
Draft

## Goal
Add a maximally strict, deterministic, **ESLint-native** guardrail config to this
Expo SDK 56 TypeScript app that enforces the following invariants and makes them
impossible to bypass:

- Ban `any` (explicit and unsafe/implicit-via-type-info).
- Ban type-assertion casts (`x as Foo`, `<Foo>x`, non-null `!`) — **except `as const`**.
- Enforce ~100-column line length as a hard error.
- Enforce **one function/component per file** (data consts, types, interfaces exempt).
- Make lint suppression impossible (no inline disables, no `@ts-ignore` family).
- Be fully deterministic and reproducible (exact-pinned lint deps, `--max-warnings 0`).

## Why
Code-quality invariants enforced only by convention erode silently. Encoding them at
the tooling layer — as ESLint errors that cannot be suppressed and that fail the lint
gate deterministically — makes them durable and un-negotiable. The user explicitly
wants guardrails "as explicit as possible," "entirely deterministic," and prefers an
ESLint plugin over a standalone script.

## Approach
A pure ESLint **flat config** (`eslint.config.js`) layered on `eslint-config-expo/flat`,
plus one small local custom rule. No separate enforcement script; no Prettier (its
`printWidth` is a soft target, which weakens the hard-line-length requirement).

### Dependencies (exact-pinned — lint toolchain only)
Deliberately diverges from the repo's `~` convention for the lint toolchain so the
guardrail is byte-reproducible. Expo-managed runtime deps keep their `~` ranges.

- `eslint` — latest 9.x compatible with `eslint-config-expo@56` (exact pin chosen in work).
- `eslint-config-expo@56.0.4` (bundles `@typescript-eslint/parser`, `eslint-plugin-react`,
  `eslint-plugin-react-hooks`, `eslint-plugin-import`).
- `typescript-eslint@8.60.0` (peer-supports `typescript >=4.8.4 <6.1.0`; repo has `~6.0.3`).
- `@stylistic/eslint-plugin@5.10.0`.

### `eslint.config.js` layers (order is load-bearing)
1. `globalIgnores`: `dist/*`, `.expo/*`, `node_modules/*`, `/ios`, `/android`,
   `expo-env.d.ts`, `.minerva/*`.
2. `eslint-config-expo/flat`.
3. `tseslint.configs.recommendedTypeChecked`, **scoped** `files: ['**/*.ts', '**/*.tsx']`,
   with `languageOptions.parserOptions.projectService: true` + `tsconfigRootDir`.
4. **Strict rules block** (`files: ['**/*.ts','**/*.tsx']`, placed **after** the expo
   spread so it overrides expo's defaults — expo sets `consistent-type-assertions` to
   `warn`/`'as'`, which we must override):
   - `@typescript-eslint/no-explicit-any: 'error'`
   - `@typescript-eslint/no-non-null-assertion: 'error'`
   - `@typescript-eslint/consistent-type-assertions: ['error', { assertionStyle: 'never' }]`
     (verified during work to still permit `as const`).
   - `@typescript-eslint/ban-ts-comment: ['error', { 'ts-ignore': true, 'ts-expect-error': true, 'ts-nocheck': true, 'ts-check': false }]`
   - `@stylistic/max-len: ['error', { code: 100, tabWidth: 2, ignoreUrls: true, ignoreTemplateLiterals: true, ignorePattern: '^\\s*(import|export)\\s' }]`
   - `react/no-multi-comp: ['error', { ignoreStateless: false }]`
   - local `single-declaration: 'error'`.
5. `tseslint.configs.disableTypeChecked` override for `**/*.js` (covers `eslint.config.js`
   and `eslint-rules/*.js`, which are CommonJS and not in the TS program) + node globals.
6. `linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'error' }`
   — `noInlineConfig` is the real gate (inline `eslint-disable` directives are ignored,
   so the underlying error still fires); `reportUnusedDisableDirectives` is a backstop.

### Local custom rule `single-declaration` (`eslint-rules/single-declaration.js`)
Wired as a flat-config plugin (this is an ESLint plugin, satisfying "plugin not script").
Counts, in the `Program` body:
- `FunctionDeclaration`
- `ClassDeclaration`
- `VariableDeclarator` whose `init` (after unwrapping **one** `CallExpression` layer,
  e.g. `memo(...)` / `forwardRef(...)`) is an `ArrowFunctionExpression` or
  `FunctionExpression`.

Errors on the **second** such declaration. Does **not** count plain data consts
(`StyleSheet.create(...)`, objects, primitives), `type`/`interface`/`enum`, re-exports,
or imports. **Implementation note (load-bearing):** the rule must report on **each
counted node as it passes the first** — reporting on a deferred/aggregate node lets the
FAIL fixtures silently no-op. Ships with `RuleTester` fixtures run via `node --test`.

### Scripts
- `"lint": "eslint . --max-warnings 0"` (replaces `expo lint`).
- `"lint:rules-test": "node --test eslint-rules/"`.

## Success criteria
1. `npm run lint` exits 0 on the existing source: `src/app/index.tsx`
   (`HomeScreen` component + `StyleSheet.create` const) and `src/app/_layout.tsx`
   (`RootLayout` component) both remain compliant.
2. A file using `any` fails lint (`no-explicit-any`).
3. `x as Foo` fails lint; `x as const` passes (hard fixture, via whichever mechanism wins).
4. A 101-column line of normal code fails lint; a 101-column `import` line passes.
5. A file with two module-level functions/components fails lint; a component plus a
   `StyleSheet.create` const passes.
6. An `// eslint-disable*` comment does **not** suppress an error; `@ts-ignore` and
   `@ts-expect-error` fail lint.
7. `eslint .` lints `eslint.config.js` and `eslint-rules/*.js` cleanly — no `projectService`
   "file not found in any project" error (verifies the `disableTypeChecked` override).
8. The `single-declaration` `RuleTester` fixtures pass (`npm run lint:rules-test`):
   single component OK; component + `StyleSheet.create` const OK; `memo`/`forwardRef`
   single component OK; type-alias + component OK; two functions FAIL; helper + component FAIL.
9. Two consecutive `npm run lint` runs produce identical output; all lint deps exact-pinned.

## Open questions
- Exact `eslint` version to pin (latest 9.x compatible with `eslint-config-expo@56`).
- Confirm `consistent-type-assertions: 'never'` permits `as const` on the installed
  `typescript-eslint@8.60.0` (panel verified empirically; re-confirm in work). If it does
  not, fall back to `no-restricted-syntax` banning `TSAsExpression`/`TSTypeAssertion`
  except `as const`, with its own fixture.
- Whether `reportUnusedDisableDirectives` adds value alongside `noInlineConfig` or is inert.

## Accepted trade-offs
- "One function/component per file" will block multi-function util/hook files by design.
  This is the intended cost of "maximally strict" — helpers move to their own files.
- `max-len` + `noInlineConfig` leaves no escape for genuinely unbreakable tokens; the
  `import`/`export` + URL + template-literal exemptions cover the known unbreakable cases.

## Panel provenance
Approved via `minerva:propose-ship-auto` consensus panels — scope (single unit, 2/3 +
arbiter), approach (A, unanimous on choice), whole-proposal (3/3 accept). See `scratchpad.md`.
