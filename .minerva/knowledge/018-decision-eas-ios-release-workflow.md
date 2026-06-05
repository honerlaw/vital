# Decision: iOS releases ship via EAS Workflows on merge to main

- Type: decision
- Date: 2026-06-05
- Work unit: 013-eas-ios-release-workflow
- Related: [[006-decision-digitalocean-app-platform-hosting]] (the API origin the production
  env var points at), [[008-pattern-dynamic-app-config-strict-lint]] (the config-linkage
  pattern this unit revised), [[013-decision-doppler-local-env]] (why EAS env vars are a
  separate channel from Doppler)

Release automation runs on **EAS Workflows** (`.eas/workflows/build-and-submit-ios.yml`),
not GitHub Actions: on push to `main`, a `build` job (ios, production) chains into a
`submit` job via the `build_id` output. EAS runs the workflow on its own infrastructure
through the EAS GitHub-app link — no `EXPO_TOKEN` secret, no GH-runner orchestration.
Rejected: GH Actions running `eas build --auto-submit` (token management + duplicated
infra) and a GH-Actions thin trigger via `eas workflow:run` (strictly more indirection).

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

The one-time manual setup (six steps: Apple membership, GitHub↔EAS link, production env
vars, interactive credential build, ASC API key, ASC app record) lives in
`docs/ios-release.md`, including the dead-on-arrival warning.
