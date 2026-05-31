# Pattern: a dynamic app.config.ts under the strict-lint guardrails

- Type: pattern
- Date: 2026-05-31
- Work unit: 005-digitalocean-hosting
- Related: [[003-pattern-conforming-code-under-strict-guardrails]] (sibling: feature-code
  techniques), [[001-constraint-strict-eslint-guardrails]] (the rules this conforms to),
  [[006-decision-digitalocean-app-platform-hosting]] (why the origin is injected)

Adding an `app.config.ts` (dynamic Expo config, layered over `app.json`) hits two distinct
traps: one Expo-config semantic, one strict-lint. Both bit during 005; write to them from the
start. The shipped file injects only `extra.router.origin` (the API-routes origin for native
clients) from `EXPO_PUBLIC_API_URL`.

## Expo semantic: a dynamic config REPLACES app.json unless you spread `...config`
In SDK 56, when both exist, `@expo/config` passes the static `app.json` as the `config` argument
and only treats it as a base if the function spreads it. Return a bare object and you **silently
drop** `scheme`, `plugins`, `experiments.reactCompiler`, splash, platform config — verified
against `@expo/config`'s `hasBaseStaticConfig`/`hasUnusedStaticConfig` machinery. Always
`...config`, and verify nothing was lost with `npx expo config --type public` (it should still
report scheme, all plugins, `web.output`, `experiments`).

## Strict-lint: you cannot spread `config.extra`, and `process.env` reads are `any`
The injected `config.extra` is typed `{ [k: string]: any }`; spreading it trips
`@typescript-eslint/no-unsafe-assignment`. `app.json` defines no `extra` at eval time
(expo-router fills `extra.router` later in the pipeline), so **don't spread `config.extra`** —
`...config` already preserves every top-level key. Likewise `process.env.EXPO_PUBLIC_*` is typed
`any` here (no `@types/node` in the typecheck graph), so reading it directly also trips
`no-unsafe-assignment`. Read it through `unknown` and narrow with `typeof` — **no cast** (casts
are banned, [[001]]):

```ts
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): Partial<ExpoConfig> => {
  const rawOrigin: unknown = process.env.EXPO_PUBLIC_API_URL;
  const origin = typeof rawOrigin === 'string' && rawOrigin.length > 0 ? rawOrigin : false;
  return { ...config, extra: { router: { origin } } };
};
```

Note the return type is **`Partial<ExpoConfig>`**: `ConfigContext.config` is `Partial<ExpoConfig>`,
so spreading it cannot satisfy the required `name`/`slug` of a full `ExpoConfig`. An empty/unset
env yields `origin: false` (relative origin — Expo's expected default).
