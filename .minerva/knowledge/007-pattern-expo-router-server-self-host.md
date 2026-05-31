# Pattern: self-hosting the Expo Router server export on a Node host

- Type: pattern
- Date: 2026-05-31
- Work unit: 005-digitalocean-hosting
- Related: [[006-decision-digitalocean-app-platform-hosting]] (why we self-host),
  [[008-pattern-dynamic-app-config-strict-lint]] (the origin config)

How VITAL serves its Expo Router **server** output from a plain Node process (the shape DO App
Platform's buildpack runs). Reusable for any generic-Node host. Each item below is a non-obvious
fact verified during 005.

## Build output
`app.json` `web.output: "server"` makes `expo export -p web` emit **two** dirs:
`dist/client` (static assets + pre-rendered HTML) and `dist/server` (API/SSR handlers). With
`web.output: "static"` there is no `dist/server` and the handler below has nothing to mount.

## The server entry (`server.js`, CommonJS)
The adapter is **`expo-server/adapter/express`** (the SDK 56 package is `expo-server`, **not**
`@expo/server`). `createRequestHandler({ build: 'dist/server' })` returns a bare Express
middleware — it does not bundle express, so `express` and `compression` are explicit direct
dependencies. Ordering and middleware that matter:

```js
const { createRequestHandler } = require('expo-server/adapter/express');
app.use(compression());
app.use(express.static(CLIENT_BUILD_DIR, { maxAge: '1h', extensions: ['html'] })); // FIRST
app.use(createRequestHandler({ build: SERVER_BUILD_DIR }));                          // terminal
```

- **Static before the handler**, so hashed bundles/assets are served directly and don't fall
  through to SSR.
- **Use `app.use(handler)` as the catch-all, NOT `app.all('*', handler)`.** Express 5
  (path-to-regexp v8) throws "Missing parameter name" on a bare `'*'`. `app.use` is wildcard-safe
  on both Express 4 and 5 and is functionally identical here. (This resolved the express-major
  compat question: Express 5 works.)
- Listen on `process.env.PORT || 8080` (DO injects `PORT`); no host arg needed (Node binds all
  interfaces). Add a `SIGTERM`/`SIGINT` → `server.close()` handler: App Platform sends SIGTERM on
  **every** redeploy (`deploy_on_push: true`), so drain in-flight requests rather than drop them.

## Two DO-buildpack footguns (invisible in a local build)
- **devDep pruning.** The buildpack sets `NODE_ENV=production`, so plain `npm ci` omits
  devDependencies. Use `build_command: npm ci --include=dev && npm run export:web` so the Expo
  toolchain (typescript, etc.) is present at export.
- **`EXPO_PUBLIC_*` is inlined at BUILD time**, not read at runtime. The var must be scoped
  `RUN_AND_BUILD_TIME` (or `BUILD_TIME`); if absent at export the client silently bakes in
  `undefined` and the build still "succeeds". A local `node server.js` cannot catch either of
  these — they are buildpack-environment-specific; verify post-deploy.

## Validate the spec without provisioning
`doctl apps spec validate .do/app.yaml --schema-only` (positional arg, not `--spec`). The full
form (no `--schema-only`) also passes and auto-fills the `ingress` block, so ingress is not a
required input.
