# Pattern: CI needs no Expo type-generation step (gates pass with generated type files absent)

- Type: pattern
- Date: 2026-05-31
- Work unit: 004-github-actions-ci
- Related: [[001-constraint-strict-eslint-guardrails]] (the gates this CI enforces)

As of 2026-05-31, the repo's verification gates run **clean from a fresh `npm ci`** — with
`.expo/types/**` and `expo-env.d.ts` **absent** — even though all of the following are true:

- `tsconfig.json` `include`s `.expo/types/**/*.ts` and `expo-env.d.ts` (both gitignored).
- `app.json` enables `experiments.typedRoutes` and `experiments.reactCompiler`.
- ESLint runs type-aware (`projectService: true`, `recommendedTypeChecked`).

This is counterintuitive enough that it caused a consensus-failure-and-revision round during
proposal: a node_modules trace correctly established that **`npx expo export` does NOT generate
`.expo/types/**` or `expo-env.d.ts` in SDK 56** — that type-generation code is reachable only
through the dev-server lifecycle (`expo start`) and `expo customize`, never through `export` —
and from that the (wrong) conclusion was drawn that CI typecheck/lint would fail on a fresh
checkout. Empirically they do **not** fail:

- TypeScript treats `include` globs that match nothing as **empty, not an error**.
- The app code does not currently reference generated typed-route or asset types in a
  type-breaking way (no `import x from './y.png'`-style asset imports, no statically-typed
  `Href` route values).

Therefore `.github/workflows/ci.yml` runs `npm ci → typecheck → lint → lint:rules-test →
expo export --platform web` with **no type-generation prep step**, and that is correct, not an
omission.

**Falsification condition — when this stops being true.** If app code starts (a) importing an
asset that relies on the generated `expo-env.d.ts` ambient module declarations
(`import logo from '@/assets/logo.png'`), or (b) using a statically-typed router `Href` value
that depends on the generated `.expo/types/**` route declarations, then the absent generated
files stop being "empty globs" and become "missing *referenced* types" — and CI typecheck/lint
will fail for an **environmental** reason, not a real code defect. The fix in that case is to
add a type-generation step before the typecheck/lint gates (e.g. `npx expo customize
tsconfig.json`, verified to terminate rather than hang in watch mode; note `customize` alone may
still under-generate route types without a running Metro, so confirm in CI). Do **not** "fix" it
by deleting this note or loosening tsconfig — the right response is a typegen step.
