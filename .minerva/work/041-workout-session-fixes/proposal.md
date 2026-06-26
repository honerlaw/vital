# 041 — Workout session fixes: keyboard, PPL catalog, duration & volume

## Status

Draft

## Goal

Four related fixes to the workout-logging experience:

1. **Keyboard avoidance** — focusing a weight/reps input on the workout log screen must scroll
   the field clear of the on-screen keyboard.
2. **Reddit PPL correctness** — the seeded PPL catalog entry is an abbreviated 3-day rotation
   with missing exercises; rebuild it as the canonical 6-day Metallicadpa A/B program.
3. **Workout duration** — track elapsed time from session start to finish; show a live ticking
   timer during the session and the final duration in history.
4. **Total weight lifted** — show per-session training volume (Σ weight × reps over completed
   sets) in the history view.

## Why

These are user-reported gaps in the core workout loop. (1) makes the lower inputs unusable when
the keyboard is up. (2) means the flagship community program doesn't match what users expect from
"Reddit PPL" — exercises are missing and `per_week: 6` is inconsistent with only 3 rotation days.
(3) and (4) are the two headline stats a lifter wants from a finished session, currently absent.

## Approach

**Issue 1 — keyboard (UI only).** `src/app/workout.tsx` renders `<Screen hasHeader>` without
`keyboardAware`, so `Screen`'s `automaticallyAdjustKeyboardInsets` resolves to `false`. Opt in
with `<Screen hasHeader keyboardAware>` — the exact mechanism work 034 added for the routine
intake form (iOS scrolls the focused field clear; Android's default `resize` already handles it).

**Issue 2 — Reddit PPL (new migration).** The seed's source-of-record is the migration SQL itself
(the TS generator was retired in work 010; see [[015-pattern-generated-seed-drift-guard]]). An
applied migration is immutable, so add a **new** migration that `UPDATE`s the `programs` row
`id = 'ppl'`, replacing `days` with the canonical 6-day A/B structure (Pull A, Push A, Legs A,
Pull B, Push B, Legs B; main lift alternates between A and B). Each `Exercise` keeps the existing
shape (`name`, `sets`, `scheme`); multi-set main lifts use a display scheme like `"4×5, 1×5+"` with
`sets` = total working sets. History is self-contained (denormalized at finish), so existing logged
PPL sessions are unaffected.

**Issue 3 — duration (engine + state + DB + UI).**
- `LiveSession` gains `startedAtISO: string`. `START_WORKOUT` and `SWITCH_AND_START_WORKOUT`
  actions gain a `nowISO` field, stamped at the dispatch site (mirrors `FINISH_WORKOUT`'s `nowISO`
  determinism contract). `startSession(program, dayIndex, nowISO)` seeds it.
- `finishSession` computes `durationSec = max(0, round((finish − start) / 1000))` and adds it to the
  `SessionLog` as optional `durationSec?: number`.
- Persistence: new migration adds `duration_sec integer` (nullable) to `workout_sessions`. The POST
  body (`FinishedSessionBody`), the `sessions+api` validator, the `INSERT`, the `me-state-get`
  `SELECT`, and `rowToSessionLog` all carry `durationSec` — optional/best-effort at the trust
  boundaries, exactly like the 022 `set_log` fields (old rows → `null` → omitted).
- UI: a small live elapsed timer on the workout screen (ticks each second from `startedAtISO`);
  history rows show the formatted final duration. New `formatDuration` util (e.g. `"1h 04m"` /
  `"42m 18s"`).

**Issue 4 — total volume (pure derivation, no DB change).** A pure helper
`sessionVolume(log): number` = Σ over `exercises[].sets[]` where `done && weight != null &&
reps != null` of `weight × reps`. Rendered in `HistoryRow` only when `> 0`. No persistence change —
derived from the already-stored `set_log`.

### Candidate approaches considered

- **Issue 2 structure:** (a) full canonical 6-day A/B — **chosen** (user-selected; most faithful,
  fixes the per_week inconsistency); (b) keep 3-day rotation, add missing accessories — rejected by
  the user as not the true program.
- **Issue 3 storage:** (a) persist `duration_sec` directly — **chosen** (one read, no client math on
  history hydrate); (b) persist `started_at` and derive duration on read — rejected (extra column,
  redundant with the existing `finished_at`, and the client would recompute on every render).
- **Issue 4 storage:** (a) derive client-side from `set_log` — **chosen** (zero schema change, the
  set data already round-trips); (b) persist a precomputed `volume` column — rejected (denormalizes
  a value trivially derivable from data already present; risks drift).

## Success criteria

1. Focusing any weight/reps input on the workout log screen scrolls that field clear of the
   keyboard on iOS (and remains reachable on Android).
2. The Reddit PPL program loads as 6 days (Pull A, Push A, Legs A, Pull B, Push B, Legs B) with the
   canonical Metallicadpa exercise/scheme list and alternating main lifts, applied via a new
   migration; `per_week` stays 6 and is now consistent.
3. A live elapsed timer is visible during an active workout, ticking from session start; the
   finished session's total duration is persisted and shown in the history row. Sessions logged
   before this change (no `duration_sec`) render without a duration, never an error.
4. Each history row shows total weight lifted (Σ weight × reps over completed sets) when that
   session has weighted sets, and omits it otherwise.
5. `npm run lint`, `npm run typecheck`, and `npm test` pass.

## Open Questions

None — the PPL structure decision was resolved with the user (full 6-day A/B canonical).
