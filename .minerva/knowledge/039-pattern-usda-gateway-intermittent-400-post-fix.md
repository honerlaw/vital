# Pattern: USDA's gateway intermittently 400s GET query strings with parenthesized values — POST a JSON body instead; verify intermittent bugs with repeated requests

- Type: pattern
- Date: 2026-06-24
- Work unit: 039-usda-search-post
- Supersedes: [[038-pattern-urlsearchparams-plus-space-gateway-400]] (the second wrong diagnosis —
  blamed `+`-vs-`%20` space encoding; the real cause is intermittent, not encoding)
- Related: [[036-pattern-food-tracking-foundation]] (the USDA `/api/me/food-search` proxy this fixes),
  [[035-pattern-server-llm-integration]] (same server-only key-discipline boundary;
  `USDA_API_KEY` is read from `process.env`, never `EXPO_PUBLIC_*`),
  [[040-pattern-usda-household-serving-portions]] (reads the `foodMeasures[]` field of this POST
  response's JSON into selectable serving portions)

## The bug
USDA FoodData Central's `api.data.gov` gateway (api-umbrella / ApacheTrafficServer fronting nginx —
see the `via:` and `x-nginx-intercept` response headers) **intermittently returns 400 Bad Request**,
~50% of the time, for a **GET** whose query string carries the parenthesized `dataType=Survey (FNDDS)`
value. The 400 is **not deterministic** and **not** an encoding problem: raw `(` and `%28` both flake,
and a lone `%20` space (`SR Legacy`, the `query=` field) is 200 every time. It is a load-balanced
flake — some gateway nodes reject the parenthesized query value, some accept it.

Each USDA 400 makes `searchUsdaFoods` throw → `GET /api/me/food-search` returns 502 → the client
renders "SEARCH UNAVAILABLE". So roughly **half** of all food searches failed from 032 until 039.

Reproduced live with the real `USDA_API_KEY` (Doppler `vital/dev`), the SAME identical URL repeated:

| Request form | Live result (repeated) |
|---|---|
| GET exact shipped URL ×8 | `200 200 200 400 400 200 400 400` (intermittent) |
| GET `dataType=Survey%20%28FNDDS%29` alone ×12 | `200 400 200 400 200 400 400 200 200 400 200 400` |
| GET `dataType=SR%20Legacy` alone ×12 | `200` ×12 (a lone space is fine) |
| GET 3× simple `dataType` (no parens) ×10 | `200` ×10 |
| **POST `/foods/search` JSON body ×15** | **`200` ×15**, body foods:25 |

## The fix
POST `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=<key>` (api_key stays in the query
string — that form is 200-reliable), `Content-Type: application/json`, body
`{ query, pageSize: 25, dataType: ["Foundation","SR Legacy","Survey (FNDDS)"] }`. Passing `dataType`
as a JSON array bypasses the query-string gateway path entirely. Verified live via the real
`searchUsdaFoods` 8/8 and via curl 15/15. See `src/server/usda-search.ts` (the GET-URL builder
`build-usda-search-url.ts` and its test were deleted — the URL-shape contract is moot under POST).

## Why two prior fixes failed (the load-bearing process lesson)
Three diagnoses, two wrong:
- **032 (#44):** blamed the comma-joined `dataType` (`%2C`) → repeated params. `%2C` is harmless.
- **038 (#47):** blamed `+`-vs-`%20` space encoding → manual `encodeURIComponent` builder. Spaces
  are harmless; the parens flake.
- **039 (this):** the 400 is **intermittent**, not request-shape — POST sidesteps it.

Both wrong fixes **verified with a single live request** and saw a (lucky) 200, declaring success
while production kept 400ing ~50% of the time. **For an intermittent failure, single-shot
verification is worse than none — it manufactures false confidence.** Repeat any live check of a
suspected flaky/gateway bug **N times** (≥8) and report the success *ratio*, not a single status.

## Scope / guard gap
`searchUsdaFoods` is the only live USDA caller. CI never hits the live USDA API (the long-standing
untested seam), so neither the bug nor the two bad fixes were caught automatically — and no unit
test *can* catch an intermittent gateway flake. The only real guard is a repeated live smoke check
run with the key (done by hand here); a key-gated, run-N-times live smoke test (outside normal CI)
would be the durable guard if this class of bug recurs.
