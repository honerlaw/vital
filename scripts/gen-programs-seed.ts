/**
 * Generates the `programs` table migration (schema + seed) from the canonical catalog in
 * `src/data/programs.ts`. `PROGRAMS` is the single source of record; this script renders it to
 * plain SQL so the migration content stays off the strict-lint surface. The committed migration
 * file IS this generator's output, and `programs-seed-drift.test.ts` asserts byte-equality, so
 * the in-memory catalog (still read synchronously by the engine) cannot silently diverge from the
 * seeded database.
 *
 * Regenerate after editing `PROGRAMS`: `npm run gen:programs-seed`. Because an applied migration
 * is immutable, if this migration has already shipped, add a NEW migration with the regenerated
 * seed rather than editing this file.
 *
 * Written in TypeScript (not the `scripts/*.js` lenient lane) so it can import the canonical TS
 * `PROGRAMS` and be imported by the tsx-run drift test with no module-format friction; run it via
 * tsx (the `gen:programs-seed` npm script).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROGRAMS } from '@/data/programs';
import { type Program } from '@/data/types';

/** Path (relative to the repo root) of the committed migration this generator owns. */
export const MIGRATION_RELATIVE_PATH = 'migrations/1780279974623_create-programs.sql';

export function buildProgramsMigration(programs: Program[]): string {
  const sqlString = (value: string): string => `'${value.replace(/'/g, "''")}'`;
  const programRow = (program: Program, index: number): string => {
    const values = [
      sqlString(program.id),
      sqlString(program.name),
      sqlString(program.tag),
      sqlString(program.cred),
      String(program.perWeek),
      sqlString(program.blurb),
      String(index),
      sqlString(JSON.stringify(program.days)),
    ];
    return `  (${values.join(', ')})`;
  };
  const rows = programs.map(programRow).join(',\n');
  return `-- Up Migration
--
-- GENERATED FILE — do not edit by hand. Regenerate with \`npm run gen:programs-seed\`.
-- Source of record: src/data/programs.ts. The drift-guard test asserts byte-equality.

CREATE TABLE programs (
  id         text    PRIMARY KEY,
  name       text    NOT NULL,
  tag        text    NOT NULL,
  cred       text    NOT NULL,
  per_week   integer NOT NULL,
  blurb      text    NOT NULL,
  sort_order integer NOT NULL,
  days       jsonb   NOT NULL
);

INSERT INTO programs (id, name, tag, cred, per_week, blurb, sort_order, days) VALUES
${rows};

-- Down Migration

DROP TABLE programs;
`;
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && invokedPath.endsWith('gen-programs-seed.ts')) {
  const target = join(process.cwd(), MIGRATION_RELATIVE_PATH);
  writeFileSync(target, buildProgramsMigration(PROGRAMS));
  process.stdout.write(`Wrote ${MIGRATION_RELATIVE_PATH}\n`);
}
