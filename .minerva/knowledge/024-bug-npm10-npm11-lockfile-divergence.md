# Bug: npm 11 writes lockfiles npm 10 rejects — EAS broke while CI stayed green

- Type: bug
- Date: 2026-06-06
- Work unit: PR #24 (TestFlight build 6 failure)
- Related: [[018-decision-eas-ios-release-workflow]] (the build pipeline this broke),
  [[021-decision-gh-actions-ios-release-orchestration]] (where the green-GH/red-EAS
  split is invisible), [[001-constraint-strict-eslint-guardrails]] (the worktree
  node_modules note this extends)

EAS build 6 failed at `npm ci` with `Missing: @emnapi/core@1.10.0 from lock file`
while the identical commit was green on GitHub CI. Two stacked causes:

1. **npm major divergence.** npm 11 (node 24 — CI and dev via `.nvmrc`) PRUNES the
   `@emnapi/*` entries (`unrs-resolver`'s optional wasm-runtime fallback) when it
   regenerates a lockfile; npm 10 (node 22 — the EAS image default at the time)
   REQUIRES them. Any lockfile regeneration with npm 11 produced a file npm 10
   rejects. Fix half 1: `eas.json` now pins `build.production.node: "24.13.0"`
   (matching `.nvmrc`/`engines`) so EAS and CI run the same npm major. **EAS does NOT
   honor `engines` or `.nvmrc` on its own** — it warns (`EBADENGINE`) and proceeds.
2. **node_modules pollution.** `npm install` records what it finds in `node_modules`
   into the lockfile — the `--no-save` `@resvg/resvg-js` install (icon script, #21)
   plus npm 11's pruning produced a half-recorded graph. A naive "clean-room"
   regeneration then broke differently: it reshuffled dedupe so two
   `@typescript-eslint` copies installed and eslint died with `Cannot redefine
   plugin` — caught only by a full clean `npm ci`, NOT by `npm ci --dry-run`.

The recipe that worked (use it for any future lockfile repair):

- Regenerate as a **minimal delta over the last known-dual-valid lockfile** in a temp
  dir containing ONLY `package.json` + that lockfile (no node_modules), using
  **`npx npm@10 install --package-lock-only`** — npm 10 writes the superset both
  majors accept.
- Validate THREE ways before shipping: `npx npm@10 ci --dry-run`, `npm ci --dry-run`
  (npm 11), and a full clean `rm -rf node_modules && npm ci && npm run lint` — the
  dedupe regression only shows up in the last one.
