# Pattern: applying schema migrations on DO App Platform via a PRE_DEPLOY job

- Type: pattern
- Date: 2026-05-31
- Work unit: 007-postgres-migrations
- Related: [[009-decision-postgres-node-pg-migrate]] (the tooling), 
  [[006-decision-digitalocean-app-platform-hosting]] (the substrate),
  [[007-pattern-expo-router-server-self-host]] (the buildpack/devDep-pruning facts)

How VITAL applies `node-pg-migrate` migrations in production on DO App Platform so schema is
current **before** new web containers take traffic. Each item is a non-obvious fact that shaped
the `.do/app.yaml` wiring; reusable for any migrate-on-deploy on App Platform.

## A PRE_DEPLOY job is its OWN component with its OWN build

A DO `jobs:` entry does **not** inherit the web service's built image or its `node_modules`. So
the migrate job re-declares its own `github:` (same repo/branch), `environment_slug: node-js`, and
a build command. A job sketched as just `kind: PRE_DEPLOY` + `run_command: npm run migrate` would
fail with `node-pg-migrate: not found` — there would be no `node_modules`.

```yaml
jobs:
  - name: migrate
    kind: PRE_DEPLOY
    environment_slug: node-js
    github: { repo: your-org/vital, branch: main, deploy_on_push: true }
    build_command: npm ci --omit=dev   # cheap: NO `expo export`; runner deps are regular deps
    run_command: npm run migrate
    instance_size_slug: basic-xxs
    envs:
      - { key: DATABASE_URL, scope: RUN_TIME }   # Doppler-declared, no hardcoded value
```

- **Build is deliberately cheap.** Use `npm ci --omit=dev`, NOT the web service's
  `npm ci --include=dev && npm run export:web` — the migrate job needs no Expo web build. Because
  `node-pg-migrate`/`pg` are regular `dependencies` ([[009-decision-postgres-node-pg-migrate]]),
  `--omit=dev` still installs them. This is the intentional inverse of the web service's
  `--include=dev` (which exists only so `expo export` has its toolchain).
- **`DATABASE_URL` is a Doppler-declared key** (`scope: RUN_TIME`) on **both** the job and the web
  service — value populated by Doppler's native DO integration, never hardcoded in the spec
  (mirrors `EXPO_PUBLIC_API_URL`; see [[006-decision-digitalocean-app-platform-hosting]]). It is
  runtime-only — the client bundle never sees it — unlike build-time `EXPO_PUBLIC_*`.
- A DO App deploys **atomically**: one push → one whole-app deployment that runs the PRE_DEPLOY
  job, then rolls the web service. `deploy_on_push: true` on both components does not create a
  second pipeline.

## Verify-post-deploy (cannot be exercised by a local `node`)

`doctl apps spec validate .do/app.yaml --schema-only` validates the spec offline, and the migrate
mechanism is fully verifiable locally against the Compose Postgres — but these prod behaviors are
not, and must be confirmed on the first real deploy (same boundary as
[[007-pattern-expo-router-server-self-host]]):

- A failed PRE_DEPLOY job is expected to **block the deploy** (bad schema never ships).
- **First-deploy Doppler timing**: the first deploy that introduces the job is the most likely
  moment for `DATABASE_URL` to be unset (secret not yet synced).
- **Buildpack Node major**: `environment_slug: node-js` does not pin a major; `--env-file-if-exists`
  needs Node ≥ 20.12, so an older buildpack Node crashes the job with an unknown-flag error.
- Operator escape hatch: `doctl apps run <app-id> --component migrate -- npm run migrate`.
