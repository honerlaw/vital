# 007 — Scratchpad

Working notes for the 007 database-infrastructure unit. Promote durable learnings to
`.minerva/knowledge/` at the end; this file is archived on promote.

## Panel decisions 2026-05-31

- [2/3 accept → revision] scope check (single unit vs decompose): vote 1 accept/revise/accept.
  Skeptic flagged prod-apply as separable + merge-collision vs 006/004 + undecided mechanism.
  Arbiter: single unit correct because the migration mechanism is one shared artifact applied on
  two surfaces; prod-apply handled via operator-gated verify-post-deploy step + Open Questions.
  Resolved by folding Open Questions (prod-apply mechanism, concurrency, merge sequencing) into
  the proposal. **Single unit.**
- [1/3 accept → revision] approach selection (A node-pg-migrate vs B hand-rolled vs C Drizzle):
  vote 1 accept/revise/revise. Both dissents endorsed A as the right tool but required wiring
  fixes. Folded in: PRE_DEPLOY job is its OWN component (own github/environment_slug/cheap
  `npm ci --omit=dev` build, not export:web); local DATABASE_URL via `--env-file-if-exists` on the
  bin (not wrapping npm run); node-pg-migrate+pg as regular deps. **Approach A (corrected).**
- [2/3 accept → revision] whole-proposal acceptance vote 1: accept/revise/accept. Skeptic raised
  6 refinements (env-flag placement on bin; engines.node pin + buildpack-Node Open Question; bare
  `.env` in .gitignore; .env.example documents all 3 consumers; `compose up --wait`; idempotency =
  run-twice-2nd-no-op + pg pure-JS note). All folded in.
- [3/3 accept] whole-proposal acceptance revision re-vote: accept/accept/accept. Strong consensus.
  Binding implementation note carried to Work: `DATABASE_URL` must be a Doppler-DECLARED key in
  `.do/app.yaml` (RUN_TIME on job + web), never a hardcoded value, mirroring `EXPO_PUBLIC_API_URL`.

Run totals so far: 12 panel dispatches (4 agents reused across arbiter calls), 0 user escalations.

## Implementation notes

- Versions pinned: node-pg-migrate ^8.0.4 (bin `bin/node-pg-migrate.js` confirmed), pg ^8.21.0,
  Node v24 local. CLI defaults: env var `DATABASE_URL`, dir `migrations`, table `pgmigrations`,
  advisory lock + single-transaction on by default. SQL migrations via `-j sql`.
- package.json: `pg`/`node-pg-migrate` landed in `dependencies` (npm install); added top-level
  `"//db"` comment (JSON has no comments, and a `"//"` key inside `dependencies` would be read as
  a package — so it lives at the top level) + `engines.node: ">=20.12"` + migrate/migrate:create/
  migrate:down scripts with `--env-file-if-exists=.env` baked onto the bin.
- Initial migration: `migrations/1780265290146_init-app-meta.sql` (timestamp format from the tool,
  not the proposal's illustrative `0001`) — pgcrypto + `app_meta(key,value,updated_at)`; down drops
  the table but leaves pgcrypto (shared idempotent extension).
- **Live verification (Docker daemon up):** an unrelated `seekless-postgres` already held host
  5432, so verified on `POSTGRES_PORT=5440` via local gitignored `.env` (the override mechanism the
  compose file + .env.example document; committed default stays 5432). compose config valid;
  `up --wait` → Healthy; `npm run migrate` applied, 2nd run = "No migrations to run!" (idempotent);
  `pgmigrations` row present; `app_meta` table + `pgcrypto` extension confirmed via psql;
  `migrate:down` drops table, re-up recreates it.
- `.do/app.yaml`: added `DATABASE_URL` (RUN_TIME, Doppler-declared, no value) on web + a PRE_DEPLOY
  `migrate` job (own github/environment_slug, `npm ci --omit=dev` build, `npm run migrate`).
  `doctl apps spec validate --schema-only` passes.
- Gates: lint ✓, typecheck ✓, lint:rules-test ✓ (0 fail), `expo export -p web` ✓ (dist emitted,
  /api/health route intact). New non-JS/TS files (compose, .sql, docs, .env.example) are outside
  the eslint graph; no inline disables.
