# Decision: GitHub Actions orchestrates iOS releases (Doppler→EAS sync, then workflow:run)

- Type: decision
- Date: 2026-06-06
- Work unit: 016-gh-actions-ios-release
- Supersedes (in part): [[018-decision-eas-ios-release-workflow]] — its trigger arrangement
  (push-triggered EAS workflow via the GitHub-app link), its "no `EXPO_TOKEN` secret, no
  GH-runner orchestration" claim, and step 2 of its six-step setup (the GitHub↔EAS link,
  now unnecessary). 018's other operational facts remain valid.
- Related: [[013-decision-doppler-local-env]] (the Doppler-as-single-env-source invariant
  this extends to release builds), [[006-decision-digitalocean-app-platform-hosting]] (the
  API origin `EXPO_PUBLIC_API_URL` points at)

On every push to `main`, `.github/workflows/release-ios.yml` (GitHub Actions)
(1) mirrors the `EXPO_PUBLIC_*` vars from Doppler's `prd` config into the EAS
`production` environment via `eas env:push`, then (2) triggers
`.eas/workflows/build-and-submit-ios.yml` (now `workflow_dispatch`-only) via
`eas workflow:run --non-interactive`. Doppler stays the single source of truth; every
build starts from Doppler-current env vars.

Why 018's explicit rejection of exactly this "thin trigger" was overturned: that
rejection priced the indirection against a working app-link-triggered pipeline with no
sync needs. Both premises failed — the GitHub↔EAS app link was never installed (0
workflow runs / 0 builds / 0 EAS env vars as of 2026-06-06), and Doppler-as-source-of-
truth requires a pre-build sync step that must live in CI somewhere. Once a CI step must
exist, the orchestrator is its minimal home, not added indirection.

Operational facts that will bite again:

- **`eas workflow:run` uploads the local checkout** (honoring `.gitignore`/`.easignore`
  via `git ls-files`), so the EAS GitHub-app link is NOT needed. `--ref` resolves against
  the **local** git repo (`rev-parse`) — it does **not** require the app link either, so
  `--ref ${{ github.sha }}` is viable future pinning hardening.
- **`eas env:push` is upsert-only.** Keys removed or renamed in Doppler persist in EAS
  indefinitely and keep being inlined into client bundles silently. Prune manually:
  `eas env:delete production --variable-name <key>` (syntax verified vs eas-cli 20.1.0).
- **A green "Release iOS" GH run means "synced + queued", not "released".** The trigger
  is fire-and-forget; EAS build/submit failures surface only via EAS's own notifications
  (email) and the workflows dashboard. `eas workflow:run --wait` would gate the job on
  the result, at ~30-40 idle runner minutes per merge.
- **The sync asserts the complete required set** — `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` +
  `EXPO_PUBLIC_API_URL`, proven complete by source grep at ship time. New required client
  vars sync automatically but must be added to the assert list to get the dead-on-arrival
  guard. The filter is line-based: a multiline `EXPO_PUBLIC_*` value would be silently
  truncated (switch to `--format json` + jq parsing then).
- **Secrets model** (revised 2026-06-06, same day): ONE GitHub repo secret —
  `DOPPLER_TOKEN` (read-only service token scoped to `vital`/`prd`), the irreducible
  bootstrap. Everything else, including `EXPO_TOKEN` (EAS access token), lives in Doppler
  prd; the workflow fetches it via `doppler secrets get EXPO_TOKEN --plain`, masks it
  (`::add-mask::`), and exports it through `GITHUB_ENV`. *Accepted tradeoff (explicit
  user call — single secret home over least-privilege)*: prd wholesale-syncs to
  DigitalOcean, so `EXPO_TOKEN` also lands in the production server env it doesn't need;
  harden later by relocating it if it ever matters. The transient `.env.eas` is
  EXIT-trap-removed and gitignored; only `EXPO_PUBLIC_*` values ever reach EAS env
  (server secrets are filtered out before any file is written).
- **The Doppler CLI lives in CI only.** `package.json` scripts stay Doppler-CLI-free,
  preserving [[013-decision-doppler-local-env]]'s prod-scripts invariant.

The one-time manual setup (docs/ios-release.md) is now: Apple membership, the single
`DOPPLER_TOKEN` GitHub secret, Doppler prd values (incl. `EXPO_TOKEN`), interactive
credential build, ASC API key, ASC app record.
018's remaining operational facts — EAS builds can't see Doppler/DO env; submit ≠ public
release; remote `autoIncrement` bumps only the build number; one prior completed build
with the same platform+profile; EAS-hosted ASC key for headless submit; strict submit-job
schema — all remain valid.
