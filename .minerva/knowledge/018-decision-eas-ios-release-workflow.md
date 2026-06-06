# Decision: iOS releases ship via EAS Workflows on merge to main

- Type: decision
- Date: 2026-06-05
- Work unit: 013-eas-ios-release-workflow
- Superseded (in part, 2026-06-06): [[020-decision-gh-actions-ios-release-orchestration]]
  — the trigger arrangement (push-triggered via the GitHub-app link), the "no `EXPO_TOKEN`
  secret, no GH-runner orchestration" claim, and setup step 2 (the GitHub↔EAS link). The
  operational facts below remain valid.
- Related: [[006-decision-digitalocean-app-platform-hosting]] (the API origin the production
  env var points at), [[008-pattern-dynamic-app-config-strict-lint]] (the config-linkage
  pattern this unit revised), [[013-decision-doppler-local-env]] (why EAS env vars are a
  separate channel from Doppler)

Release automation runs on **EAS Workflows** (`.eas/workflows/build-and-submit-ios.yml`),
not GitHub Actions *[superseded by 020: GitHub Actions now orchestrates — Doppler→EAS env
sync, then `eas workflow:run`; the EAS workflow is `workflow_dispatch`-only]*: on push to
`main`, a `build` job (ios, production) chains into a `submit` job via the `build_id`
output. EAS runs the workflow on its own infrastructure through the EAS GitHub-app link —
no `EXPO_TOKEN` secret, no GH-runner orchestration *[superseded by 020: the app link was
never installed and is no longer needed; an `EXPO_TOKEN` repo secret now exists]*.
Rejected: GH Actions running `eas build --auto-submit` (token management + duplicated
infra) and a GH-Actions thin trigger via `eas workflow:run` (strictly more indirection)
*[the workflow:run option was later adopted by 020 — its premises changed: the app link
was never completed, and automatic pre-build Doppler→EAS sync forces a CI-side step
anyway]*.

Operational facts that will bite again:

- **EAS builds can't see Doppler or DigitalOcean env.** `EXPO_PUBLIC_*` vars are inlined
  at bundle build time, so the production build profile pins `environment: "production"`
  in `eas.json` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` + `EXPO_PUBLIC_API_URL` MUST exist
  as EAS environment variables. If they're missing the build still goes **green** but the
  binary is dead on arrival: blank Clerk key → ClerkProvider errors at launch; blank API
  URL → relative origin, every native API call fails.
- **`eas submit` is not a public release.** It delivers to App Store Connect (processing →
  TestFlight / "awaiting release"); public availability still needs App Store review plus
  a release action in ASC (keep "Manually release this version").
- **Remote `appVersionSource` + `autoIncrement` bumps only the build number.** The
  marketing `version` in app.json stays manual; TestFlight accepts repeated `1.0.0 (n)`,
  a public release needs a new marketing version.
- **EAS Workflows require one prior completed build** with the same platform + profile —
  the interactive `eas build` that also provisions distribution cert + provisioning
  profile into EAS-managed credentials.
- **Headless submit needs an EAS-hosted App Store Connect API key** (`eas credentials`);
  the workflow cannot prompt.
- **Submit job schema is strict** (`additionalProperties: false`): params are only
  `build_id`/`profile`/`groups` — there is no `platform` param on submit.

The one-time manual setup (six steps: Apple membership, GitHub↔EAS link *[obsolete per
020 — replaced by the `EXPO_TOKEN` + `DOPPLER_TOKEN` GitHub repo secrets]*, production env
vars *[now auto-synced from Doppler prd by 020]*, interactive credential build, ASC API
key, ASC app record) lives in `docs/ios-release.md`, including the dead-on-arrival
warning.
