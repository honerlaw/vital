# Followups — 001-strict-lint-guardrails

- **Extend the stylistic caps to tooling `.js` files.** The strict rules (`@stylistic/max-len`
  100-col, `local/single-declaration`) are currently scoped to `**/*.ts`/`**/*.tsx`. The config
  and custom-rule files (`eslint.config.js`, `eslint-rules/*.js`) get only base
  `eslint-config-expo` + `tseslint.configs.disableTypeChecked`. Consider applying the
  *stylistic* caps (max-len, one-declaration-per-file where it makes sense) to those `.js`
  files for consistency. NOTE: do **not** try to enable the *type-checked* rules on `.js` —
  they are not in the TS program, which is exactly why the `disableTypeChecked` override exists.
  Seeded 2026-05-31.
