# Pattern: generate-from-canonical seed + offline byte-equality drift guard

- Type: pattern
- Date: 2026-05-31
- Work unit: 009-program-catalog-db
- Related: [[009-decision-postgres-node-pg-migrate]] (plain-SQL migrations off the lint surface),
  [[010-pattern-do-app-platform-migrations]] (how the migration applies in prod),
  [[012-pattern-src-unit-tests-node-tsx]] (the offline `node --import tsx --test` lane the drift
  test runs in), [[014-pattern-server-pg-access-expo-routes]] (the read path the seed feeds),
  [[001-constraint-strict-eslint-guardrails]] (the one-function-per-file rule that shaped the layout).

How VITAL seeded the `programs` table from data that **also still lives in a TypeScript constant**
(`src/data/programs.ts` `PROGRAMS`, read synchronously by the engine until the deferred async cutover)
without the two sources silently diverging.

## The technique

1. **`PROGRAMS` stays the single canonical source.** It is not edited into SQL by hand.
2. **A generator emits the WHOLE migration file** (`scripts/gen-programs-seed.ts`): the Up section
   (`CREATE TABLE` + the `INSERT`s) and the Down section (`DROP TABLE`), rendered deterministically
   from `PROGRAMS`. It synthesizes `sort_order` from the array index, bridges camelCase→snake_case,
   `JSON.stringify`s the nested rotation into the `jsonb` `days` column, and SQL-escapes single quotes
   (`'` → `''`). The committed `.sql` **is** the generator's output; `npm run gen:programs-seed`
   rewrites it.
3. **An offline test asserts byte-equality** (`programs-seed-drift.test.ts`): it imports `PROGRAMS` and
   the generator's pure `buildProgramsMigration`, regenerates in memory, reads the committed migration
   file from disk, and `assert.equal`s the two strings. It imports **neither `db.ts` nor the route**,
   so it needs no DB and stays in the offline test lane. The generated body carries **no timestamp**
   (the timestamp lives only in the committed filename, at a fixed path the test reads), so the
   comparison is deterministic.
4. **Remediation respects immutable migrations.** Editing `PROGRAMS` turns the drift test red. The fix
   is to regenerate — but because an **applied** migration must never be edited, if this migration has
   already shipped, add a **new** migration with the regenerated seed instead of editing this file.

## Load-bearing details

- **The generator is `scripts/gen-programs-seed.ts` (TypeScript, strict-linted), NOT the `scripts/*.js`
  lenient lane.** This diverged from the original plan deliberately: a `.js` (CommonJS) generator can't
  cleanly import the canonical TS `PROGRAMS` (with the `@/` alias) and also be imported by the tsx-run
  drift test without CJS/ESM friction. A `.ts` generator run via `node --import tsx` sidesteps all of
  it. **The migration *content* still stays off the strict-lint surface** — ESLint lints only
  `.ts/.tsx/.js`, never `.sql` — so 009's intent holds; only the generator (clean typed string-building)
  is on the lint surface.
- **One function per file (`local/single-declaration`) shapes the layout.** The generator's helpers are
  **inner arrows** inside `buildProgramsMigration` (top-level helper functions would each count). The
  shared catalog guards were split into `src/data/guards/*` (one predicate per file + an `index.ts`
  re-export), mirroring `src/data/engine/` — they can't live in one file.

## When to reach for this

Any time a reference/catalog table must be seeded from data that also has a typed in-code
representation, and you want a build-time guarantee the two can't drift while both exist (typically a
dual-source window before a full cutover). The canonical-source → generated-artifact → byte-equality-test
loop generalizes beyond SQL.
