# Replan log — 040-usda-household-portions

## 2026-06-24 — stale base: rebase onto the 039 GET→POST refactor

**Original plan.** Branch off `main`, enrich the USDA search mapper's `servingOptions` with
`foodMeasures[]` household portions; promote a `040` knowledge entry relating to the `038`
URLSearchParams-400 fix; refresh the overview from watermark 037 → 040.

**What changed.** The worktree was branched from a **stale local `main`** (1 commit behind
`origin/main` at the time, per the start-of-run fetch). While this unit was in flight, PR #48
(`039-usda-search-post`) merged to `origin/main`, which:
- switched the USDA search transport from **GET + a query-string URL builder** to **POST + a JSON
  body**, **deleting** `src/server/build-usda-search-url.ts` (+ its test) and editing
  `src/server/usda-search.ts` — the file this unit also edits;
- added knowledge `039-pattern-usda-gateway-intermittent-400-post-fix`, which **supersedes**
  `038-pattern-urlsearchparams-plus-space-gateway-400` (the `+`-space fix was a red herring; the
  real bug was an intermittent gateway 400, fixed by POSTing);
- already refreshed `overview.md` to watermark **039** (folding in 038-SSE-streaming and the 039
  POST fix) and edited `036` / `038-urlsearchparams`.

So my branch (a) still imported the now-deleted `build-usda-search-url`, and (b) its knowledge
edits and overview refresh raced origin's.

**New plan.** Merge `origin/main` into the branch and resolve:
- `usda-search.ts` → keep origin's **POST** transport; apply only this unit's change
  (`servingOptions: buildServingOptions(food)`), drop the now-unused `FoodServingOption` import.
- `build-usda-search-url.ts` (+ test) → stay **deleted** (this unit never depended on it once the
  inline block is replaced).
- `usda-serving-options.ts` (+ test) → unchanged; transport-agnostic, no conflict.
- Knowledge: re-relate the `040` entry to **`039`** (the current POST transport) rather than the
  superseded `038`; add a `040` reciprocal to `039`; keep the `036` ↔ `040` link; redo the
  overview refresh on top of origin's watermark-039 version (append the 040 household-portions
  narrative, bump to 040, drop the redundant 038-SSE addition origin already folded in).

The feature design is unchanged — this is a base-staleness reconciliation, not a design change.
The merge result is verified by the same lint / typecheck / full-test gate, and the merge is held
for explicit user approval per project policy (no auto-merge on vital — no required checks).
