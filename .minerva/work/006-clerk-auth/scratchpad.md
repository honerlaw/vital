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
