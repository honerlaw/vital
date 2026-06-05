# iOS release automation (EAS Workflows)

Every push to `main` triggers `.eas/workflows/build-and-submit-ios.yml` on EAS
infrastructure: a production iOS build, then submission of that binary to App Store
Connect. There is no GitHub Actions involvement and no GitHub secret — EAS runs the
workflow itself via its GitHub app integration.

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

Until ALL of these are done, every push to `main` produces a **failing workflow
run**. That first red run is expected — it is not a regression.

1. **Apple Developer Program membership** — an active (paid) membership for the
   Apple account that will own the app.

2. **Link the GitHub repo to the EAS project** — at
   [expo.dev](https://expo.dev/accounts/onerlawllc/projects/vital) → project →
   GitHub settings, install/authorize the EAS GitHub app for this repository.
   Without this, push triggers never fire at all.

3. **Create production EAS environment variables** — the app inlines these at
   bundle build time; EAS build machines cannot see Doppler or DigitalOcean env:

   ```sh
   eas env:create --environment production --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value <production Clerk publishable key>
   eas env:create --environment production --name EXPO_PUBLIC_API_URL --value <DigitalOcean app origin, e.g. https://…ondigitalocean.app>
   ```

   **Skipping this ships a dead-on-arrival binary**: a blank Clerk key makes
   `ClerkProvider` error at launch, and a blank API URL leaves native clients with a
   relative origin (every API call fails). The build itself still goes green — the
   failure only shows up in the running app.

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
