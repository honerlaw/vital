# Deploying VITAL to DigitalOcean App Platform

VITAL's web target is an Expo Router **server** export (`web.output: "server"`): a static
client (`dist/client`) plus server-side API/SSR handlers (`dist/server`). It is hosted as a
**single** DigitalOcean (DO) App Platform web-service component that runs `server.js` — an
Express process that serves the static client and mounts the Expo server handler for routes
and `/api/*`.

This runbook covers provisioning. It is **executed by the operator** — the repo ships the
config (`.do/app.yaml`, `server.js`, build/run scripts), and the local build is verified, but
no DO account is provisioned from the repo.

## Prerequisites

- A DigitalOcean account + team, with this GitHub repo connected to App Platform.
- `doctl` installed and authenticated (`doctl auth init`) if deploying from the CLI.
- A [Doppler](https://doppler.com) project/config for VITAL, with the DigitalOcean App
  Platform integration enabled.

## 1. Secrets & env — Doppler

All env vars and secrets are managed in Doppler and synced into the App Platform app via
Doppler's **native DigitalOcean integration** (Integrations → DigitalOcean App Platform).
The integration writes the values as app-level env vars, so the running container reads them
straight from `process.env` — no Doppler CLI is baked into the image.

> [!NOTE]
> **Local dev uses the same Doppler secrets, fetched differently.** Locally there is no native
> integration, so developers run commands through the Doppler **CLI** — `doppler run -- <cmd>`
> injects the `dev` config's secrets into the process environment. Either way the code reads from
> `process.env`; only the injector differs (CLI locally, native integration in prod). The CLI is
> never invoked from `package.json` scripts, so production — which has no Doppler CLI — runs the
> same scripts unchanged. See [`database.md`](./database.md) for the local Doppler setup.

Define at minimum:

| Key                                  | Scope                | Notes |
|--------------------------------------|----------------------|-------|
| `EXPO_PUBLIC_API_URL`                | `RUN_AND_BUILD_TIME` | The deployed origin native clients call. **Inlined at build time.** |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`  | `RUN_AND_BUILD_TIME` | Clerk publishable key (public). **Inlined at build time** — same caveat as `EXPO_PUBLIC_API_URL`. |
| `CLERK_SECRET_KEY`                   | `RUN_TIME` (SECRET)  | Clerk secret key. Server-only, read by `@clerk/backend`; never inlined into the client. |
| `CLERK_AUTHORIZED_PARTIES`           | `RUN_TIME`           | Comma-separated allowlist of trusted web origins (the app URL) for the cookie session. |

Future runtime-only secrets (e.g. a database URL once a DB is added) are `RUN_TIME` scoped.

See [§5 Clerk authentication](#5-clerk-authentication) for the dashboard configuration the
auth flows depend on.

> [!IMPORTANT]
> **`EXPO_PUBLIC_*` is inlined at BUILD time**, not read at runtime. `expo export` bakes the
> value into the client bundle. The var **must** be scoped `RUN_AND_BUILD_TIME` (or
> `BUILD_TIME`). If it is missing or `RUN_TIME`-only when `export:web` runs, the bundle
> silently ships `undefined` as the API origin and the build still "succeeds" — a silent
> failure. Confirm the var is present at build (see §4).
>
> On the **first** deploy, the DO-provided `${APP_URL}` may not yet be resolvable at build
> time. Either set `EXPO_PUBLIC_API_URL` to an explicit URL (custom domain or the known
> `*.ondigitalocean.app` URL) via Doppler, or deploy once and trigger a second build after
> `${APP_URL}` is assigned so the correct origin is baked in.

## 2. The app spec

`.do/app.yaml` defines one web-service component. Edit `services[0].github.repo` to your
connected repo, then validate the schema locally **without provisioning**:

```bash
doctl apps spec validate .do/app.yaml --schema-only
```

Key fields:

- `build_command: npm ci --include=dev && npm run export:web` — `--include=dev` keeps
  `typescript` and other devDependencies installed even though the buildpack sets
  `NODE_ENV=production`, so the Expo toolchain is available to `expo export`.
- `run_command: npm run serve` — runs `node server.js`.
- `http_port: 8080` — the app listens on `process.env.PORT` (DO sets `PORT=8080`), falling
  back to `8080` locally.
- `health_check.http_path: /api/health` — DO probes the `GET /api/health` route.

## 3. Deploy

CLI:

```bash
doctl apps create --spec .do/app.yaml   # first time
doctl apps update <APP_ID> --spec .do/app.yaml   # subsequent spec changes
```

Or via the dashboard: **Apps → Create App → GitHub source**, point at the repo/branch, and
import `.do/app.yaml`. With `deploy_on_push: true`, pushes to `main` redeploy automatically.

## 4. Verify the deploy

```bash
# Health route (also DO's health probe target)
curl -s https://<your-app>.ondigitalocean.app/api/health
# -> {"status":"ok"}

# App shell
curl -s https://<your-app>.ondigitalocean.app/ | head

# Confirm the API origin was inlined at build time (NOT "undefined")
curl -s https://<your-app>.ondigitalocean.app/ | grep -o 'EXPO_PUBLIC_API_URL[^,]*' || true
```

## 5. Clerk authentication

VITAL's signup / signin / forgot-password flows and the per-route API guard are backed by
[Clerk](https://clerk.com). The code is configured by the three env vars above; the following
**Clerk dashboard** setup is a manual prerequisite (it cannot be asserted from the repo, and
the local build/tests run without real Clerk keys):

1. Create a Clerk application. Copy the **Publishable key** and **Secret key** into Doppler as
   `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
2. Under **User & Authentication → Email, Phone, Username**, enable **Email address** as an
   identifier and **Password** as an authentication strategy.
3. Ensure the **password reset** flow uses the **email code** strategy
   (`reset_password_email_code`) — this is what `forgot-password.tsx` drives. It is on by
   default when email + password are enabled; confirm it is not disabled.
4. Set `CLERK_AUTHORIZED_PARTIES` to the app's web origin(s) so the web cookie session is
   trusted (native clients authenticate with a Bearer token and are unaffected).

### Verify auth after deploy

```bash
# Public route stays open
curl -s https://<your-app>.ondigitalocean.app/api/health      # -> {"status":"ok"}

# Protected route rejects an unauthenticated request (fail-closed)
curl -s -o /dev/null -w '%{http_code}\n' \
  https://<your-app>.ondigitalocean.app/api/me                # -> 401
```

A full signup → signin → forgot-password round-trip is verified manually in the app against a
live Clerk instance (it requires real keys and email delivery, so it is out of automated
test scope).

## Notes & caveats

- **Static → server side effect.** Flipping `web.output` to `server` means the web target is
  no longer a CDN-only static artifact; it requires a running Node server (which App Platform
  provides). Pure-static hosting / `npx expo serve` static assumptions no longer apply.
- **Local build proves wiring, not the DO substrate.** Running `npm run export:web` +
  `npm run serve` locally validates the server entry, the health route, and the export output,
  but it runs with a full `node_modules` and your local shell env. It **cannot** detect the two
  DO-buildpack-specific failure modes — devDependency pruning (mitigated by `--include=dev`)
  and build-time env scoping (mitigated by `RUN_AND_BUILD_TIME`). Confirm both with the
  post-deploy checks in §4.
- **Database.** App Platform runs a full Node runtime, so the DB uses an ordinary TCP client
  (DO Managed Postgres) with its URL supplied as a `RUN_TIME` Doppler secret. Schema migrations
  run automatically on deploy via a `PRE_DEPLOY` job in `.do/app.yaml`. See
  [`database.md`](./database.md) for the full local + production migration flow and caveats.
