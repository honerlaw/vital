# Followups — 004-github-actions-ci

Forward work deferred from this unit. Real work, not abandoned — recorded here rather
than auto-seeded into proposals.

- **[HIGH — finishes the job] Enable branch protection / required status checks on `main`.**
  This unit ships the CI workflow, which makes the check go **red** on failure — but the
  check is currently **advisory**: a maintainer can still merge a PR with a failing check.
  The unit's actual purpose ("give the un-bypassable-gate ethos teeth at the repo boundary",
  per the proposal's Why) is only realized once the `CI / Build, test, and lint` check is set
  as a **required status check** in GitHub branch-protection settings for `main`. This is a
  repo *setting*, not workflow code, so it is a one-shot config task — but do not let it sit:
  until it lands, the gate does not block merges. Seeded 2026-05-31.

- **SHA-pin the GitHub Actions.** `actions/checkout` and `actions/setup-node` are pinned to
  floating `@v4` major tags. For supply-chain hardening (and to match the repo's exact-pin
  toolchain ethos), pin them by full commit SHA. This carries an ongoing bump-maintenance
  cost, so pair it with Dependabot/Renovate configured to update the pinned SHAs. Low
  priority. Seeded 2026-05-31.

- **Add `timeout-minutes` to the `verify` job.** The job has no `timeout-minutes`, so a hung
  step could run up to GitHub's 6h default. Partially mitigated already by
  `concurrency: cancel-in-progress` (a new push cancels a stuck prior run). A one-line
  `timeout-minutes:` is a cheap safety belt. Low priority. Seeded 2026-05-31.
