# Constraint: strict ESLint guardrails bind all code

- Type: constraint
- Date: 2026-05-31
- Work unit: 001-strict-lint-guardrails
- Related: [[002-pattern-eslint-strict-config-gotchas]] (enforcement mechanics + config gotchas)

As of 2026-05-31 this repo enforces a maximally strict, deterministic, ESLint-native
guardrail. `npm run lint` (`eslint . --max-warnings 0`) is the gate; it is **un-bypassable**
(see below). All TypeScript source (`**/*.ts`, `**/*.tsx`) must satisfy these invariants —
write code to them from the start rather than discovering them at lint time:

- **No `any`.** `@typescript-eslint/no-explicit-any` plus the type-aware `no-unsafe-*` rules
  (`recommendedTypeChecked`) are errors. Type things properly; don't reach for `any`.
- **No casts except `as const`.** `consistent-type-assertions` is `assertionStyle: 'never'`,
  so `x as Foo`, `<Foo>x`, and non-null `!` are all errors. `as const` is allowed. Model the
  types so assertions aren't needed.
- **Hard 100-column lines.** `@stylistic/max-len` `code: 100`. The ONLY exempt lines are
  module specifiers (`import ... from '...'`, `export ... from '...'`, bare `import '...'`).
  Long `export const`/`export function`/comment/string/template lines must wrap — there is no
  URL/string/template escape.
- **One function/component per file.** `react/no-multi-comp` + the local `local/single-declaration`
  rule. Data consts (`StyleSheet.create`, objects), `type`/`interface`/`enum`, and re-exports
  are exempt, but a file may contain at most one module-level function/component declaration
  (named, anonymous default, or `memo`/`forwardRef`-wrapped). **Helpers and hooks go in their
  own files** — co-locating a helper with a component is a lint error.
- **No suppression.** `linterOptions.noInlineConfig: true` makes every inline `eslint-disable*`
  directive inert (the underlying error still fires, and the dead directive is itself reported
  and fails `--max-warnings 0`). `@typescript-eslint/ban-ts-comment` bans `@ts-ignore`,
  `@ts-expect-error`, and `@ts-nocheck`. There is no way to silence a rule locally — fix the
  code or change the shared config deliberately.
- **Deterministic.** The lint toolchain is exact-pinned (`eslint`, `eslint-config-expo`,
  `typescript-eslint`, `@stylistic/eslint-plugin`, `globals`); two runs are byte-identical.

The local rule ships with `RuleTester` fixtures: `npm run lint:rules-test`. Strict rules are
currently scoped to `.ts`/`.tsx`; the config and rule `.js` files get base expo +
`disableTypeChecked` only (see followups.md).

Operational note (hit in work 011): a git **worktree resolves `node_modules` from the parent
repo**, so a stale parent install fails `lint`/`typecheck` inside the worktree on files unrelated
to your diff (e.g. `@types/pg` declared in package.json but never installed locally). If worktree
gates fail on untouched files, `npm install` in the parent repo first.

A second, distinct worktree failure mode (hit in work 012): npm scripts that reference
node_modules by **literal relative path** (e.g. `migrate`'s
`node node_modules/node-pg-migrate/bin/…`) fail in a worktree with `MODULE_NOT_FOUND` — unlike
import *resolution*, a relative path does not walk up to the parent. Workaround: invoke the bin
via the parent repo's absolute `node_modules` path (the worktree's `migrations/` dir is still
picked up from the cwd).
