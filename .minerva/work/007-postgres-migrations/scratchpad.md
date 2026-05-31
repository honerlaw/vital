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

(work-phase notes go here)
