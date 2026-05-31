# Scratchpad — 008-doppler-local-env

Working notes during implementation. Promoted/discarded at `minerva:promote`.

## Decisions

## Surprises

## TODO

## Panel decisions 2026-05-31

- [3/3 accept] scope check: single work unit (two changes are two halves of retiring
  the local `.env`; neither ships coherent alone). Arbiter conditioned acceptance on
  folding three items into success criteria: move migrate + Expo invocations to
  `doppler run --`; explicit decision on the lost port-5432 override; Doppler onboarding
  docs.
- [round 1: 1/3 accept → consensus failure] approach selection: B (drop the env-file
  flag) drew Proponent accept, Skeptic + Arbiter revise. Load-bearing fixes required:
  add a `DATABASE_URL` fail-fast guard; full doc sweep incl. the 5432 collision note;
  acknowledge/scope the Expo auto-dotenv client-bundle leak.
- [round 2: 3/3 accept] approach selection: B′ (B + guard on up/down + doc sweep + Expo
  `.env`-leak handling via gitignore + imperative doc removal). Skeptic verified against
  node_modules that node-pg-migrate already exits 1 on unset DATABASE_URL (guard =
  earlier exit + clearer message, not new safety); `&&` chaining is cross-platform;
  `create` correctly skips the guard; prod-safe via RUN_TIME DATABASE_URL in the
  PRE_DEPLOY job.
- [round 1: 2/3 accept → consensus failure] whole-proposal: Proponent accept, Skeptic
  revise. Load-bearing: retire the live repo-root `.env` explicitly + run criterion-1's
  `docker compose config` where no `.env` is present; decide README in/out of scope.
- [round 2: 3/3 accept] whole-proposal (B′′): added the worktree clean-room framing
  (gitignored `.env` is never checked out → criterion-1 verified in the worktree; user
  deletes their main-checkout `.env` per docs/report) and a README light touch.
  Arbiter folded doc-sweep completeness into criteria (database.md flag prose + Doppler
  bootstrap; dev-start `.env.example` refs; README pointer must not dangle) and deferred
  knowledge 009/010 reconciliation to promote.

## Panel concerns 2026-05-31

- (review-phase scrutiny) Guard message must name `DATABASE_URL` specifically (not a
  generic "no database configured"), since node-pg-migrate also accepts `PG*` vars.
- (review-phase scrutiny) Verify the installed Doppler CLI version actually consumes the
  committed `doppler.yaml` for `doppler setup`; older CLIs keyed off `.doppler.yaml`.
- (promote-phase) Knowledge 009/010 describe the removed `--env-file-if-exists` flow —
  reconcile at promote without rewriting history (likely a new knowledge entry + light
  cross-reference).
