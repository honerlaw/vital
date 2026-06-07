# 019 — Sentry crash reporting

## Status

Shipped (2026-06-06) — merged to `main` via PR #25. Approved via `minerva:propose-ship-auto` consensus panels; completion/promote gates user-overridden (see scratchpad run record).

## Goal

Unhandled JS errors and render-phase crashes in production iOS builds report to Sentry;
source maps upload from EAS Release builds so stacks arrive symbolicated; a startup
watchdog makes non-throwing boot hangs visible.

## Why

TestFlight build 5 white-screened at launch with zero telemetry. The live debug session
(2026-06-06) confirmed the failure class is a **non-throwing hang**: Clerk `load()`
fails silently → `isLoaded` stuck `false` → the splash never hides; no exception is
thrown anywhere. Crash reporting alone would not have caught it — hence the watchdog.
[[018-decision-eas-ios-release-workflow]] documents that EAS builds go green even when
the binary is dead on arrival.

Production trigger was environmental (Clerk prod instance config / DNS — fixed
separately); the next environmental failure will be visible in Sentry instead of a
silent white screen.

## Approach

1. **SDK**: `npx expo install @sentry/react-native` (SDK-56-blessed pin). Config plugin
   entry in `app.json` `plugins` (flows through `app.config.ts`'s `...config` spread):
   `["@sentry/react-native/expo", { "organization": "onerlaw-llc", "project": "vital", "url": "https://sentry.io/" }]`.
2. **Metro**: new `metro.config.js` via `getSentryExpoConfig` (assigns debug IDs to
   bundles/source maps).
3. **Init**: `src/observability/init-sentry.ts` — DSN read from
   `EXPO_PUBLIC_SENTRY_DSN` via the `unknown`+`typeof` narrowing pattern
   ([[008-pattern-dynamic-app-config-strict-lint]]); `Platform.OS === 'web'` → return
   `false` (SSR + web client errors intentionally out of scope — server errors live in
   the DigitalOcean logs); no DSN → return `false`; else
   `Sentry.init({ dsn, environment: __DEV__ ? 'development' : 'production' })` →
   `true`. Called at `_layout.tsx` module scope (consistent with the existing
   `preventAutoHideAsync()` precedent); the returned boolean is the watchdog's gate.
4. **Wrap + boundary (core)**: `export default Sentry.wrap(RootLayout)` — verified
   against `eslint-rules/single-declaration.js`: a `MemberExpression` callee (`wrap`)
   is treated as data, `RootLayout` stays the file's single declaration; **no rule
   extension** (a broadened wrapper allowlist would weaken the guardrail). Plus an
   own-file class `ErrorBoundary` (visible fallback + `captureException`) mounted
   under the providers.
5. **Watchdog**: three small files — `boot-milestones.ts` (data map, no functions),
   `record-boot-milestone.ts`, `start-boot-watchdog.ts`. Milestones: `fonts-loaded`
   (`_layout`), `clerk-loaded` + `splash-hidden` (`RootNavigator`), `boot-ready`
   (a transition-observing effect, NOT the pure `bootStatus` selector). Watchdog start
   is platform-guarded (web → no-op) AND gated on the init-succeeded boolean; 10s
   without `splash-hidden` → `captureMessage` with the milestone map.
6. **Source-map token**: `SENTRY_AUTH_TOKEN` delivered as a **sensitive-visibility EAS
   production environment variable** (the upload runs on EAS infra during the build,
   not in the GH runner) via a quarantined `release-ios.yml` step:
   `doppler secrets get SENTRY_AUTH_TOKEN --plain` (masked) → eas-cli env upsert. The
   exact eas-cli verb is verified at implementation against the pinned `eas-cli@^20`
   (candidate: `eas env:create --environment production --visibility sensitive --force
   --non-interactive`; fallback: one-time dashboard creation + docs note). The
   `^EXPO_PUBLIC_` sync filter is untouched. Missing token → loud `::warning::`.
7. **DSN guard**: `EXPO_PUBLIC_SENTRY_DSN` joins the workflow's required-keys loop
   (hard fail; the watchdog is the mitigation for the proven production failure class,
   so a DSN-less Release build is green-but-blind by construction). Deliberate
   asymmetry, documented: token-less builds ship unsymbolicated (degraded), DSN-less
   builds are blocked (dead).
8. **Verification — pre-merge**: `lint` / `typecheck` / `test` / `lint:rules-test`
   green; `npx expo config --type public` asserts the Sentry plugin is present AND
   `extra.eas.projectId` AND `experiments.reactCompiler` survive; `expo export -p web`
   succeeds (init + watchdog both web-guarded, so SSR stays clean); Release sim build
   launches; Sentry delivery proven via a **temporary, uncommitted**
   `captureException` + `flush` call in a local Release sim run (no committed throw,
   no env-gated trigger — an env-gated smoke var would be sticky in the upsert-only
   Doppler→EAS sync and could ship a deliberate crash to users).
9. **Verification — post-merge protocol** (owner: Derek, in PR description): passively
   confirm the first real production event (crash or watchdog message) arrives
   **symbolicated**; forward-fix path if not: check `SENTRY_AUTH_TOKEN` in the EAS env
   and the plugin org/project slugs.
10. **Docs**: `docs/ios-release.md` — both Doppler prd keys
    (`EXPO_PUBLIC_SENTRY_DSN` required, `SENTRY_AUTH_TOKEN` recommended), absent-key
    behavior, the asymmetry rationale, and the post-merge protocol.

### Ordering dependency (satisfied)

PR #23 (Clerk 3.3.1 + iOS splash fix + probe revert) merged to main 2026-06-06 before
this branch was created; the milestone effect is authored against the final
`RootNavigator`.

## Success criteria

1. All pre-merge gates in Approach §8 green.
2. Watchdog verified by artificially stalling a boot gate in a local Release build —
   emit observed with the milestone map (temporary local change, not committed).
3. A deliberate `captureException` from a local Release sim run arrives in the
   `onerlaw-llc/vital` Sentry project.
4. `docs/ios-release.md` updated per Approach §10.
5. Post-merge protocol written into the PR description.

## Open questions

- Watchdog timeout N: default 10s (tunable; no user signal to deviate).

## Inputs

- DSN: `https://709b94ee4053a9e8f140d87365acfab9@o4507030771007488.ingest.us.sentry.io/4511520236568576`
  (user-provided 2026-06-06; goes into Doppler prd as `EXPO_PUBLIC_SENTRY_DSN` — user
  action).
- Org slug `onerlaw-llc`, project slug `vital` (user-provided 2026-06-06).
