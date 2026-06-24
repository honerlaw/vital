# 039 — USDA food search: switch GET→POST to kill the intermittent gateway 400

## Status
Draft

## Goal
Make the nutrition-tab food search (`GET /api/me/food-search` → `searchUsdaFoods`) reliably reach
USDA instead of intermittently returning "SEARCH UNAVAILABLE". Switch the outbound USDA call from a
GET-with-query-string to a **POST `/foods/search` with a JSON body**, passing `dataType` as a JSON
array. Retire the now-moot `build-usda-search-url.ts` URL builder and its test.

## Why
The search has 502'd for ~half of all queries since 032, and **two prior fixes (#44, #47) failed**
because both misdiagnosed the cause as URL query-string encoding (comma `%2C`, then `+`-vs-`%20`
spaces) and "verified" the fix with **single-shot** live requests that happened to get a lucky 200.

Reproduced live (this session, real `USDA_API_KEY` from Doppler `vital/dev`), the exact shipped GET
URL returns **400 intermittently (~50%)** — the same identical URL repeated 8× gave
`200 200 200 400 400 200 400 400`. The trigger is the **parenthesized `dataType=Survey (FNDDS)`
value** (in *any* encoding — raw `(` and `%28` both flake; a lone `%20` space or simple
`dataType` values are 200 every time). It is a load-balanced flake at USDA's `api.data.gov` gateway
(api-umbrella / ApacheTrafficServer fronting nginx, per response headers), not a request-shape bug —
so no amount of query-string encoding fixes it.

Each USDA 400 → `searchUsdaFoods` throws → the route returns 502 → the client renders
"SEARCH UNAVAILABLE". The bug is invisible to CI, which never hits the live USDA API.

The **POST** form passes `dataType` as a JSON array and bypasses the query-string gateway path
entirely. Verified live **15/15 → 200**, body `foods: 25`, all three dataTypes present
(Foundation / SR Legacy / Survey (FNDDS)).

Live evidence (real key):

| Request form | Live result |
|---|---|
| GET exact shipped URL, repeated ×8 | 200 200 200 **400 400** 200 **400 400** (intermittent) |
| GET `dataType=Survey%20%28FNDDS%29` alone ×12 | 200 **400** 200 **400** 200 **400 400** 200 200 **400** 200 **400** |
| GET `dataType=SR%20Legacy` alone ×12 | 200 ×12 (a lone space is fine) |
| GET 3× simple `dataType` (no parens) ×10 | 200 ×10 |
| **POST JSON body ×15** | **200 ×15**, body foods:25 |

## Approach
In `src/server/usda-search.ts`, replace the GET fetch with a POST to
`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=<key>` (api_key stays in the query string —
the POST x15 test used that form and it is 200-reliable), `Content-Type: application/json`, body:

```json
{ "query": "<queryText>", "pageSize": 25, "dataType": ["Foundation", "SR Legacy", "Survey (FNDDS)"] }
```

The response-parsing / `FoodSearchResult` mapping below the fetch is unchanged. `searchUsdaFoods`'s
signature and the `/api/me/food-search` route + client contract are unchanged — this is a
server-internal transport change only.

Delete `src/server/build-usda-search-url.ts` and `src/server/build-usda-search-url.test.ts`: the
whole `+`-vs-`%20` / `%2C` URL-shape contract they pin is moot once `dataType` travels in a JSON
body. The constants (`SEARCH_URL`, `DATA_TYPES`, `PAGE_SIZE`) move inline into `usda-search.ts`.

### Considered, rejected
- **GET but drop the `Survey (FNDDS)` data type** (the only paren value). Removes the flake's
  trigger but loses a whole generic-food source (FNDDS survey foods) for a transport bug, and gives
  no guarantee another input never flakes. Rejected.
- **GET with a retry-on-400 loop.** A latency band-aid that keeps relying on a ~50%-flaky path;
  masks the problem rather than removing it. Rejected.

## Success criteria
1. `searchUsdaFoods` issues a POST with a JSON body carrying `query`, `pageSize: 25`, and
   `dataType: ["Foundation","SR Legacy","Survey (FNDDS)"]`; `api_key` in the query string.
2. `build-usda-search-url.ts` and its test are deleted; no remaining import of `buildUsdaSearchUrl`.
3. The response-parsing / mapping path and `searchUsdaFoods`'s signature are unchanged.
4. `npm test` green (full suite); `npm run lint` clean; no NEW `tsc` errors vs. the baseline (the
   pre-existing Expo-Router typed-route errors in `(tabs)/index.tsx`, `nutrition.tsx`, `programs.tsx`
   are unrelated and present on a clean tree).
5. Live confirmation against the real key: POST form returns 200 with a valid `foods` body
   (already demonstrated 15/15 this session).

## Open Questions
None. The fix is verified live; the only CI-invisible seam (live USDA) was exercised directly this
session with the real key.
