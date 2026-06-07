# Pattern: per-set weight/reps log — wrapper jsonb, both-boundary degrade, engine coercion

- Type: pattern
- Date: 2026-06-07
- Work unit: 022-per-set-weight-reps
- Related: [[017-pattern-per-user-state-persistence]] (owns the mirror-determinism contract and
  the no-FK/append-only history model this rides), [[020-pattern-per-program-cursors]] (owns the
  one-shared-guard-across-three-boundaries discipline and the NaN/float numeric traps this
  extends), [[014-pattern-server-pg-access-expo-routes]] (the single-statement CTE the set_log
  column joined as one more param), [[010-pattern-do-app-platform-migrations]] (deploy-side
  migrations; see its local-verification addendum from this unit),
  [[030-pattern-cross-session-weight-prefill]] (the fallback POLICY layered on this
  contract — three-rung chain, asymmetric done-qualification)

How VITAL records per-set weight and actual reps (022): `SetEntry {done, weight, reps}` end to
end — `LiveSession.sets` in memory, a `set_log` jsonb column on `workout_sessions`, optional
`exercises`/`unit` on history entries. This entry records only the DELTA over 017/020; the
determinism and shared-guard fundamentals live there.

## The wrapper-object schema (not a bare array)

`set_log jsonb NOT NULL DEFAULT '{}'::jsonb` stores `{"unit":"lb","exercises":[...]}`. The
wrapper exists because the unit needs a home IN the row: history must be self-describing so a
future kg toggle needs **no backfill** of append-only rows. `'{}'` (the default, and every
old-client write) and empty `exercises` both read as "no per-set data" — the optional field is
omitted, never served as "logged an empty workout". ALL set rows persist, including untouched
`{done:false, weight:null, reps:null}` ones (planned-vs-actual stays visible; consumers filter
on `done`).

## Both-boundary degrade for an optional sub-object (the brick-boot closure)

017's read path had ONE failure mode per boundary: server mapper throws (route 500s), client
payload guard rejects (hydration errors). An OPTIONAL field changes the calculus — its
corruption must not take down the entry that carries it:

- **Server** (`session-log-mapper.ts`): core columns keep throw-semantics (their corruption is
  server fault); `set_log` alone parses best-effort — `console.error` + serve the log WITHOUT
  the optional field. One bad blob can no longer 500 the whole history list (which gates boot).
- **Client** (`sanitize-session-log.ts`, mapped in `fetch-user-state.ts`): the core guard
  (`isSessionLog`) deliberately doesn't inspect optional fields — making it strict would let ONE
  corrupt row fail `every()` and brick boot, the exact vector the server fix closes. Instead a
  per-entry sanitizer rebuilds from core fields and ATTACHES `exercises`/`unit` only when they
  re-validate through the shared guard (attach-on-valid, drop-on-invalid).

Deliberate asymmetry, stated: **strict writer** (POST 400s on present-but-malformed via the
shared guard; absent → accept, so pre-022 clients keep working), **tolerant reader** (both
boundaries degrade). The one-shared-guard rule (`isSetEntry` family) is 020's discipline applied
to the new shape.

## Guards validate — they don't strip. Re-project on write.

The `in`-based guards accept objects with EXTRA keys; `JSON.stringify(body.exercises)` verbatim
would persist arbitrary client-attached keys into append-only history forever. The POST route
re-projects to the known shape (`{name, scheme, sets: [{done, weight, reps}]}`) before
stringifying — the write-side mirror of the sanitizer's rebuild-from-known-fields.

## The scheme separator is U+00D7 '×', not ASCII 'x'

Every catalog `scheme` string ("3×5", "5×3+", "3×8-12") uses the Unicode multiplication sign
**U+00D7**. A parser written with ASCII `x` compiles, typechecks, and silently returns null for
every scheme — the whole prefill feature no-ops with zero error signal. `parseSchemeReps` is the
single scheme-reading helper (regex pins the `×` codepoint; "N×M"→M, "N×M+"→M AMRAP floor,
"N×M-K"→M range floor, anything else → null) and its test enumerates the full 16-scheme
migration-seed vocabulary plus an explicit ASCII-'x'-rejection case.

## Coercion choke point + commit-on-toggle prefill (the UI contract)

ALL numeric coercion (finite, non-negative, integer reps, null-for-invalid) lives in the pure
`updateSet` engine function — never in the UI or the persistence wrapper — so 017's
reducer/wrapper mirror holds with `finishSession(state, nowISO)` unchanged as pure projection.
The UI prefill contract that emerged:

- Fallbacks (reps from `parseSchemeReps`, weight from the nearest prior committed set in the
  exercise) render as **placeholders**, not seeded text — a mount-time seed cannot work because
  all rows mount at session start, before any weight exists to inherit.
- A blank field commits its fallback ONLY on the pending→done toggle; typed values are **never
  clamped** to the scheme (15 over a "5+" records 15).
- **Un-toggling patches only `{done:false}`** — a deliberately cleared field must not be
  resurrected from its fallback (review-caught bug: a direction-blind toggle handler silently
  re-commits placeholders).
- Edits never cascade: placeholders are live-derived but never overwrite typed/committed text.

Accepted v1 bound: the inputs hold local text, so engine-rejected junk (pasted "12.5.5" → NaN →
stored null) can transiently display while null is stored — data stays safe, display self-corrects
on remount.
