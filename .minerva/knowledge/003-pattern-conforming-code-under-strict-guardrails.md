# Pattern: writing app .ts/.tsx that passes the 001 strict guardrails

- Type: pattern
- Date: 2026-05-31
- Work unit: 002-ui-component-library
- Related: [[001-constraint-strict-eslint-guardrails]] (the invariants this code must satisfy),
  [[002-pattern-eslint-strict-config-gotchas]] (the *config-author* side; this entry is the
  *application-author* side — given the guardrails as fixed, how to write conforming code),
  [[004-pattern-expo56-react-compiler-hook-rules]] (the react-hooks rules that also bind code)

Concrete, reusable techniques for writing feature code under the un-bypassable 001 lint
(`no any`, no casts except `as const`, 100-col, one function/component per file, no suppression).
Discovered building the VITAL UI. Reach for these from the start rather than at lint time.

## Core techniques

- **Split a multi-function module into one-function-per-file + a re-export barrel.** The provided
  `programs.ts` had 11 module-level `export const fn = () => …` arrow consts — each counts as a
  declaration under `local/single-declaration`, so the file fails by 10. Fix: one helper per file
  under a dir, plus an `index.ts` of pure `export { fn } from './fn'` re-exports (re-exports are
  exempt). Callers keep importing the same free-function names; only file boundaries move. (An
  `export const obj = { fn: () => … }` object-of-arrows is also legal as a single data const, but
  the barrel preserves the free-function public API.)
  *Extends to multi-method Expo API routes (012):* a `+api.ts` needing both `GET` and `PUT` would
  be two declarations in one file. Same fix — the implementations live one-function-per-file in
  `src/server/routes/<route>-<method>.ts` and the route file is pure re-exports
  (`export { GET } from '@/server/routes/me-state-get'`), which expo-router serves identically.
  Single-method routes stay inline (see [[017-pattern-per-user-state-persistence]]).

- **Use `satisfies Record<K, V>` instead of a `: Record<K, V>` annotation when you need both the
  type-check AND the literal keys.** `theme.ts` exports a `type` presets object consumed by
  `AppText` as `variant: keyof typeof theme.type`. A `: Record<string, TextStyle>` annotation
  *widens* the type, collapsing `keyof` to `string` — every `<AppText variant="…">` would then
  accept any string and `theme.type[variant]` could be `undefined` at runtime with no error.
  `satisfies Record<string, TextStyle>` checks assignability while *preserving* the literal key
  union, so the `variant` prop is exhaustively typed. `satisfies` is not a cast and is unaffected
  by `consistent-type-assertions`. It also contextually types nested array literals
  (`fontVariant: ['tabular-nums']` infers `FontVariant[]`, not `string[]`).

- **Build typed arrays with `Array.from({ length: n }, () => v)`, not `Array(n).fill(v)`.**
  `Array(n).fill(false)` infers `any[]`, which trips the type-aware `no-unsafe-assignment` /
  `no-unsafe-return` rules (and `Array(n)` alone is sparse). `Array.from({ length: n }, () => false)`
  infers `boolean[]` and is equivalent for all `n ≥ 0`.

## Misc no-cast / no-any gotchas (one-offs, kept for reference)

- **`void promise`** satisfies `@typescript-eslint/no-floating-promises` for fire-and-forget calls
  (e.g. `void SplashScreen.preventAutoHideAsync();`). It is the operator, not a cast — allowed.
- **`import * as ns from '…'`** dodges `import/no-named-as-default` /
  `no-named-as-default-member` when a module has a default export whose name collides with a named
  export (e.g. `theme.ts` exports both `default theme` and `export const type`). The namespace
  import also sidesteps the `import { type as … }` keyword ambiguity.
- **Derive a vendored lib's prop type via utility types instead of a deep import.**
  `@react-navigation/bottom-tabs` is vendored inside `expo-router` and not re-exported by name, so
  `BottomTabBarProps` is not importable cleanly. Derive it from the public component:
  `type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];`. No cast,
  no fragile `expo-router/build/...` path.
  *Extends to hook return types (020):* `@clerk/expo` doesn't re-export its resource types, and
  the obvious fallbacks are traps — `@clerk/shared/types` is a transitive dep, and
  `@clerk/backend` exports a DIFFERENT 4-member `SignInStatus` union than the frontend's
  6-member one. Derive from the hook instead:
  `type SignInResource = ReturnType<typeof useSignIn>['signIn']` then index
  (`SignInResource['status']`, `SignInResource['supportedSecondFactors'][number]`). Version-proof
  and cast-free.

- **Cast-free exhaustive switch: explicit return type + closed switch, no default arm.** A
  function with a declared non-optional return type whose body is a `switch` over a closed union
  (every member a `case`, no `default`) is exhaustiveness-checked by plain `strict` tsc: deleting
  a case is `TS2366` ("lacks ending return statement") — mutation-tested in work 020; no
  `noImplicitReturns`, no `never`-typed fallthrough variable, no cast, so it satisfies
  `assertionStyle: 'never'`. A future union member added upstream becomes a compile error
  instead of a silent fallthrough (the load-bearing property of
  [[026-bug-clerk-finalize-intermediate-status]]'s status gate).
