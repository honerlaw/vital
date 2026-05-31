# Pattern: Clerk auth (`@clerk/expo` Core 3) + per-route endpoint enforcement

- Type: pattern
- Date: 2026-05-31
- Work unit: 006-clerk-auth
- Related: [[008-pattern-dynamic-app-config-strict-lint]] (the `unknown`+`typeof` env-read this
  reuses), [[007-pattern-expo-router-server-self-host]] (the server the API guard runs in),
  [[012-pattern-src-unit-tests-node-tsx]] (how the guard is tested),
  [[004-pattern-expo56-react-compiler-hook-rules]] (why guards stay declarative).

How VITAL wired Clerk-backed signup/signin/forgot-password (universal web + native) and
endpoint-level authn/authz under the strict guardrails ([[001-constraint-strict-eslint-guardrails]]).
Method names are the **Core-3 signals API as of `@clerk/expo@3.3.0` / `@clerk/backend@3.4.14`**
and are version-fragile — re-verify against installed types if these bump.

## Package + the deprecated-name trap
Install **`@clerk/expo`** (v3, Core 3) — **NOT** the deprecated `@clerk/clerk-expo`. Only the
current package declares SDK-56-compatible peers (`expo >=53 <57`, `react ^19`, `rn >=0.73`).
`npx expo install @clerk/expo expo-secure-store expo-web-browser expo-auth-session expo-crypto`;
`npm i @clerk/backend` for the server. The optional peers `expo-apple-authentication`,
`expo-local-authentication`, `@clerk/expo-passkeys` are **not** needed for an email+password
flow — they stay uninstalled and `expo export -p web` still builds. Add the config plugins
`@clerk/expo`, `expo-secure-store`, `expo-web-browser` to `app.json` `plugins`.

## Client: the Core-3 signals API (custom screens, NOT prebuilt components)
Root `useSignIn()` / `useSignUp()` from `@clerk/expo` return the **signals** value
`{ signIn, errors, fetchStatus }` (not the legacy `{ isLoaded, setActive }`). `ClerkProvider`
+ these hooks render on react-native-web, so ONE universal provider drives **custom** screens
built on the existing UI library — the prebuilt `<SignIn/>` components are web-only/native-split
and were not used. Shipped flows (exact names):
- Sign in: `await signIn.password({ identifier, password })` → `await signIn.finalize()`.
- Sign up: `await signUp.create({ emailAddress, password })` →
  `await signUp.verifications.sendEmailCode()` → `await signUp.verifications.verifyEmailCode({ code })`
  → `await signUp.finalize()`.
- Forgot password: `await signIn.create({ identifier })` →
  `await signIn.resetPasswordEmailCode.sendCode()` → `.verifyCode({ code })` →
  `.submitPassword({ password })` → `await signIn.finalize()`.

Two load-bearing facts:
- **`finalize()` activates the session, NOT `setActive()`.** Core 3 replaced `setActive()` for
  custom flows. Copying a pre-Core-3 tutorial compiles but the session never activates — a
  silent "reset succeeded, still logged out" bug.
- **These methods return `{ error: ClerkError | null }` (they don't throw).** Check
  `result.error !== null` and show `result.error.message` (`ClerkError extends Error`) — no
  try/catch, no cast. (`getToken()` is the exception: in Core 3 it *throws* `ClerkOfflineError`,
  so the `apiFetch` Bearer-attach wraps it.)

## Token cache: use the built-in (don't hand-roll)
`tokenCache` imported from `@clerk/expo/token-cache` is typed `TokenCache | undefined` and is
**native-only — `undefined`/no-op on web** (web uses Clerk's cookie/localStorage session). Pass
it straight to `ClerkProvider`; do not write a custom secure-store cache. The publishable key is
read with the `unknown`+`typeof` narrowing of [[008-pattern-dynamic-app-config-strict-lint]]
(static `process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` access; no cast).

## Route gating: declarative, anchored
Providers nest `SafeAreaProvider > ClerkProvider > StateProvider > RootNavigator`; the
`useAuth()` read lives in `RootNavigator` (a child of `ClerkProvider`). Gating is declarative —
`<Stack.Protected guard={auth.isSignedIn}>` for app routes, `guard={!auth.isSignedIn}` for the
`(auth)` group — **not** an imperative `router.replace()` in an effect (the only effect hides the
splash on `isLoaded`, per [[004-pattern-expo56-react-compiler-hook-rules]]). **Anchor gotcha
(`expo-router ~56.2.8`):** when signed-out, `/` resolves into the `(auth)` group and renders its
anchor; with no anchor set the router picks the **alphabetically-first** child
(`forgot-password`), not `sign-in`. Pin it with `export const unstable_settings =
{ initialRouteName: 'sign-in' }` in `(auth)/_layout.tsx`. Hold the splash until fonts **and**
Clerk `isLoaded` to avoid an auth-state flash.

## Server: per-route enforcement, fail closed
`requireAuth(request)` (server-only) wraps
`createClerkClient({ secretKey, publishableKey }).authenticateRequest(request, { authorizedParties })`
and **adapts the wide `RequestState` union down to `{ userId: string | null }`**: guard
`if (!state.isAuthenticated) return { userId: null }` (handshake states omit `toAuth`), else
`state.toAuth().userId` (narrows to `string`). Cast-free.
- **Per-route, no global middleware** — `GET /api/health` stays public simply by *not* calling
  it; the protected `/api/me` calls it. Enforcement is opt-in.
- **Fail closed.** `authenticateRequest` *throws* (not returns signed-out) when the publishable
  key is missing/misconfigured — and the raw throw surfaces through the expo-server adapter as a
  **500 with a full stack-trace HTML body**. `requireAuth` therefore wraps `verify()` in
  try/catch and returns a clean `401 {"error":"Unauthorized"}` on any throw. Verified through the
  real `server.js`: `/api/me` returns 401 with no auth and with a bogus Bearer (proving the
  Express-5 adapter passes the `Authorization`/`Cookie` headers through unmangled).
- **Transport contract:** native sends `Authorization: Bearer <getToken()>`; web is same-origin
  and relies on Clerk's session cookie; the server accepts either; `authorizedParties` = the
  configured web origin(s) (subdomain-cookie-leak protection).

## Env scopes (Doppler-injected; see [[006-decision-digitalocean-app-platform-hosting]])
`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is **`RUN_AND_BUILD_TIME`** (inlined into the client bundle at
`expo export`; absent at build → blank key → `ClerkProvider` errors). `CLERK_SECRET_KEY` is
**`RUN_TIME` + `type: SECRET`** (server-only, never inlined). `CLERK_AUTHORIZED_PARTIES` is
`RUN_TIME`. The live signup/signin/reset round-trip needs real keys + the Clerk dashboard
(email+password auth and `reset_password_email_code` enabled) and is verified manually
post-deploy — it is out of automated-test scope.
