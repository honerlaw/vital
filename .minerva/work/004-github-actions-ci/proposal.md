# 004 — GitHub Actions CI (build + tests + lint on every PR)

## Status

Draft

## Goal

Add GitHub Actions continuous integration that runs on every pull request and on
pushes to `main`, executing the project's full verification gate — TypeScript
typecheck, ESLint, the custom ESLint-rule tests, and a web build — so that a PR's CI
check fails unless all gates pass.

Note: this unit authors the *workflow* (which makes the check red on failure). Making
a failing check actually *block the merge* requires GitHub branch protection /
required status checks, which is a repo setting rather than workflow code and is
deferred to a follow-up (see Open questions).

## Why

The repo enforces a strict, un-bypassable local lint guardrail
(`.minerva/knowledge/001-constraint-strict-eslint-guardrails.md`), plus a typecheck
and a custom ESLint-rule test suite. Nothing enforces these on PRs today — there is no
`.github/workflows/` — so a contributor or agent can push code that fails the gates
and it is only caught locally, if at all. CI makes the existing gates an automatic
check on every change, closing the gap between "green on my machine" and "green on the
PR" and giving the un-bypassable-gate ethos teeth at the repo boundary.

## Approach

A single GitHub Actions workflow at `.github/workflows/ci.yml`:

- **Triggers:** `pull_request` (any base branch) and `push` to `main` (post-merge
  safety net).
- **Determinism:** runs on pinned `ubuntu-24.04`; Node pinned to the exact local
  version `24.13.0` via a committed `.nvmrc` consumed by `actions/setup-node`
  (`node-version-file`), with `cache: 'npm'`. `actions/*` pinned to `@v4` major tags
  (full commit-SHA pinning deferred — see Open questions). Dependencies installed with
  `npm ci` against the committed `package-lock.json`.
- **Least privilege:** top-level `permissions: { contents: read }`.
- **Concurrency:** group keyed `${{ github.workflow }}-${{ github.ref }}` with
  `cancel-in-progress: true`, so superseded PR pushes don't pile up slow web-export
  runs. Because the key includes the ref, `main` post-merge runs are never cancelled by
  PR runs (they live on different refs).
- **One job; gates as steps.** `npm ci` runs first as a hard fail-fast step
  (`id: install`). The four gate steps then run with
  `if: ${{ !cancelled() && steps.install.outcome == 'success' }}`, so a failure in one
  gate does not mask the others (all gates run and report), while any gate failure
  still fails the job:
  1. `npm run typecheck` — `tsc --noEmit`
  2. `npm run lint` — `eslint . --max-warnings 0`
  3. `npm run lint:rules-test` — `node --test eslint-rules/*.test.js`
  4. `npx expo export --platform web` — web build, ordered last (slowest; the cheap
     deterministic gates report first)

No type-generation step is needed. Empirically verified on the live repo: with
`.expo/types` and `expo-env.d.ts` absent (the fresh-CI-checkout condition), a clean
`npm ci` followed by all four gates passes (typecheck / lint / rules-test / web export
all exit 0). TypeScript treats the non-matching tsconfig `include` globs
(`.expo/types/**`, `expo-env.d.ts`) as empty rather than erroring, and the app code
does not reference generated typed-route/asset types in a type-breaking way.

Rejected alternatives:

- **Parallel jobs per gate** — clearer per-check status but re-runs `npm ci` (and the
  npm cache restore) once per job, for a gate that runs in well under a minute besides
  the web bundle. The single-job `if: always()`-style approach recovers the per-gate
  reporting benefit at a quarter of the install cost.
- **EAS Workflows (`.eas/workflows/`)** — the request was for GitHub Actions; EAS
  Workflows require Expo account/project linkage and run on EAS infrastructure, heavier
  than this static-analysis + web-bundle gate needs.

## Success criteria

1. `.github/workflows/ci.yml` exists, triggers on `pull_request` and `push` to `main`,
   and is valid YAML.
2. A committed `.nvmrc` pins Node to `24.13.0`, and the workflow consumes it via
   `node-version-file` (no hardcoded `node-version`).
3. The workflow installs dependencies with `npm ci` and runs all four gates:
   `npm run typecheck`, `npm run lint`, `npm run lint:rules-test`, and
   `npx expo export --platform web`.
4. All four gates run and report independently (one failing gate does not skip the
   others), and any gate failure fails the workflow (red check).
5. The workflow declares least-privilege `permissions: contents: read` and a
   `concurrency` group keyed `${{ github.workflow }}-${{ github.ref }}` with
   `cancel-in-progress: true`.
6. The change does not perturb the existing local gates — `npm run lint` /
   `npm run typecheck` stay green (the additions are `.yml` + `.nvmrc`, both outside the
   ESLint TypeScript globs).

Ship-phase observation (not closeable during the build phase): once the PR is opened,
its CI check actually runs and goes green on this branch. This is verified during ship,
since opening the PR is a ship-phase action.

## Open questions

- Should `actions/*` be pinned by full commit SHA (supply-chain hardening) rather than
  `@v4`? Deferred to a follow-up; `@v4` is GitHub's documented baseline.
- Should branch protection / required status checks be enabled so the gate is truly
  merge-blocking? That is a repo *setting*, not workflow code — logged as a follow-up;
  this unit only authors the workflow.
