# 045 — Standalone "Switch to this program" CTA

## Status

Draft

## Goal

Give the program-detail screen a way to make a different program the active
program **without starting a workout**. Today the only switch affordance for an
inactive program is "Switch & begin workout →", whose switch **commits at the
Begin tap and reverts on CANCEL** (015). A user who taps it to "pick the program
I'll train later" and then backs out of / cancels the workout finds the active
program unchanged — the switch silently reverted.

## Why

Reported: *"When you click 'switch & begin workout' it doesn't actually switch
the program over, especially if you don't complete the workout. I might just
want to select the new program I'm going to do later that day."*

The revert-on-cancel is correct **for the switch-and-train flow** (015 designed
it to be a lossless no-op if you abandon the workout). The gap is that there is
no separate "just switch, I'll train later" path — 019 deliberately shipped with
"there is no standalone set-active tap", gating every switch on starting a
workout. This unit revisits that decision for the non-first-run case: a plain
switch is a legitimate, distinct intent from switch-and-train.

## Approach

Add a **secondary CTA** to the program-detail screen, shown only for an inactive
program that isn't the first-run case (`!neverChose && !active`):

- Primary (unchanged): `Switch & begin workout →` → `SWITCH_AND_START_WORKOUT`
  (switch + start, cancel-reverts per 015).
- **New secondary**: `Switch to this program` → dispatches the **existing**
  `SET_ACTIVE_PROGRAM` and navigates home — identical to the first-run
  `onChoose` path, which already persists the switch (`StateProvider` PUTs on
  `SET_ACTIVE_PROGRAM`). This is a persistent switch: no live session, nothing to
  cancel-revert.

Supporting change: `Button` currently exposes only `primary` / `onAccent`. Add a
`secondary` (outline) variant — transparent fill, accent border + accent label —
so the two stacked CTAs read as primary + secondary.

No reducer, action, engine, wire-contract, or persistence change: `SET_ACTIVE_PROGRAM`
already exists, is persisted by `StateProvider`, and is covered by `reducer.test.ts`.
Switching still never mutates the per-program cursor map (020), so a later
"Switch & begin" resumes the target's own position.

### Rejected alternatives

- **Make "Switch & begin" persist on CANCEL** — disturbs 015's deliberate
  lossless revert (cancelling a mis-tapped program would strand you switched)
  and still doesn't serve "switch now, train later".
- **Replace "Switch & begin" with a plain switch** — regresses the one-tap
  switch-and-train path.

## Success criteria

1. On an inactive, non-first-run program's detail screen, a `Switch to this
   program` button appears beneath `Switch & begin workout →`.
2. Tapping it makes that program active (persisted) with **no** live workout
   session started, and returns to Today showing the new active program.
3. The active program stays switched after that action regardless of any later
   workout being started/cancelled — it does not revert.
4. `Switch & begin workout →` and its 015 cancel-revert behavior are unchanged;
   the first-run "Choose this program" and the active-program "Begin workout →"
   CTAs are unchanged.
5. `Button` gains a reusable `secondary` variant; the two CTAs are visually
   distinct (primary filled, secondary outline).
6. `tsc`, lint, and the existing `reducer.test.ts` suite pass.

## Open Questions

None.
