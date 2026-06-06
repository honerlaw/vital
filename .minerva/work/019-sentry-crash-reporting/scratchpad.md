# Scratchpad — 019-sentry-crash-reporting

## Panel decisions 2026-06-06

- [2/3 accept r2, votes exhausted — scope question itself unanimous both rounds] scope
  check: single unit (Skeptic dissent was content-contract only; Arbiter ruled the five
  parts share one conjunctive definition of done; 006/013/021 precedent)
- [accept r2 2/3 — selection uncontested; Skeptic residuals ruled content obligations]
  approach selection: A full wiring (rejected: B crash-only — Hermes-minified stacks
  fail the symbolication goal; C expo-observe — metrics only, no stack traces)
- [accept — final amended text; Skeptic round-2 prescriptions adopted verbatim]
  whole-proposal acceptance. Key amendments across rounds: drop the single-declaration
  rule extension (rule provably ignores Sentry.wrap); env-gated smoke test REMOVED
  (sticky in upsert-only Doppler→EAS sync — deliberate-crash-shipping risk) → temporary
  uncommitted captureException+flush for pre-merge, passive post-merge symbolication
  check; hard ordering dependency on the debug-fix PR (#23, merged before fork);
  boot-ready milestone via transition effect not the pure bootStatus selector; watchdog
  platform-guarded + init-boolean-gated; environment tagging; token routed to the EAS
  build env (not GH runner); DSN hard-require vs token warn asymmetry documented.

## Panel concerns carried into work

- Verify @sentry/react-native types are clean under recommendedTypeChecked (was
  uninstalled at proposal time) — covered by the typecheck gate.
- eas-cli env verb verified at implementation against pinned eas-cli@^20.

## Work log 2026-06-06

- @sentry/react-native 7.11.0 via `npx expo install` (SDK-56 pin) — types clean under
  recommendedTypeChecked (typecheck gate green, panel concern retired).
- `eas env:create` verified against pinned eas-cli@^20: `--visibility sensitive`
  + `--force` (overwrite) + positional environment all exist. Panel concern retired.
- Gates: lint / typecheck / test (45) / lint:rules-test (20) all green first pass.
- Resolved-config asserts green: sentry plugin {onerlaw-llc, vital} present,
  extra.eas.projectId intact, reactCompiler true, extra.router intact.
- export:web green through getSentryExpoConfig (SSR clean).
- Sentry.wrap default export passed lint as predicted (no rule extension).
- Release sim verification run in flight: TEMP uncommitted delivery-test
  (captureException+flush at 4s) + watchdog stall (splash-hidden record suppressed
  → watchdog message at 10s). Both events expected in onerlaw-llc/vital.
