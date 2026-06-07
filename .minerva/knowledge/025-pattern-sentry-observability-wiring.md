# Pattern: Sentry crash reporting + startup watchdog under the strict guardrails

- Type: pattern
- Date: 2026-06-06
- Work unit: 019-sentry-crash-reporting (PR #25)
- Related: [[023-bug-clerk-isloaded-boot-hang]] (the non-throwing hang class the
  watchdog exists for), [[016-pattern-ssr-safe-startup-hydration-gate]] (why init is
  web/SSR-guarded), [[008-pattern-dynamic-app-config-strict-lint]] (the env-read
  narrowing init reuses), [[018-decision-eas-ios-release-workflow]] (the required-keys
  guard the DSN joined), [[001-constraint-strict-eslint-guardrails]] (shapes every
  file below)

How VITAL wired `@sentry/react-native` 7.x (Expo SDK 56, Hermes, reactCompiler,
`web.output: "server"`). Load-bearing facts:

## Crash reporting alone misses the worst failure class
The motivating production bug threw NOTHING ([[023]]). Hence the **startup watchdog**:
`boot-milestones.ts` (a `Set` — pure data) + `record-boot-milestone.ts` +
`start-boot-watchdog.ts` (one function per file). Milestones are recorded **from
effects, never during render** (React Compiler). `splash-hidden` is recorded only
after `hideAsync()` resolves; 10s without it → `captureMessage` with the milestone
map. The watchdog is double-guarded: `Platform.OS === 'web'` (a module-scope Node
`setTimeout` would fire per SSR render) AND on `initSentry()`'s returned boolean
(no DSN → dead client → the emit would silently drop).

## Init shape
`init-sentry.ts` returns `boolean`; web/SSR → false; DSN absent → false; else
`Sentry.init({ dsn, environment: __DEV__ ? 'development' : 'production' })`. Called at
`_layout.tsx` module scope (same precedent as `preventAutoHideAsync`). Web client
errors are deliberately unobserved (server errors → DO logs) — a future unit.

## Lint reconciliations (verified, not guessed)
- `export default Sentry.wrap(RootLayout)` passes `local/single-declaration` AS-IS:
  the rule only counts `memo`/`forwardRef` call-wrappers; a `MemberExpression` callee
  (`wrap`) is data. Do NOT extend the rule's allowlist — that would weaken it.
- The ErrorBoundary is an own-file class with a bare-RN-primitives fallback (the
  broken subtree may be the UI library) mounted under the providers.

## Build pipeline
- Plugin entry in `app.json` rides `app.config.ts`'s `...config` spread; assert with
  `npx expo config --type public` that the plugin AND `extra.eas.projectId` AND
  `experiments.reactCompiler` all survive.
- `metro.config.js` = `getSentryExpoConfig(__dirname)` (debug IDs); `expo export -p
  web` still builds — it wraps Expo's default config, nothing is lost.
- `EXPO_PUBLIC_SENTRY_DSN` is in the release workflow's **required-keys hard guard**
  (a DSN-less Release build is green-but-blind — the exact [[018]] class).
  `SENTRY_AUTH_TOKEN` is **warn-only** and flows via its own
  `eas env:create production --visibility sensitive --force` step so it reaches the
  EAS BUILD environment without entering the client bundle — never widen the
  `^EXPO_PUBLIC_` sync filter for it. Asymmetry is deliberate: token-less builds ship
  unsymbolicated (degraded), DSN-less builds are blocked (dead).
- Do NOT use an env-gated test-throw for verification: the Doppler→EAS sync is
  upsert-only, so such a var is sticky and could ship a deliberate crash. Pre-merge
  verification = temporary uncommitted `captureException` + `flush` in a Release sim;
  post-merge = the first real event must arrive symbolicated.
