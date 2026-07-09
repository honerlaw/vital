# Pattern: surfacing program origin — origin sections + a generated-at stamp, from data already held

- Type: pattern
- Date: 2026-07-09
- Work unit: 046-differentiate-generated-programs
- Related: [[034-pattern-ai-routine-generation]] (the source of the two-table/one-array design and
  the `userProgramIds` partition this surfaces; the "catalog omits the field, absence = catalog"
  idiom extended here from `Exercise.progression` to `Program.createdAt`),
  [[019-pattern-null-active-program-first-run]] (the same programs list this now sections),
  [[028-pattern-per-set-log-tracking]] (strict-writer mapper / tolerant-reader guard — the shape the
  new optional field is plumbed under), [[014-pattern-server-pg-access-expo-routes]] (the
  `UnknownRow` cast-free row-mapper this extends with a timestamptz normalization)

How VITAL made generated programs distinguishable from the built-in catalog — and from each other —
**without a migration or a new column**, by surfacing data the system already held but never showed.

## The origin signal already existed client-side; the list just wasn't using it

Generated programs (034) are merged into the single `state.programs` array with a parallel
`state.userProgramIds: string[]` marking which entries came from the user's table. The programs
screen rendered the flat array with no grouping. The fix is pure presentation: `programs.tsx`
partitions on `userProgramIds.includes(id)` into a "Your Routines" section (rendered only when
non-empty) and a "Program Catalog" section. No state, no wire, no schema touched — the same
partition that gates the delete button (034) now drives layout. `ADD_USER_PROGRAM` already pushes
the id into `userProgramIds`, so a just-saved program lands under "Your Routines" immediately.

## `created_at` existed on the row but was never SELECTed — surfacing it is a strict subset change

`user_programs.created_at` (NOT NULL, `now()`) had always existed and was already the `ORDER BY` key
in `GET /api/me/programs`, but was never in the SELECT list, never mapped, never shown. Surfacing it:
add `created_at` to the GET SELECT **and** the POST `… RETURNING` (POST so the freshly-saved program
carries its stamp before any refetch), and read it in `rowToUserProgram`. The catalog table has no
such column, so catalog `Program`s simply omit the field.

- **Optional field, catalog omits it — the 034 idiom generalized.** `Program.createdAt?: string`
  follows the same "absence = catalog / today's behavior" rule that `Exercise.progression` uses:
  the field's absence is a provable "this is a catalog program". The `isProgram` guard stays
  tolerant — `!('createdAt' in value) || typeof value.createdAt === 'string'` — so a draft (no
  stamp) and a catalog row (no column) both pass, and only a malformed stamp is rejected.
- **timestamptz normalization in the cast-free mapper.** `pg` returns a timestamptz column as a JS
  `Date`, not a string. `rowToUserProgram` normalizes `Date → toISOString()`, passes a string
  through, and drops anything else — keeping the wire value a plain ISO string with no `pg` import
  (still offline-unit-testable, 014).

## Disambiguation needs the TIME, not just the date

The user's collision was two routines the LLM named identically, generated in one session. A
date-only stamp would not have told them apart, so `generatedStamp` renders date **and** time
(`"JUL 9 · 2:34 PM"`, uppercased by the `tag` text style) — a new util rather than reusing the
date-only `historyDate`. Belt-and-braces, the `/generate` prompt now also asks the model for a
specific, distinctive name; the timestamp is the deterministic disambiguator, the prompt nudge is
best-effort and does nothing for already-saved programs.
