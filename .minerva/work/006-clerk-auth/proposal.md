# 006 — Clerk-backed auth (signup / signin / forgot-password) + endpoint-level authn/authz

## Status

Draft. Approved via `minerva:propose-ship-auto` consensus panels — scope 3/3 (revote),
approach 3/3, whole-proposal 2/3 (Arbiter-decided on the final revision-round vote; the lone
Skeptic dissent was a pinnable test-loader detail, resolved below). Skeptic concerns logged in
`scratchpad.md`.

## Goal

Add Clerk-backed **signup**, **signin**, and **forgot-password** flows to VITAL (the universal
web + native Expo Router SDK 56 app), gate the whole app behind authentication, and enforce
authentication / authorization at the **API-route (endpoint) level** — all while preserving the
strict, un-bypassable ESLint guardrails (no `any`, no casts except `as const`, no inline
disables, one function/component per file; see [[001-constraint-strict-eslint-guardrails]]).

The deliverable is the in-repo integration plus locally-verifiable evidence (lint / typecheck /
rules-test / `npm test` clean, `expo export -p web` builds, a route-level 401/`{userId}` test).
A **live** Clerk round-trip (real signup/signin/reset against a Clerk instance) is **out of
automated scope** — there are no provisioned Clerk keys in this environment — and is verified
manually post-merge against a Clerk dev instance.

## Why

VITAL is currently mock-only: client-side `Context`/`useReducer` state, a hand-built UI
component library, and a single public API route (`GET /api/health`, the DigitalOcean health
probe). There is no identity. Authenticated users are the prerequisite for real persistence,
multi-device sync, and any per-user data. Endpoint-level enforcement ensures server routes
cannot be called anonymously once they hold real data. Clerk was chosen by the user as the
authentication backend.

## Approach

**Approach A — Clerk Core-3 universal headless hooks + custom screens on the existing UI
library + per-route `@clerk/backend` server enforcement**, gated by a de-risk spike. Custom
screens (not Clerk's prebuilt components) are required because the prebuilt
`<SignIn/>`/`<SignUp/>` are web-only DOM components that do not render under React Native and
clash with the bespoke design system; headless hooks render through the existing component
library and satisfy the one-component-per-file guardrail for free.

### TASK 0 — De-risk spike (HALT-and-replan gate)

The single highest-probability failure for this repo is Clerk's typings not conforming to the
un-bypassable strict lint. Front-load it before any UI is built:

1. `npx expo install @clerk/expo` (the **current** package — **not** the deprecated
   `@clerk/clerk-expo`) plus its Expo peers: `expo-secure-store`, `expo-crypto`,
   `expo-web-browser`, `expo-auth-session`, `expo-constants` (already at ~56.0.16). Install
   `@clerk/backend` for the server. Confirm SDK-56-compatible versions pin, and that optional
   peers (`expo-apple-authentication`, `expo-local-authentication`, `@clerk/expo-passkeys`) do
   not break the install or force config-plugin entries in `app.config.ts`.
2. Write a minimal sign-in stub + a `requireAuth(request)` stub (with the injected-verifier
   design below) and confirm `npm run lint` + `npm run typecheck` + `npm run lint:rules-test`
   + the new `npm test` all pass with **zero casts and zero inline disables**, and that
   `expo export -p web` still builds.
3. Assert `ClerkProvider` imported from the `@clerk/expo` **root** entry renders and provides
   context on `react-native-web` (no reliance on prebuilt `@clerk/expo/web` components).
4. Verify the `expo-server` Express 5 adapter (`expo-server/adapter/express`, see
   [[007-pattern-expo-router-server-self-host]]) hands `authenticateRequest` a bare `Request`
   **without mangling the `Authorization` / `Cookie` headers**.
5. Add a `"engines": { "node": ">=22" }` pin and confirm the DO buildpack honors it. Node 22+
   satisfies `@clerk/backend` (≥20.9) **and** gives the test runner a working TS story.
6. **GATE:** if Clerk typings need casts/disables, the SDK-56 install is incompatible, the
   adapter mangles auth headers, or the buildpack ignores the engine pin → **HALT and
   `minerva:replan`** (possibly decompose). Only if the spike passes does the rest proceed.

### Client

- **Providers** in root `src/app/_layout.tsx`, ordered
  `SafeAreaProvider > ClerkProvider > StateProvider > Stack`. `ClerkProvider` must wrap
  everything that uses Clerk hooks (guards + screens); `StateProvider` (app domain state) stays
  inside it. `publishableKey` is read from `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` through the
  established `unknown` + `typeof` narrowing pattern (same as `app.config.ts` reads
  `EXPO_PUBLIC_API_URL`, see [[008-pattern-dynamic-app-config-strict-lint]]) so
  `no-unsafe-assignment` does not fire — no cast.
- **Native token cache** via `expo-secure-store`, in its own file. It is **native-only**: on web
  Clerk uses its own cookie / `localStorage` session and the `tokenCache` prop is a no-op.
- **Splash gating:** `SplashScreen.preventAutoHideAsync()` is already called. Hold the splash
  (render nothing) until fonts are loaded **and** Clerk `isLoaded` is true, so there is no
  auth-state flicker (sign-in screen flashing before Clerk hydrates). Because `RootLayout` sits
  *above* `ClerkProvider`, the `isLoaded` read happens in a child component mounted under the
  provider, not in `RootLayout` itself.
- **`src/app/(auth)/` route group**, custom screens on the existing UI library via Core-3 hooks.
  Each screen surfaces Clerk errors **inline** via a shared error-extractor helper (own file,
  non-component, so it does not trip `react/no-multi-comp`):
  - `sign-in.tsx`: `useSignIn` → `signIn.create(...)` → **`signIn.finalize()`** (Core 3 replaced
    `setActive()` for custom flows; copying a pre-Core-3 tutorial compiles but silently leaves
    the user logged out).
  - `sign-up.tsx`: `useSignUp` → `create` → email-code verification (an **inline** step driven
    by component state, not a separate route) → **`signUp.finalize()`**.
  - `forgot-password.tsx`: `useSignIn` → `create({ strategy: 'reset_password_email_code' })` →
    submit code + new password (request → reset as **inline** steps) → **`signIn.finalize()`**.
- **Route guards:** declarative `<Redirect>` / `Stack.Protected` route-group gating reading
  `useAuth()` `isLoaded`/`isSignedIn` — **not** imperative `router.replace()` inside an effect
  (which the React-Compiler hook rules in [[004-pattern-expo56-react-compiler-hook-rules]]
  would reject). Unauthenticated → `/sign-in`; authenticated users are kept out of `(auth)` and
  land on the existing tabs. A **sign-out** action lives on the authenticated account surface
  below.
- **Authenticated account / sign-out surface** that actually **calls `GET /api/me`** via a new
  `apiFetch` helper — this gives the protected endpoint a real client consumer and proves
  end-to-end protected access (not just a unit test). `apiFetch` attaches
  `Authorization: Bearer <getToken()>`, with `getToken()` wrapped in `try/catch` for
  `ClerkOfflineError` (Core 3 throws instead of returning `null`).
- **Transport contract** (pinned): native uses the **Bearer** header; web is same-origin and
  relies on Clerk's session **cookie** (a Bearer header is harmless if also present); the server
  `authenticateRequest` accepts **either**; `authorizedParties` = the configured web origin(s).
  The concrete origin value is finalized at work time from the deploy origin (see Open
  Questions).
- **NON-GOAL (explicit):** per-user data binding. The existing global in-memory mock state
  (`DEFAULT_STATE`) stays shared/identical for all authenticated users; wiring per-user
  persistence is a follow-up. "Authenticated → tabs" means the existing **mock** experience.

### Server

- `src/server/requireAuth.ts`: `requireAuth(request)` takes an **injected verifier** — a typed
  function that defaults to the real
  `createClerkClient({ secretKey, publishableKey }).authenticateRequest(request, { authorizedParties })`.
  Injection lets tests pass a typed fake with **zero casts** (the test file is `**/*.ts`, so it
  is under the strict guardrails too). Returns `{ userId }` on success or a `401` `Response`.
  Applied **per-route** (no global middleware) so `GET /api/health` stays public by
  construction.
- `src/app/api/me+api.ts`: new protected example route that calls `requireAuth` and returns
  `{ userId }` (200) or the 401 from the helper.

### Tooling

- Add an `npm test` script running **`node --import tsx --test`** over the `src` test glob. `tsx`
  (a devDependency) strips types **and** honors the tsconfig `@/` path alias, so test files use
  the same `@/` imports as all other source — no orphan explicit `.ts` extensions and no new
  `import/no-unresolved` lint surface. (This supersedes relying on Node's native type-stripping,
  which cannot resolve the `@/` alias — the lone whole-proposal Skeptic dissent.) `lint:rules-test`
  continues to cover only `eslint-rules/`.

### Config / deploy

- `.do/app.yaml` (values injected by Doppler, per [[006-decision-digitalocean-app-platform-hosting]]):
  add `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` scoped `RUN_AND_BUILD_TIME` (it is inlined into the
  client bundle at `expo export` time — if absent at build the client bakes in `undefined`),
  and `CLERK_SECRET_KEY` as a runtime `SECRET`. Add the `engines` Node `>=22` pin.
- `docs/` updated with the required **Clerk dashboard configuration** (email + password auth and
  the `reset_password_email_code` strategy enabled) as a manual prerequisite.

## Success criteria

1. **TASK-0 spike passes its gate** — stubs (including the injected-verifier `requireAuth`) pass
   lint / typecheck / rules-test / `npm test` clean with zero casts/disables; `expo export -p web`
   builds; `ClerkProvider` renders on web; the adapter preserves auth headers; the buildpack
   honors Node `>=22` — **or** the unit halts and replans.
2. `npm run lint` + `npm run typecheck` + `npm run lint:rules-test` + `npm test` all pass clean
   (zero casts/disables) on the full change.
3. `(auth)/sign-in`, `(auth)/sign-up` (email + inline code-verify step), and
   `(auth)/forgot-password` (`reset_password_email_code`, inline request → reset) exist and are
   wired with Core-3 hooks, each completing via `finalize()`; each screen surfaces Clerk errors
   inline.
4. The root layout gates access (providers ordered
   `SafeAreaProvider > ClerkProvider > StateProvider > Stack`): unauthenticated → sign-in;
   authenticated → the existing (mock) tabs; a sign-out action exists; no auth-state flicker
   (splash held until fonts **and** Clerk `isLoaded`). Per-user data binding is an explicit
   NON-GOAL.
5. `ClerkProvider` wraps the app with a native secure-store token cache (no-op on web) and reads
   the publishable key from `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` via the `unknown` + `typeof`
   narrowing pattern (no cast).
6. `requireAuth(request)` with an injected verifier exists; a **route-level** test asserts
   `GET /api/me` returns `401` when unauthenticated and `{ userId }` with a stubbed authenticated
   request, **plus** a `requireAuth` unit test — both run via `npm test`. `/api/me` is protected;
   `/api/health` stays public.
7. An authenticated client path actually calls `GET /api/me` (the account / sign-out surface) via
   `apiFetch` with a Bearer token (`getToken()` wrapped for `ClerkOfflineError`); the transport
   contract (native Bearer, web cookie, server accepts either, `authorizedParties` = web origin)
   is implemented. `expo export -p web` succeeds.
8. `.do/app.yaml` carries both env vars at the correct scopes (publishable `RUN_AND_BUILD_TIME`,
   secret runtime `SECRET`, Doppler-injected) plus the Node `>=22` engine pin; `docs/` is updated
   with the Clerk dashboard prerequisites.

## Open Questions

- **Live Clerk round-trip is out of automated scope** — no provisioned Clerk keys/instance in
  this environment. Verified manually post-merge against a Clerk dev instance. Accepted as a
  verification boundary.
- `reset_password_email_code` requires the Clerk dashboard to have email+password auth and the
  reset strategy enabled; this cannot be asserted in CI without keys, so it is documented as a
  manual prerequisite.
- The concrete `authorizedParties` web-origin value is finalized at work time from the deploy
  origin (the contract — server accepts cookie or Bearer; `authorizedParties` = configured web
  origin — is pinned now).
- Sign-out affordance placement on the authenticated account surface is a minor UI detail
  decided at work time.
