# 006 — Scratchpad

Working notes for the Clerk-auth work unit. See `proposal.md` for the approved design.

## Panel decisions 2026-05-31

- [3/3 accept, revote] scope check: single work unit. (Vote 1 was 2/3 — Skeptic flagged
  approach-correctness defects, not scope; revised to add a TASK-0 de-risk spike with a
  HALT-and-replan gate, then 3/3.)
- [3/3 accept] approach selection: Approach A (Clerk `@clerk/expo` Core-3 headless hooks +
  custom screens + per-route `@clerk/backend` enforcement). B (web-only prebuilt components)
  and C (low-level custom session mgmt) rejected.
- [2/3 accept, Arbiter-decided, Skeptic dissented] whole-proposal acceptance. Vote 1 = 1/3
  (four load-bearing HIGH gaps); revised to close all four; vote 2 = 2/3, Arbiter ruled the
  lone remaining Skeptic concern (test module-resolution) a pinnable tactical detail with a
  concrete fix, now folded into the proposal (`node --import tsx --test`).

## TASK 0 spike — PASSED 2026-05-31 (no HALT/replan)

Verified versions: `@clerk/expo@3.3.0` (current, not deprecated `@clerk/clerk-expo`),
`@clerk/backend@3.4.14`, `expo-secure-store@56.0.4`, `tsx@4.22.4`, `@types/node@25`.
`@clerk/expo` peer range `expo >=53 <57` / `react ^19` / `react-native >=0.73` → SDK 56 OK.

Gate evidence (all green together):
- `npm run lint` + `typecheck` + `lint:rules-test` (20) + `npm test` (5) clean — **zero casts,
  zero inline disables**. The whole `@clerk/expo` Core-3 signals API and `@clerk/backend`
  consume cast-free.
- `expo export -p web` builds; all 11 routes prerender (incl. `(auth)` screens + `account`) →
  **ClerkProvider renders on react-native-web**. `/api/me` + `/api/health` bundle.
- Real `server.js` probe (Express-5 expo-server adapter): `/api/health` → 200 public;
  `/api/me` no-auth and bogus-Bearer → clean `401 {"error":"Unauthorized"}`. The bogus-Bearer
  reaching `requireAuth` proves the **adapter does not mangle the Authorization header**.
- Node `>=22` engine pinned (running Node 24); satisfies `@clerk/backend` (>=20.9) and gives
  `node --import tsx --test` its TS story.
- Optional peers (`expo-apple-authentication`, `expo-local-authentication`,
  `@clerk/expo-passkeys`) NOT installed — export + server verified fine without them (lazy).

## Deviations from the proposal (sensible, within work-phase discretion)

- **Token cache:** used Clerk's built-in `tokenCache` from `@clerk/expo/token-cache` (typed
  `TokenCache | undefined`, native-only / no-op on web) instead of hand-rolling a secure-store
  cache. Official + web-safe → strictly better; no own file needed.
- **node:test types:** added `@types/node` (devDep) + a file-scoped `/// <reference types="node" />`
  in the test file (not banned by `ban-ts-comment` / `noInlineConfig`) rather than a repo-wide
  `compilerOptions.types` change that could drop other global types.
- **Test seam:** `src/server/verifier-registry.ts` (a data const, exempt from one-function rule)
  lets the REAL `GET /api/me` use an injected fake → deterministic, offline, cast-free
  route-level 401/200 tests (closes Skeptic gap #3 end-to-end, not just the helper).
- **Fail-closed hardening:** `requireAuth` catches a throwing verifier → clean 401 (no stack
  leak). Found during the live-server probe: missing key made `authenticateRequest` throw a
  500 with a full stack-trace HTML body. Added a unit test for the throw path.
- **Error display:** screens read each Core-3 method's returned `{ error }.message`
  (`ClerkError extends Error`) — no separate error-extractor helper required.
- **Guards:** declarative `Stack.Protected guard={...}` (no imperative `router.replace()` in an
  effect), per [[004-pattern-expo56-react-compiler-hook-rules]].

## Panel decisions 2026-05-31 (work → review)

- [3/3 accept] completion verification: all 8 success criteria met; both panelists + arbiter
  independently re-ran lint/typecheck/rules-test/test (clean) and the web export (11 routes
  prerender + 2 API routes). Live Clerk round-trip honestly out-of-scope (manual post-merge).
- [2/2 accept, quorum met] review triage: dispositions applied below.

## Review finding 2026-05-31

- **F1 [FIXED]** — `(auth)` group had no pinned anchor, so a signed-out user opening `/` could
  land on `forgot-password` (alphabetical) instead of `sign-in`. Fixed by adding
  `export const unstable_settings = { initialRouteName: 'sign-in' }` to `(auth)/_layout.tsx`
  (verified against expo-router 56's `getRoutesCore` anchor logic; one-line, no second edit
  needed, typecheck unaffected).
- **F2 [SUGGEST]** — `apiFetch` builds `${base}${path}`; would double-slash if
  `EXPO_PUBLIC_API_URL` ever had a trailing slash (`${APP_URL}` does not). Normalize if it ever
  becomes user-set.
- **F3 [SUGGEST]** — auth screens display Clerk's raw `error.message`; `FieldError.longMessage`
  / friendlier copy would improve UX in a later pass.
- **F4 [IGNORE]** — verifier memoized even if env was empty at first call; env is present at
  prod boot, and the test seam bypasses the cache. Negligible.
- **F5 [IGNORE]** — built-in `@clerk/expo/token-cache` used instead of a hand-rolled cache
  (documented deviation; strictly better).

Security sweep (Skeptic, review phase): no token logging anywhere; `/api/health` public by
construction; `requireAuth` fails closed with no stack leak; Bearer token only rides the
`Authorization` header to the fixed `EXPO_PUBLIC_API_URL` origin (no token-in-URL / open
redirect); splash cannot hang (hides on `isLoaded`, which Clerk always resolves).

## Panel concerns 2026-05-31

Carried forward from the panels for the work + review phases to scrutinize:

- **Core-3 API correctness (HIGH):** sign-in / sign-up / forgot-password custom flows must end
  in `finalize()`, NOT the pre-Core-3 `setActive()` — the wrong call compiles but silently
  fails to activate the session ("reset succeeded, still logged out"). Verify against the
  installed `@clerk/expo` version's docs/types at work time.
- **`getToken()` throws `ClerkOfflineError` (HIGH)** in Core 3 instead of returning `null` —
  the Bearer-attach path in `apiFetch` must wrap it in `try/catch`.
- **Injected-verifier requireAuth must typecheck cast-free** against `@clerk/backend`'s
  `RequestState` / auth-object union under `assertionStyle: 'never'`. The injected fake must
  implement the minimal typed surface without `as`/`any`. This is the TASK-0 gate's core check.
- **Test module resolution:** use `node --import tsx --test`; tsx honors the `@/` tsconfig
  alias. Do NOT rely on Node native type-stripping (cannot resolve `@/`, forces orphan `.ts`
  extensions that lint may reject). Confirm the test file passes the strict lint too.
- **Dual transport / `authorizedParties` (MEDIUM):** test an authenticated `/api/me` call from
  BOTH a native build (Bearer) and the web build (same-origin cookie). The web account screen
  must gate the fetch on signed-in state so the session cookie is set before the call.
- **Provider/splash interaction (MEDIUM):** the `isLoaded` read must come from a child mounted
  *under* `ClerkProvider`, not from `RootLayout` (which sits above the provider). Combine the
  existing fonts `if (!loaded) return null` gate with the Clerk `isLoaded` gate.
- **Optional Clerk peers (MEDIUM):** `expo-apple-authentication` (needs an entitlement/config
  plugin), `expo-local-authentication`, `@clerk/expo-passkeys` may surface as peer warnings —
  confirm the install and `expo export` don't break or silently require plugins.
- **`/api/me` route file must be created** (only `health+api.ts` exists today).
- **Doppler vs spec for the SECRET var (LOW):** declaring `CLERK_SECRET_KEY` `type: SECRET` in
  `.do/app.yaml` while Doppler injects the value — confirm the interaction matches the existing
  `EXPO_PUBLIC_API_URL` handling.
