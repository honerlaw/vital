# Bug: non-throwing boot hang — Clerk `isLoaded` stuck false reads as a blank screen

- Type: bug
- Date: 2026-06-06
- Work unit: live debug session (TestFlight build 5) + PR #23
- Related: [[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]] (the splash
  hold this hangs in), [[018-decision-eas-ios-release-workflow]] (the green-but-DOA
  class this belongs to), [[025-pattern-sentry-observability-wiring]] (the watchdog
  this motivated)

TestFlight build 5 launched to a permanent blank white screen with **no exception
thrown anywhere**. The mechanism, confirmed by a local Release-sim probe rendering
`auth.isLoaded` live:

- Any failure inside Clerk's `load()` (network, instance config, DNS, token-cache bug)
  leaves `isLoaded === false` forever — clerk-js does not flip it on error, and the
  compiled SDK's diagnostics (`"The Native API is disabled for this instance"`) are
  `__DEV__`-only, so release builds are silent.
- `RootNavigator` holds the splash until `isLoaded`, so the splash never hides.
- The iOS splash rendered as PLAIN WHITE because the `expo-splash-screen` plugin only
  had an `android.image` — with no root-level `image`, prebuild generated an iOS
  storyboard with **zero customization** (`systemBackgroundColor`, no logo). Fixed in
  PR #23 by moving `image`/`imageWidth` to the plugin root (verify in the generated
  `ios/vital/SplashScreen.storyboard`: a `SplashScreenBackground` named color, not
  `systemBackgroundColor`).

Triggers that produce the same hang (all hit during diagnosis):

1. **`@clerk/expo` 3.3.0 token-cache bug** — the SDK detached `getToken`/`saveToken`
   from the `tokenCache`, breaking `this`-dependent caches; fixed upstream in 3.3.1
   (clerk/javascript#8713). Bumped in PR #23.
2. **Unsigned simulator builds** (`CODE_SIGNING_ALLOWED=NO`) — no keychain entitlement
   → SecureStore throws `-34018` inside Clerk's per-request `getToken` hook → every
   FAPI call dies. **Repro confound**: always build Release sims with default ad-hoc
   signing.
3. **Environmental** (the actual build-5 trigger): Clerk prod-instance config/DNS —
   at the time, `onerlaw.com` had no DNS records at all, and a production Clerk
   instance's frontend-API lives at `clerk.<domain>`.

Diagnosis recipe that worked: ad-hoc-signed Release build on the simulator via
`xcodebuild` directly (`expo run:ios --configuration Release` mis-targets a physical
device and dies on signing), `xcrun simctl launch` + `log show --predicate 'process ==
"vital"'`, and a temporary probe that force-hides the splash and renders the gate
values.
