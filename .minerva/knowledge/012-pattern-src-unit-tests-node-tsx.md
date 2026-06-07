# Pattern: running `src/` TypeScript unit tests (`node --import tsx --test`)

- Type: pattern
- Date: 2026-05-31
- Work unit: 006-clerk-auth
- Related: [[002-pattern-eslint-strict-config-gotchas]] (the `node --test` glob requirement on
  Node 24), [[001-constraint-strict-eslint-guardrails]] (test files are bound by these too),
  [[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]] (the injectable-verifier seam
  that makes the API route testable),
  [[029-pattern-wcag-safe-generated-avatar-colors]] (a property sweep — WCAG contrast with a
  coverage floor — run offline on this runner).

`006-clerk-auth` added the repo's first `src/` unit tests (the `eslint-rules/` tests already ran
under `node --test`, but only over plain `.js`). The reusable mechanics for any future `src` test:

## The runner
`npm test` → `node --import tsx --test "src/**/*.test.ts"`.
- **`tsx` (devDep) is required, not Node's native type-stripping.** Native `--experimental-strip-types`
  does NOT resolve the `@/*` tsconfig path alias and would force orphan explicit `.ts` extensions
  (which exist nowhere else and the lint resolver flags). `tsx` strips types **and** honors
  tsconfig `paths`, so test imports use the same `@/` alias as all other source.
- Use a **glob** argument (`"src/**/*.test.ts"`), not a bare directory — `node --test <dir>`
  behaves badly on Node 24 (see [[002-pattern-eslint-strict-config-gotchas]]). The repo pins
  `engines.node >=22` (Node 22.6+ gives the test runner its TS story and satisfies
  `@clerk/backend`'s `>=20.9`).

## Node types without a repo-wide change
`node:test` / `node:assert` need Node's types, but the project's `tsconfig` (Expo base,
`customConditions: ["react-native"]`) does not surface them by default. Add `@types/node` as a
devDep and put a **file-scoped** `/// <reference types="node" />` at the top of the test file.
This is a TypeScript triple-slash directive, **not** an eslint disable — it is not caught by
`ban-ts-comment` / `noInlineConfig`, and lint passes clean with it. Prefer this over adding
`"types": ["node"]` to `compilerOptions`, which would drop the auto-included global types the
rest of the app relies on.

## Test files obey the strict guardrails
`tsconfig` globs `**/*.ts`, so test files are linted/type-checked under the full strict config —
no `any`, no casts, no inline disables, one function/component per file. Consequences seen:
- `node:test`'s `test(...)` returns a promise, so the bare call trips
  `@typescript-eslint/no-floating-promises` — prefix each with `void test(...)`.
- `await response.json()` is `any`-typed; assign to `unknown` and narrow
  (`typeof body === 'object' && body !== null && 'userId' in body`) before reading fields — no
  cast.
- The one-function-per-file rule counts arrow-consts at module scope, so define test fakes
  **inside** each `test(...)` callback (nested → exempt), not as module-level consts.

## Making impure handlers testable offline
To test a real route/handler that internally calls a singleton (e.g. a Clerk client) without
network or casts, inject the dependency through a **data-const registry** the test reassigns
(a plain `{ current: Fn | null }` object is exempt from the one-function rule). The production
handler reads `registry.current ?? realDefault`, so the *real* handler exercises the typed fake.
The concrete auth instance of this seam is documented in
[[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]].
