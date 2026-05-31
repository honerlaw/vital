# 005 — Scratchpad

Live working notes for the DigitalOcean App Platform hosting work unit.

## Panel decisions 2026-05-31

- [3/3 accept, round 2] scope check: single unit (round 1 was 1/3 — Skeptic+Arbiter "revise"
  on completeness, not decomposition; folded in @types/express, declared compression, explicit
  verification commands).
- [3/3 accept, round 2] approach selection: Option A (DO Node buildpack + DO-native Doppler
  sync + JS server.js). Round 1 both revisers endorsed the substrate but flagged: static→server
  prerequisite, build-time env scoping, devDep pruning, catch-all ordering, package name
  (expo-server not @expo/server). Skeptic's round-2 "new HIGH" concerns (6,7) were a misread of
  a slash-separated package list as one import path — clarified, Skeptic flipped to accept.
- [3/3 accept, round 2] whole-proposal acceptance. Round 1 Skeptic "revise" on one real HIGH:
  app.config.ts replaces app.json unless it spreads `...config` (verified vs @expo/config) —
  would drop scheme/plugins/experiments.reactCompiler. Fixed with mandatory `...config` spread +
  new success criterion (`npx expo config --type public` must still report existing config).
  Criterion 3 hardened to `doctl apps spec validate` (doctl installed).

## Implementation notes

Implemented 2026-05-31. Two minor, non-load-bearing refinements from the approved plan,
both forced by verified environment facts (not approach changes — no replan warranted):

1. **`server.js` catch-all uses `app.use(handler)`, not `app.all('*', handler)`.** express 5
   (installed: `express@^5.1.0`) uses path-to-regexp v8, which throws on a bare `'*'` path
   string. `app.use(createRequestHandler(...))` as terminal middleware is wildcard-safe on
   both express 4 and 5 and is functionally identical (static registered first, so assets are
   served before falling through to SSR). Resolves the proposal's open question on express
   major-version compat: express 5 is fine with this pattern.

2. **`app.config.ts` does not spread `config.extra`, and reads `EXPO_PUBLIC_API_URL` through
   `unknown` + `typeof` narrowing.** The strict guardrail `no-unsafe-assignment` forbids
   spreading `config.extra` (typed `{[k]:any}`) and forbids assigning the `any`-typed
   `process.env.EXPO_PUBLIC_API_URL` directly. app.json defines no `extra`, so `...config`
   already preserves every top-level key the success criteria check — nothing is dropped.
   Verified: `npx expo config --type public` still reports scheme/3 plugins/web.output:server/
   reactCompiler, and `extra.router.origin` is `false` unset / the URL when set.

3. **`doctl apps spec validate` syntax** is positional (`doctl apps spec validate <file>
   [--schema-only]`), not `--spec`. Spec validates clean (schema-only and full both pass).

### Verification evidence (all 6 success criteria green)
- `npm run lint` + `npm run typecheck`: clean.
- `npm run export:web`: emits `dist/client` + `dist/server`; `/api/health` bundled at
  `dist/server/_expo/functions/api/health+api.js`; 7 static routes + 1 API route.
- `PORT=8099 node server.js`: `GET /api/health` -> `{"status":"ok"}` (200); `GET /` -> app
  HTML shell (200).
- `doctl apps spec validate .do/app.yaml [--schema-only]`: passes (resolves ingress).
