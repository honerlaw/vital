# 013 — eas-ios-release-workflow

## Status
Draft

## Goal
On every push to `main`, EAS Workflows builds the iOS app (production profile, with
production EAS environment variables inlined) and submits it to App Store Connect. Land the
prerequisite config — EAS project linkage (the user's uncommitted app.json/app.config.ts
diff), an iOS bundle identifier, and `eas.json` — supersede the now-false knowledge entry
008, and document the one-time manual steps the user must perform.

## Why
The repo has PR CI (GitHub Actions: build/test/lint) but no release automation. The user
explicitly asked: "whenever we merge into main, cut an iOS build and submit it to the app
store… use eas for the majority of things." EAS Workflows (not GitHub Actions) is the
EAS-native mechanism: it runs on EAS infrastructure, needs no GitHub secrets, and chains
build → submit via job outputs.

## Approach
**Workflow** — `.eas/workflows/build-and-submit-ios.yml`:

```yaml
name: Build and submit iOS

on:
  push:
    branches: ['main']

jobs:
  build_ios:
    name: Build iOS
    type: build
    params:
      platform: ios
      profile: production

  submit_ios:
    name: Submit to App Store
    type: submit
    needs: [build_ios]
    params:
      build_id: ${{ needs.build_ios.outputs.build_id }}
      profile: production
```

Validated against the live schema (https://api.expo.dev/v2/workflows/schema) via the expo
skill's validate.js.

**`eas.json`**:

```json
{
  "cli": {
    "appVersionSource": "remote"
  },
  "build": {
    "production": {
      "environment": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

- `"environment": "production"` makes the EAS build pull EAS environment variables from the
  project's production environment. The app's two build-time-inlined vars —
  `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (blank → ClerkProvider errors at launch) and
  `EXPO_PUBLIC_API_URL` (blank → relative origin, broken on native) — MUST exist there;
  creating them is manual step 3, and `docs/ios-release.md` spells out the dead-on-arrival
  failure mode if skipped.
- Remote `appVersionSource` + `autoIncrement`: every merge gets a unique EAS-managed build
  number. Marketing version stays `1.0.0` from app.json — fine for TestFlight; a public
  release requires bumping `version` (documented).
- The empty submit profile works only with an EAS-hosted App Store Connect API key (manual
  step 5) — headless submission cannot prompt.

**`app.json` / `app.config.ts`**: add `ios.bundleIdentifier: "com.onerlawllc.vital"`
(proposed; user confirms against their Apple account) and commit the user's uncommitted diff
(`owner: onerlawllc`, `extra.eas.projectId: f642b6c5-1b85-407c-875d-dfaf341ad9b2`, the
guarded spread `...(config.extra ?? {})` in app.config.ts — verified to pass strict lint and
tsc). Fix the now-stale doc comment in app.config.ts.

**Knowledge supersede**: update
`.minerva/knowledge/008-pattern-dynamic-app-config-strict-lint.md` — its claims "app.json
defines no `extra`" and "don't spread `config.extra`" are now false; the guarded spread is
load-bearing (without it the dynamic config clobbers `extra.eas.projectId`) and passes
`no-unsafe-assignment`.

**Auto-submit semantics** (documented; user explicitly asked for submit-on-merge):
`eas submit` delivers the binary to App Store Connect (processing → TestFlight / "awaiting
release"), NOT directly to public users; public release still requires App Store review and
a release action in ASC (recommend "Manually release this version"). Rapid merges can
queue/supersede in review — acceptable at single-dev cadence; a future refinement could gate
submit behind manual dispatch.

**Sequencing note**: until manual steps 1–6 complete, every push to main fires a workflow
that fails (missing credentials/env). Documented; the first red run is expected, not a
regression.

**Manual steps** (documented in `docs/ios-release.md`):
1. Apple Developer Program membership active.
2. Link the GitHub repo to the EAS project at expo.dev (install/authorize the EAS GitHub
   app) — push triggers won't fire without it.
3. Create production EAS environment variables `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and
   `EXPO_PUBLIC_API_URL` (`eas env:create --environment production` or the expo.dev
   dashboard).
4. Run `eas build --platform ios --profile production` once interactively to provision the
   distribution certificate + provisioning profile into EAS-managed credentials (also
   satisfies the workflows' one-prior-build prerequisite).
5. Configure an App Store Connect API key into EAS-managed credentials (`eas credentials` →
   iOS → App Store Connect API Key) so headless submit works.
6. Create/verify the App Store Connect app record with the confirmed bundle identifier.

## Success criteria
1. `.eas/workflows/build-and-submit-ios.yml` validates against the official EAS workflow
   JSON schema (validate.js passes).
2. `eas.json` exists with remote `appVersionSource`; production build profile has
   `environment: "production"` AND `autoIncrement: true`; production submit profile present.
3. `app.json` carries `owner`, `extra.eas.projectId`, and an `ios.bundleIdentifier`
   (proposed `com.onerlawllc.vital`); `npx expo config --type public` still reports scheme,
   all plugins, experiments, AND `extra.eas.projectId` (no static-config loss).
4. Repo gates pass: ESLint (`--max-warnings 0`), `tsc --noEmit`, unit tests.
5. `docs/ios-release.md` exists enumerating all 6 manual steps including the env-var
   dead-on-arrival warning and the TestFlight-not-public submission semantics.
6. Knowledge entry 008 updated so it no longer asserts "don't spread `config.extra`" /
   "app.json defines no `extra`"; documents the guarded-spread pattern and when it's
   required.

## Open questions
- Bundle identifier `com.onerlawllc.vital` is proposed, not confirmed — manual step 6 covers
  registering/confirming it.
- Android intentionally out of scope (user asked iOS only).
- Submit-gating (manual dispatch instead of auto-submit) deliberately NOT adopted — the user
  explicitly asked for submit-on-merge; semantics documented instead.
