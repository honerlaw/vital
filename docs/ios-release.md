# iOS release automation (GitHub Actions → EAS Workflows)

Every push to `main` triggers `.github/workflows/release-ios.yml` on GitHub Actions,
which does two things in order:

1. **Syncs env vars from Doppler to EAS** — downloads the `EXPO_PUBLIC_*` vars from the
   Doppler `prd` config and pushes them into the EAS `production` environment
   (`eas env:push`). Doppler stays the single source of truth; EAS is a mirror refreshed
   immediately before every build. Server-side secrets in the prd config are filtered
   out and never reach EAS.
2. **Triggers the EAS workflow** — runs `.eas/workflows/build-and-submit-ios.yml` via
   `eas workflow:run`, which uploads the checkout to EAS infrastructure: a production
   iOS build, then submission of that binary to App Store Connect. Because the checkout
   is uploaded directly, the EAS GitHub app integration is **not** required.

## What "submit" means here

`eas submit` delivers the binary to **App Store Connect**, where it processes into
TestFlight / "awaiting release". It does **not** publish to the public App Store:
that still requires App Store review and a release action in App Store Connect.
Recommendation: keep "Manually release this version" selected in ASC so a merge can
never publish to users by itself.

Versioning: `eas.json` sets `appVersionSource: "remote"` with `autoIncrement: true`,
so every merge gets a unique EAS-managed **build number**. The user-facing marketing
**version** stays whatever `app.json`'s `version` says (currently `1.0.0`) — bump it
manually when cutting a public release. TestFlight accepts repeated `1.0.0 (n)`
builds; a new public release requires a new marketing version.

If merges land faster than App Store review, a new submission can queue behind or
supersede one already in review. At single-developer cadence this is a non-issue.

## One-time manual setup (required before the workflow can succeed)

Until ALL of these are done, every push to `main` produces a **failing run** — in
GitHub Actions if the secrets (step 2) are missing, otherwise in the EAS workflow it
triggers. That first red run is expected — it is not a regression.

1. **Apple Developer Program membership** — an active (paid) membership for the
   Apple account that will own the app.

2. **Create the two GitHub repo secrets** (repo → Settings → Secrets and variables →
   Actions). Without these, the `Release iOS` GitHub Actions run fails before
   reaching EAS:

   - `EXPO_TOKEN` — an EAS access token, created at
     [expo.dev → account settings → Access tokens](https://expo.dev/settings/access-tokens).
   - `DOPPLER_TOKEN` — a **read-only Doppler service token** scoped to the `vital`
     project's `prd` config (Doppler dashboard → vital → prd → Access → Service
     Tokens).

3. **Add the production client env vars to the Doppler `prd` config** — the app
   inlines these at bundle build time; the workflow mirrors every `EXPO_PUBLIC_*`
   var from Doppler into EAS before each build:

   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — production Clerk publishable key
   - `EXPO_PUBLIC_API_URL` — DigitalOcean app origin, e.g. `https://…ondigitalocean.app`

   **Skipping this ships a dead-on-arrival binary**: a blank Clerk key makes
   `ClerkProvider` error at launch, and a blank API URL leaves native clients with a
   relative origin (every API call fails). The GitHub Actions run fails loudly if
   either of these two required vars is missing from prd; any additional
   `EXPO_PUBLIC_*` vars added later are synced automatically but not individually
   asserted.

4. **Provision iOS credentials with one interactive build** —

   ```sh
   eas build --platform ios --profile production
   ```

   This walks through generating the distribution certificate and provisioning
   profile into EAS-managed credentials, and satisfies EAS Workflows' documented
   prerequisite of one completed build with the same platform + profile.

5. **App Store Connect API key for headless submit** —

   ```sh
   eas credentials
   ```

   → iOS → App Store Connect API Key → set one up and let EAS store it. The
   workflow's submit job runs non-interactively; without an EAS-hosted ASC key it
   cannot authenticate.

6. **App Store Connect app record** — create (or verify) the app in App Store
   Connect with bundle identifier `com.onerlawllc.vital` (as set in `app.json` →
   `ios.bundleIdentifier`). If you prefer a different identifier, change it in
   `app.json` *before* the first build — it is permanent once an app ships.
