# Decision: VITAL web + API is hosted on DigitalOcean App Platform

- Type: decision
- Date: 2026-05-31
- Work unit: 005-digitalocean-hosting
- Related: [[007-pattern-expo-router-server-self-host]] (the how),
  [[008-pattern-dynamic-app-config-strict-lint]] (the origin config it needs),
  [[018-decision-eas-ios-release-workflow]] (the iOS release pipeline whose production
  EXPO_PUBLIC_API_URL points at this hosting)

VITAL's web target (static client + Expo Router API/SSR routes) is hosted as a **single
DigitalOcean (DO) App Platform web-service component**, built by the Node buildpack and run by
`server.js`. This is the chosen backend substrate; future server-side work (API routes, a DB)
lives here unless consciously revisited.

## Why DO App Platform, not EAS Hosting / Cloudflare Workers
EAS Hosting runs API routes on Cloudflare Workers — no Node `fs`, no persistent TCP, ~30s CPU
limits, edge-DB only. DO App Platform gives a **full Node runtime**: real `fs`, ordinary TCP
database connections, long-running processes, and a path to **DO Managed Postgres** later (an
ordinary `pg` client with the URL as a `RUN_TIME` Doppler secret). It also consolidates hosting
on the platform the user already chose. The tradeoff accepted: no always-on free tier (smallest
service ~$5/mo), and we own the `server.js` entry + `.do/app.yaml` that EAS would abstract.

## Secrets & env: Doppler native integration
Env/secrets are managed in **Doppler** and synced into the App Platform app via Doppler's
**native DigitalOcean integration**, which writes them as app-level env vars — the container
reads `process.env` directly, so **no Doppler CLI is baked into the image** (the buildpack has
none). This is why the buildpack approach was chosen over a Dockerfile + `doppler run` wrapper:
the wrapper would have forced a Dockerfile to install the CLI. See
[[007-pattern-expo-router-server-self-host]] for the build-time-vs-runtime env caveat that makes
the `RUN_AND_BUILD_TIME` scope load-bearing.

## Scope boundary
This unit delivered the in-repo config + a verified local build; live DO provisioning is
operator-run (documented in `docs/deploy-digitalocean.md`). Native app store delivery and an
actual database are deliberately deferred (see `followups.md`).
