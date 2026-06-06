# 016 — gh-actions-ios-release · proposal

## Status

Shipped (2026-06-06). Approved + delivered via `minerva:propose-ship-auto` consensus
panels (scope 3/3; approach accepted after one revision round with in-tree hardening;
whole-proposal 3/3; completion 3/3; review triage 2/3 as amended; promote partition 2/3
as amended). Durable record: [[021-decision-gh-actions-ios-release-orchestration]].

## Goal

Every merge to `main` releases iOS through a GitHub Actions orchestrator that
(1) mirrors the client-required `EXPO_PUBLIC_*` vars from Doppler's `prd` config into
the EAS `production` environment, then (2) programmatically triggers the EAS
build+submit workflow via `eas workflow:run` — so each build starts from
Doppler-current env vars and the never-completed EAS GitHub-app link stops being a
release prerequisite.

## Why

Unit 013 shipped the push-triggered EAS workflow, but it has never run once
(0 workflow runs / 0 builds / 0 EAS env vars, verified 2026-06-06): its EAS
GitHub-app-link prerequisite was never completed. Separately, production
`EXPO_PUBLIC_*` values were to be hand-created in EAS (`eas env:create`) — a second
source of truth that would drift from Doppler, the project's single env source
([[013-decision-doppler-local-env]]). The user requires Doppler to stay authoritative
with the EAS mirror refreshed automatically before every build, which forces a CI-side
orchestration step.

This **supersedes [[018-decision-eas-ios-release-workflow]]'s rejection** of the
"GH-Actions thin trigger via `eas workflow:run`" — that rejection priced the
indirection against a working app-link-triggered pipeline and zero sync needs; both
premises are now false. Promote must edit 018 in full, not just the rejection line:
its opening "not GitHub Actions" framing, its "no `EXPO_TOKEN` secret, no GH-runner
orchestration" claim, and step 2 of its six-step manual setup (the GitHub↔EAS link,
now obsolete) all contradict this unit and must be superseded or rewritten.

## Approach

(implemented in this worktree; 4 files)

1. `.eas/workflows/build-and-submit-ios.yml` — trigger `on: push` →
   `on: workflow_dispatch: {}`. Validated against the live EAS workflow schema with
   the expo-cicd-workflows validator during this session (✓; no validation artifact
   persists in-repo). Build + submit jobs unchanged from 013.
2. `.github/workflows/release-ios.yml` (new) — on push to `main`, one job
   (ubuntu-24.04, node from `.nvmrc`, `npm ci` with cache): install `eas-cli@^20` +
   Doppler CLI (`dopplerhq/cli-action@v4`); **sync step** — download prd secrets with
   an explicit failure branch naming `DOPPLER_TOKEN` as the cause (so an auth failure
   doesn't masquerade as missing keys), filter to `^EXPO_PUBLIC_` into a transient
   `.env.eas` (removed by EXIT trap on every path; also gitignored), assert
   `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_API_URL` are present
   (dead-on-arrival guard), `eas env:push production --path .env.eas --force` (syntax
   verified against eas-cli 20.1.0 this session); **trigger step** —
   `eas workflow:run .eas/workflows/build-and-submit-ios.yml --non-interactive`.
   GH-side runs serialized (workflow-scoped concurrency group,
   `cancel-in-progress: false`); EAS builds may overlap, which is safe via remote
   `autoIncrement` build numbers. Review fixes folded in: header + docs state that the
   sync is upsert-only (stale Doppler-removed keys must be pruned with
   `eas env:delete`), that a green run means "synced + queued" with EAS notifications
   as the build-failure red signal (`--wait` recorded as the alternative), and the
   filter's single-line-value assumption is commented at the grep site.
3. `.gitignore` — add `.env.eas`.
4. `docs/ios-release.md` — rewritten: GH Actions flow; one-time setup now requires
   GitHub repo secrets `EXPO_TOKEN` + `DOPPLER_TOKEN` (read-only, scoped to
   `vital`/`prd`) instead of the EAS GitHub-app link; env vars live in Doppler `prd`;
   Apple-side prerequisites unchanged.

Accepted residual risks (panel-logged):

- Floating `^20` pin — a future 20.x could shift CLI behavior verified against 20.1.0.
- `--format env` + grep line-format fragility (multi-line secret values).
- The two-key assert list is hardcoded in YAML; future required `EXPO_PUBLIC_*` vars
  must be added manually (degrades to the old failure mode, not worse).
- `eas env:push --force` **upserts** every var present in the file over the EAS
  mirror — it does **not** delete EAS vars absent from the file. A manually-set EAS
  var survives unless its name collides with a Doppler `EXPO_PUBLIC_*` key, in which
  case the next merge overwrites it. Intended: Doppler is the source of truth.

## Success criteria

1. `.eas/workflows/build-and-submit-ios.yml` has `workflow_dispatch` as its only
   trigger and passes the live EAS schema validator (run in-session; re-runnable via
   the expo-cicd-workflows skill's validate.js).
2. `.github/workflows/release-ios.yml` parses as valid GH Actions YAML, runs on push
   to `main` only, syncs only `EXPO_PUBLIC_*` values, asserts the two required keys,
   removes `.env.eas` on all exit paths of the writing step, and triggers the EAS
   workflow non-interactively.
3. `package.json` scripts remain Doppler-CLI-free (knowledge 013 constraint
   preserved); no auto-loaded `.env` file is introduced.
4. `docs/ios-release.md` documents the new flow and the revised one-time setup
   accurately.
5. Existing CI (`ci.yml`) passes on the PR.

End-to-end release run is **not** a success criterion: it needs operator-created
GitHub secrets, Doppler prd values, and Apple-side prerequisites that live outside
the repo; the docs state red runs are expected until those are done.

## Open Questions

None blocking. Deferred: maintaining the per-key assert list if the app gains more
required `EXPO_PUBLIC_*` vars; pull-at-build-time alternative (EAS lifecycle hook +
Doppler CLI on the build VM) if mirror drift ever matters.
