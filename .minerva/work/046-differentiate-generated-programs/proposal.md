# 046 — Differentiate generated programs from the catalog + disambiguate them

## Status

Draft

## Goal

In the programs list, make it obvious which programs are the built-in catalog and
which the user generated with the AI routine wizard, and make two generated
programs distinguishable at a glance — even when the LLM gave them near-identical
names.

## Why

Generated programs (030) are merged into the same flat `state.programs` array as the
5 curated catalog programs and rendered by `programs.tsx` with no grouping and no
visual origin cue beyond the `ProgramCard` footer's `cred` string ("Generated for
you"). The user generated two similar routines that came back with the **same
name**, differing only in blurb — with nothing on the card to tell them apart. The
data to fix both problems already exists and is simply not surfaced:

- Origin is already known client-side via `AppState.userProgramIds` (030) — the list
  just doesn't use it to group.
- `user_programs.created_at` already exists (NOT NULL, default `now()`) and is
  already used for `ORDER BY created_at DESC` in the GET route, but is never
  `SELECT`ed, mapped, or displayed.

So this is a surfacing change, not new machinery. No migration.

## Approach

Three additive pieces, no schema migration:

1. **Section the programs list by origin.** In `src/app/(tabs)/programs.tsx`, split
   `state.programs` into user programs (`state.userProgramIds.includes(id)`) and
   catalog programs, and render them under two labeled section headers — "Your
   Routines" (shown only when non-empty) and "Program Catalog". Ordering within each
   group is preserved from the merged array (catalog by `sort_order`, user portion
   newest-first per the GET query).

2. **Plumb `created_at` through as an optional `Program.createdAt` and show a
   generated stamp.** Catalog programs omit the field (mirroring how catalog
   exercises omit `progression` in 030/034 — absence = catalog). Touch points:
   - `Program` type: add `createdAt?: string` (ISO).
   - `me-programs-get.ts` SELECT and `me-programs-post.ts` INSERT … RETURNING: add
     `created_at` (POST so a just-saved program shows its stamp immediately, before
     any refetch).
   - `rowToUserProgram`: read `created_at`, normalize pg's `Date`/string to an ISO
     string, set `createdAt`.
   - `isProgram` guard: tolerate the optional field (`!('createdAt' in value) ||
     typeof value.createdAt === 'string'`).
   - `ProgramCard` footer: when `createdAt` is present, render
     `GENERATED <date · time>` (a new `generatedStamp` util) instead of the `cred`
     string; catalog cards keep `${cred} / N-DAY CYCLE`. Time is included so two
     routines generated the same day remain distinguishable.

3. **Nudge the generator toward a distinctive name.** Add one instruction to
   `generate-prompt.ts` asking the model to choose a specific, distinctive name
   (e.g. reflecting the split/emphasis) rather than a generic one. Belt-and-braces
   with the timestamp; the timestamp is the deterministic disambiguator.

## Success criteria

1. In the programs list, generated programs appear under a "Your Routines" section
   header and catalog programs under a "Program Catalog" header; the "Your Routines"
   header is absent when the user has no generated programs.
2. Each generated program card displays its generation date **and time** derived
   from `user_programs.created_at`; two generated programs saved the same day are
   visually distinguishable.
3. Catalog program cards are unchanged — no stamp, no "Your Routines" grouping.
4. `created_at` flows `user_programs` → GET/POST route → `rowToUserProgram` →
   client `Program.createdAt` (optional ISO string); catalog `Program`s omit it.
5. `isProgram` tolerates the optional `createdAt`; `npm run typecheck` / lint / the
   mapper + guard unit tests pass.
6. `generate-prompt.ts` instructs the model to choose a specific, distinctive name.

## Open Questions

None load-bearing. (Stamp format chosen as short date + time, e.g. `JUL 9 · 2:34 PM`,
matching the uppercase `historyDate` house style.)
