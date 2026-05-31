# 005 — Host VITAL web + API on DigitalOcean App Platform

## Status

Shipped (2026-05-31). Approved via `minerva:propose-ship-auto` consensus panels
(scope 3/3, approach 3/3, whole-proposal 3/3); completion verified 3/3; review triage 2/2.
Durable learnings promoted to [[006-decision-digitalocean-app-platform-hosting]],
[[007-pattern-expo-router-server-self-host]], [[008-pattern-dynamic-app-config-strict-lint]].

## Goal

Make VITAL's Expo Router web target — the static client plus server-side API routes —
deployable as a single DigitalOcean (DO) App Platform web-service component, with
environment variables and secrets supplied by Doppler. The deliverable is the in-repo
configuration plus a verified **local** build (export + serve + smoke-test the health
route); live DO provisioning is documented in a runbook but executed by the operator
(no DO account is available in this environment).

## Why

VITAL is currently `web.output: "static"` — a pure client SPA with no server runtime, so
the API routes enabled in this session have nowhere to run. DO App Platform was chosen
over EAS Hosting (Cloudflare Workers) deliberately: a full Node runtime gives real `fs`,
ordinary TCP database connections, and a path to DO Managed Databases later, and
consolidates hosting on the user's platform. This unit makes the server target real and
reproducibly deployable as one component, so the API routes (and a future DB) have a home.

## Approach

Self-host the Expo Router server export on a single Node web service, built by App
Platform's Node buildpack, with Doppler supplying env via DO's native Doppler→App Platform
secrets sync. Seven files:

1. **`app.json`** — flip `web.output` `"static"` → `"server"`. Required prerequisite: this
   is what makes `expo export -p web` emit `dist/server` (the API/SSR bundle) alongside
   `dist/client`. Pre-rendered pages are still served; API routes become executable.

2. **`app.config.ts`** (new dynamic config, layered over `app.json`) — inject
   `extra.router.origin` from `process.env.EXPO_PUBLIC_API_URL`, falsy when unset (relative
   origin for web/dev; absolute deployed origin for native clients). It **must** spread the
   injected static config:

   ```ts
   export default ({ config }: ConfigContext): Partial<ExpoConfig> => {
     const rawOrigin: unknown = process.env.EXPO_PUBLIC_API_URL;
     const origin = typeof rawOrigin === 'string' && rawOrigin.length > 0 ? rawOrigin : false;
     return { ...config, extra: { router: { origin } } };
   };
   ```

   In SDK 56 a dynamic config **replaces** `app.json` unless it spreads the injected
   `config` (verified against `@expo/config`); without `...config` the existing `scheme`,
   `plugins`, `experiments.reactCompiler`, and splash config would be silently dropped. As
   shipped, `config.extra` is **not** spread (it is typed `any`, which `no-unsafe-assignment`
   forbids; app.json has no `extra`), and the `any`-typed `process.env` value is read through
   `unknown` + `typeof` narrowing rather than a cast. Returns `Partial<ExpoConfig>` because the
   injected `config` is `Partial`. See [[008-pattern-dynamic-app-config-strict-lint]],
   [[001-constraint-strict-eslint-guardrails]].

3. **`server.js`** (new, CommonJS) — Express entry. Registers `compression()` and
   `express.static('dist/client')` **first**, then mounts the Expo handler as a terminal
   `app.use(createRequestHandler({ build: 'dist/server' }))` from `expo-server/adapter/express`
   (correct package: `expo-server`, not `@expo/server`). As shipped it uses `app.use(handler)`
   rather than `app.all('*', handler)`: Express 5 (path-to-regexp v8) rejects a bare `'*'`, and
   `app.use` is wildcard-safe on Express 4 and 5. Listens on `process.env.PORT || 8080` and
   drains in-flight requests on `SIGTERM`/`SIGINT` (App Platform sends SIGTERM on every
   redeploy). Kept as `.js` so it sits under the lenient base-expo lint, not the strict `.ts`
   gate. The adapter returns a bare middleware and does not bundle express, so express/
   compression are standalone direct dependencies. See [[007-pattern-expo-router-server-self-host]].

4. **`package.json`** — add `express`, `compression`, `expo-server` to `dependencies`
   (explicit direct deps; `expo-server` is promoted from a transitive dep of expo-router);
   add `@types/express`, `@types/compression` to `devDependencies`; add scripts `export:web`
   (`expo export -p web`) and `serve` (`node server.js`).

5. **`src/app/api/health+api.ts`** (new) — `GET /api/health` → `{ status: "ok" }`. The
   server's one concrete API route, doubling as the App Platform health-check target and a
   deploy smoke test. Lands on the strict-lint `.ts` surface.

6. **`.do/app.yaml`** (new) — App Platform spec, ONE web-service component: GitHub source;
   `build_command: npm ci --include=dev && npm run export:web` (`--include=dev` survives the
   buildpack's `NODE_ENV=production` devDep pruning so the Expo toolchain is present at
   export); `run_command: npm run serve`; `http_port` bound to `PORT`;
   `health_check.http_path: /api/health`; env vars sourced from Doppler.

7. **`docs/deploy-digitalocean.md`** (new) — runbook: the Doppler↔DO native integration
   setup; env vars scoped `RUN_AND_BUILD_TIME` with an explicit warning that an absent
   `EXPO_PUBLIC_API_URL` at export silently bakes `undefined` into the client bundle;
   `doctl`/dashboard deploy steps; a post-deploy check (`curl /api/health` + confirm the
   inlined origin); the `static`→`server` side-effect note (no more CDN-only artifact); and
   an acknowledgement that a local build proves server wiring but not the DO-buildpack-specific
   env/prune behaviour.

### Rationale vs alternatives

- **Buildpack, not Dockerfile.** `expo` is a runtime `dependency`, so the buildpack runs the
  exporter without quarantining build-only deps; `--include=dev` covers `typescript`. A
  Dockerfile (Option B) buys container parity for no current need and adds a maintained
  artifact.
- **DO-native Doppler sync, not `doppler run`.** The sync lands secrets as plain
  `process.env`, so no Doppler CLI in the runtime image (which the buildpack lacks).
  `doppler run -- node server.js` would force a Dockerfile to install the CLI.
- **JS `server.js`, not TS.** Avoids the strict-`.ts` gate and `@types/express` in the
  typecheck graph for trivial glue.
- **Not EAS Hosting / Cloudflare Workers** (rejected): user chose DO; Workers lacks Node
  `fs`/TCP DB.

## Success criteria

1. `npm run export:web` exits 0 and produces both `dist/client/` and `dist/server/` (server
   output, not static-only).
2. `PORT=8081 node server.js` boots; `curl -s localhost:8081/api/health` → `{"status":"ok"}`;
   `curl -s localhost:8081/` → the app's HTML shell.
3. `doctl apps spec validate .do/app.yaml --schema-only` passes; the spec is a single
   web-service component with `build_command` (`--include=dev`), `run_command`, `PORT`
   http_port, and `/api/health` health check.
4. `app.config.ts` sets `extra.router.origin` from `EXPO_PUBLIC_API_URL` when set and is inert
   (relative) when unset; **and** `npx expo config --type public` still reports `scheme: "vital"`,
   all three plugins (expo-router, expo-splash-screen, expo-font), `web.output: "server"`, and
   `experiments.reactCompiler: true` (no static config dropped). Passes `npm run lint` and
   `npm run typecheck`.
5. `docs/deploy-digitalocean.md` documents the Doppler-managed env vars (build-time
   `EXPO_PUBLIC_API_URL`; runtime future DB creds), the `RUN_AND_BUILD_TIME` scoping caveat,
   and the deploy steps.
6. `npm run lint` (`eslint . --max-warnings 0`) and `npm run typecheck` (`tsc --noEmit`) stay
   green across all new/changed files.

## Open questions

- **App Platform instance size / cost tier** — operator decides at provision time; smallest
  Basic is sufficient for a mock-only app. Not a code concern.
- **`express` major version** — pin `express` to a major verified compatible with
  `expo-server@56.0.4`'s adapter at implementation time (the adapter targets the standard
  req/res interface; `@types/express ^5` appears in expo-server's own devDeps, hinting
  express 5 is expected). Fall back to express 4.x if 5.x misbehaves.
- **Later containerization** — a Dockerfile for parity with other services is deferred;
  Option A is sufficient now.
- **Native store delivery** — the `origin` wiring is configured here, but building/submitting
  the native apps is a separate EAS/store flow, out of scope.
