# 007 — Followups

Deferred work surfaced during 007 (database infrastructure). Deliberate deferrals, not loose
ends — each is a candidate future work unit.

- **Wire the app's data-access layer + retire mock data.** The DB and migration pipeline now
  exist; the next step is a `pg` Pool/client in the server runtime and migrating real domain
  schema, then replacing the mock data in `src/data/programs.ts`. This unblocks and supersedes
  005's "Database integration (DO Managed Postgres)" followup. The neutral `app_meta` table shipped
  in 007 is only a pipeline proof — real schema replaces/extends it. See
  [[009-decision-postgres-node-pg-migrate]].

- **Operator: provision DO Managed Postgres + Doppler `DATABASE_URL`, then exercise the
  verify-post-deploy caveats.** Live DO provisioning is operator-run (no DO account in this env,
  per 005's boundary). Once provisioned, confirm on the first real deploy: a failed PRE_DEPLOY
  migrate job blocks the deploy; first-deploy Doppler `DATABASE_URL` timing for the new job
  component; and that the buildpack resolves Node ≥ 20.12 (needed for `--env-file-if-exists`). See
  [[010-pattern-do-app-platform-migrations]] for the caveats and the `doctl apps run` escape hatch.

- **Merge sequencing vs in-flight work.** The 006-clerk-auth worktree also edits `.do/app.yaml`
  (`envs:`) and `package.json` (deps); whichever of 006/007 merges second resolves a conflict in
  those files. Knowledge-file numbering (007 added `009`/`010`) is reconciled the same way at merge
  if another unit lands a `009`/`010` first. Mechanical, handled at PR time — no design impact.
