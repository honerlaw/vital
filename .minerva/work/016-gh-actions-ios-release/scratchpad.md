# 016 — gh-actions-ios-release · scratchpad

## Panel decisions 2026-06-06

- [3/3 accept] scope check: single unit — 4 files form one atomic pipeline rewrite; any
  split yields a broken or mis-documented intermediate state; 018 supersession is
  promote-time bookkeeping, not grounds to decompose.
- [2/3 accept round 1 → revision round] approach selection: option B (GH Actions
  orchestrator). Skeptic demanded: EXIT trap + gitignore for `.env.eas` (HIGH),
  per-key assert vs zero-vars check, corrected concurrency comment, eas-cli pin,
  018-supersession rationale recorded.
- [accepted round 2 — Proponent accept, Arbiter accept; Skeptic's two blocking items
  resolved in-tree pre-ruling] approach selection final: Doppler download isolated
  from grep (auth failures report real cause); `eas env:push production --path
  .env.eas --force` verified against eas-cli 20.1.0 `--help`. Rejected alternatives:
  A — manual sync script + EAS push trigger (needs the never-completed app link);
  C — pull-at-build-time Doppler on EAS VMs (needs app link AND build-time Doppler
  availability).
- [3/3 accept, required amendments folded into proposal] whole-proposal acceptance:
  SC1 wording attributes schema validation to the in-session run; `--force` blast
  radius corrected to upsert-only (does NOT delete absent EAS vars); full 018 edit
  obligation enumerated for promote (opening framing, no-token claim, six-step
  setup's app-link step).

## Panel concerns 2026-06-06

(for review/promote phases to scrutinize)

- Floating `eas-cli@^20` pin vs. behavior verified against 20.1.0 — accepted residual.
- `--format env` grep line-format fragility — accepted residual (two known keys).
- Two-key assert list hardcoded in YAML — deferred maintenance obligation.
- PROMOTE OBLIGATION (hard): superseding knowledge entry must record (a) why 018's
  rejected indirection is now warranted (premises falsified), (b) the --force
  upsert-only mirror semantics + Doppler-as-SoT assumption, (c) edits to 018's
  opening framing / no-token claim / app-link setup step.
- Commit hygiene: `.claude/scheduled_tasks.lock` (untracked, unrelated) stays out of
  this unit's commits.

## Log 2026-06-06

- Implementation predates the work unit: built conversationally in the main checkout,
  panel-hardened during propose, then transplanted into this worktree; main checkout
  restored to HEAD.
