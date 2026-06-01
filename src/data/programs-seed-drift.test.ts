/// <reference types="node" />
/**
 * Drift guard: the committed `programs` migration must be byte-identical to a fresh regeneration
 * from the canonical `PROGRAMS`. This is what keeps the in-memory catalog (still read
 * synchronously by the engine) and the seeded database from silently diverging while both exist.
 * Fully offline — imports the generator's pure function, never `@/server/db` or the route, so no
 * DB connection is opened. If this fails, regenerate with `npm run gen:programs-seed` (and, if the
 * migration already shipped, add a NEW migration instead of editing the applied one).
 *
 * Run via `npm test` (node --import tsx --test), so the `@/` alias resolves and cwd is the repo
 * root.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { PROGRAMS } from '@/data/programs';
import { MIGRATION_RELATIVE_PATH, buildProgramsMigration } from '../../scripts/gen-programs-seed';

void test('committed programs migration matches a fresh generation from PROGRAMS', () => {
  const committed = readFileSync(join(process.cwd(), MIGRATION_RELATIVE_PATH), 'utf8');
  const regenerated = buildProgramsMigration(PROGRAMS);
  assert.equal(committed, regenerated);
});
