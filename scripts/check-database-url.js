// Fail fast with a clear, actionable message when DATABASE_URL is unset, instead of
// letting node-pg-migrate fall back to libpq connection defaults and emit an opaque
// connection error. node-pg-migrate already exits non-zero on a missing connection, so
// this guard's value is the earlier exit and the message — not new safety.
//
// Local dev: run migrations via `doppler run -- npm run migrate` (Doppler's `dev` config
// injects DATABASE_URL into process.env). Production: DATABASE_URL is supplied by
// Doppler's native DigitalOcean App Platform integration, already present in process.env
// when the PRE_DEPLOY migrate job runs — so this guard passes there (and turns the
// documented first-deploy "secret not yet synced" case into a clear message). No Doppler
// CLI is ever invoked from package.json scripts. See docs/database.md.
//
// Wired only onto the connecting migrate commands (`up`/`down`); `migrate:create` is
// offline file scaffolding and does not need a connection.

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is not set.\n' +
      '  Local dev: run via `doppler run -- npm run migrate` (Doppler injects DATABASE_URL).\n' +
      '  Production: DATABASE_URL is provided by the native Doppler DigitalOcean integration.',
  );
  process.exit(1);
}
