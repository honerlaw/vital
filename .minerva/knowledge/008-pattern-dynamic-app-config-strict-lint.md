# Pattern: a dynamic app.config.ts under the strict-lint guardrails

- Type: pattern
- Date: 2026-05-31 (revised 2026-06-05 by 013 — `extra` guidance inverted, see below)
- Work unit: 005-digitalocean-hosting; revised by 013-eas-ios-release-workflow
- Related: [[003-pattern-conforming-code-under-strict-guardrails]] (sibling: feature-code
  techniques), [[001-constraint-strict-eslint-guardrails]] (the rules this conforms to),
  [[006-decision-digitalocean-app-platform-hosting]] (why the origin is injected),
  [[018-decision-eas-ios-release-workflow]] (the decision that added `extra.eas.projectId`
  and forced the revision below)

Adding an `app.config.ts` (dynamic Expo config, layered over `app.json`) hits two distinct
traps: one Expo-config semantic, one strict-lint. Both bit during 005; write to them from the
start. The shipped file injects `extra.router.origin` (the API-routes origin for native
clients) from `EXPO_PUBLIC_API_URL`, preserving the rest of the static `extra` (since 013:
`extra.eas.projectId`, the EAS project linkage).

## Expo semantic: a dynamic config REPLACES app.json unless you spread `...config`
In SDK 56, when both exist, `@expo/config` passes the static `app.json` as the `config` argument
and only treats it as a base if the function spreads it. Return a bare object and you **silently
drop** `scheme`, `plugins`, `experiments.reactCompiler`, splash, platform config — verified
against `@expo/config`'s `hasBaseStaticConfig`/`hasUnusedStaticConfig` machinery. Always
`...config`, and verify nothing was lost with `npx expo config --type public` (it should still
report scheme, all plugins, `web.output`, `experiments`).

## Strict-lint: spread `config.extra` WITH a `?? {}` guard; `process.env` reads are `any`
**Revised 2026-06-05 (013).** This section originally said "don't spread `config.extra`" on
the premise that `app.json` defines no `extra`. That premise died when 013 added
`extra.eas.projectId` (the EAS project linkage) to `app.json`: the function's returned
`extra` REPLACES the static one wholesale, so returning a bare `extra: { router }` now
silently clobbers `extra.eas.projectId` and breaks EAS project resolution. The spread is
**load-bearing** — and the guarded form `...(config.extra ?? {})` passes
`@typescript-eslint/no-unsafe-assignment` (verified: `eslint --max-warnings 0` and
`tsc --noEmit` both clean), so the original lint objection doesn't apply to it.

`process.env.EXPO_PUBLIC_*` is typed `any` here (no `@types/node` in the typecheck graph),
so reading it directly trips `no-unsafe-assignment`. Read it through `unknown` and narrow
with `typeof` — **no cast** (casts are banned, [[001]]):

```ts
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): Partial<ExpoConfig> => {
  const rawOrigin: unknown = process.env.EXPO_PUBLIC_API_URL;
  const origin = typeof rawOrigin === 'string' && rawOrigin.length > 0 ? rawOrigin : false;
  return { ...config, extra: { ...(config.extra ?? {}), router: { origin } } };
};
```

Verify with `npx expo config --type public` that `extra.eas.projectId` AND `extra.router`
both survive.

Note the return type is **`Partial<ExpoConfig>`**: `ConfigContext.config` is `Partial<ExpoConfig>`,
so spreading it cannot satisfy the required `name`/`slug` of a full `ExpoConfig`. An empty/unset
env yields `origin: false` (relative origin — Expo's expected default).
