# Scratchpad: food-tracking-foundation

> **Ephemeral working memory.** Most of what lands here is noise — small
> decisions that don't matter, dead ends, momentary confusion. At feature
> completion, run `minerva:promote`: significant items get promoted to
> `.minerva/knowledge/`, `proposal.md` gets updated to match reality, and
> the raw scratchpad is archived.

## Implementation notes (2026-06-22)

Built Unit 1 end-to-end. Files: migration `1782250000000_food-log.sql`; types `food-types.ts`;
8 guards (`isMacroNumber`, `isFoodSource`, `isNewFoodLogEntry`, `isFoodLogEntry`,
`isFoodLogEntryArray`, `isFoodServingOption`, `isFoodSearchResult`, `isFoodSearchResultArray`);
server `numeric-column.ts`, `food-log-mapper.ts`, `usda-nutrient-value.ts`, `usda-search.ts`,
4 route handlers + 3 `+api.ts`; client `fetch-food-log`/`add-food-log-entry`/`delete-food-log-entry`/
`search-foods`; `useFoodLog` hook; utils `todayLocalDay`/`shiftLocalDay`/`diaryDayLabel`/`sumMacros`;
components `DayNavHeader`/`FoodLogRow`/`FoodSearchResultRow`/`FoodSearchPanel`/`ManualEntryPanel`;
screens `(tabs)/nutrition.tsx` + `nutrition/add.tsx`; tab registration in both bars + RootNavigator;
2 test files (12 new tests).

Deliberate v1 simplifications (within the grilled plan, NOT divergences):
- **Serving options come from the search payload only** — always a `100 g` base, plus the food's
  own gram `servingSize` when USDA returns one. No per-result `/food/{fdcId}` detail round-trip, so
  household portions appear only when the search response carries a gram serving; otherwise the
  grilled "100 g / enter-grams" fallback applies. A detail-call enrichment is a clean fast-follow.
- **Android/web tab icon is Feather `coffee`** (no utensil glyph in Feather); iOS uses the proper
  SF Symbol `fork.knife`.
- **`numeric` columns are SELECT-cast to text** (`::text`) and coerced by `numericColumn` — node-pg
  returns `numeric` as a string; the date cast avoids a server-TZ `Date`.

Gate evidence (all from the worktree, node_modules symlinked transiently from the main repo):
- `eslint . --max-warnings 0` → PASS
- `tsc --noEmit` → PASS
- `npm test` → 100/100 pass (12 new food tests among them)
- `npm run lint:rules-test` → pass
- `npx expo export -p web` → built all 13 API routes (incl. the 3 new food routes) + the web
  bundle (nutrition tab + add screen), no SSR errors.

NOT executed in this environment (honest limits, surfaced to the completion panel):
- The migration was not applied to a live DB (no `DATABASE_URL`); SQL mirrors prior migrations.
- USDA search not exercised against the live API (no `USDA_API_KEY`); request/parse/map path is
  unit-tested + type-checked.
- The app was not run in a simulator; verification is via the same static gates CI uses.

## Panel decisions 2026-06-22
- [3/3 accept] completion verification: all 8 success criteria honestly met at the repo's CI bar
  (eslint/tsc/test/export pass); live DB migrate, USDA key, simulator classified as deployment/
  runtime concerns, not code-completeness gaps. Panel independently confirmed the macro math,
  local-timezone day handling, auth scoping, key discipline, and the useFocusEffect date-change
  refetch wiring are correct.

## Panel concerns 2026-06-22
- [medium] Skeptic: a crafted `POST /api/me/food-log` with `quantity: 0` passes `isNewFoodLogEntry`
  (`isMacroNumber` accepts `>= 0`). Client paths enforce `qty > 0` (FoodSearchPanel) / hardcode 1
  (ManualEntryPanel), so only a hand-crafted request reaches it; it yields a zero-everything row,
  no totals poisoning. Missing server-side invariant — carry into Phase 3 (Review) triage.

## Review triage 2026-06-22

Findings from the minerva audit + an independent code-review pass; triage panel **3/3 accept** on
the FIX/IGNORE split.

- [3/3 accept] review triage: FIX findings 1-7, IGNORE 8-10 (see below).

FIX (applied this phase):
1. [med] isNewFoodLogEntry accepted quantity:0 -> require > 0.
2. [med] isFoodServingOption accepted grams:0 -> require > 0.
3. [med] date-nav showed the prior day's entries/totals under the new day's header until the
   fetch resolved -> useFoodLog now keeps a date-stamped snapshot and derives entries=[] /
   status='loading' in render when the snapshot's date != the requested date (no synchronous
   setState on date change - 004 deferred-setState rule).
4. [med] invalid calendar dates (2026-13-45) passed the bare regex -> Postgres 500 -> new
   isLocalDay guard (own file) checks format AND real-calendar validity; used in
   isNewFoodLogEntry and the GET route.
5. [low] add-failure was swallowed silently in both panels -> inline "couldn't save" message.
6. [low] serving-chip key={opt.label} not unique -> composite label+grams key.
7. [low] no server max-length on name/servingLabel -> cap 200 / 100 in the guard.

IGNORE (documented v1 choices):
8. [low] delete-failure swallowed - reconciles on next focus refetch (in-code comment).
9. [low] reload redundant wrapper - harmless; the date-stamped snapshot makes out-of-order
   resolutions safe.
10. [low] diaryDayLabel en-US locale - intentional single-locale v1.

## Promote 2026-06-22
- [2/3 accept] partition: PROMOTE 036-pattern-food-tracking-foundation; MERGE proposal "As shipped"
  + Status Shipped; TODO->followups (USDA household-portion enrichment); DISCARD process logs.
  Skeptic concern applied: knowledge "012 rationale" shorthand re-linked to
  [[017-pattern-per-user-state-persistence]]; proposal schema user_id -> clerk_user_id.
- [skipped — small] TODO disposition: single unambiguous item (USDA household-portion enrichment)
  -> followups.md (evidence: one TODO, no competing disposition).
- [synthesis] no-op (1 un-synthesized entry [036] below threshold; overview link-rot empty; food
  theme deferred until Units 2-4 add a cluster worth a theme section).
