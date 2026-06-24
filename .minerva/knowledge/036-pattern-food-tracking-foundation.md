# Pattern: food-tracking foundation — date-scoped fetch-on-mount diary, USDA proxy, snapshotted macros

- Type: pattern
- Date: 2026-06-22
- Work unit: 032-food-tracking-foundation
- Related: [[014-pattern-server-pg-access-expo-routes]] (the lazy-pool / unknown-row / cast-free-mapper
  shape the food routes reuse), [[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]]
  (`requireAuth` gates every `/api/me/food-*` route), [[035-pattern-server-llm-integration]]
  (the server-only-key discipline the USDA proxy copies; the LLM that the planned AI-capture unit
  reuses), [[028-pattern-per-set-log-tracking]] (strict-writer validation + self-contained rows —
  applied here to snapshotted macros), [[017-pattern-per-user-state-persistence]] (the reducer /
  boot-hydration model the food diary deliberately does NOT use), [[004-pattern-expo56-react-compiler-hook-rules]]
  (deferred-setState — the hook updates state only in the async resolution),
  [[031-pattern-ios-native-tabs-liquid-glass]] (registering the new Nutrition tab on both bars),
  [[005-decision-vital-state-and-nav-boundaries]] (the add-food flow is a top-level route, not a tab),
  [[039-pattern-usda-gateway-intermittent-400-post-fix]] (the real search-proxy 400 fix — POST a JSON
  body; the USDA gateway intermittently 400s parenthesized GET query values),
  [[038-pattern-urlsearchparams-plus-space-gateway-400]] (⚠ superseded — the second wrong diagnosis
  of that same 400)

How VITAL added food / calorie tracking (032) as a new Nutrition tab. This is **Unit 1 of 4** — a
foundation that later additive units build on: 2 = barcode (Open Food Facts), 3 = AI capture
(LLM parse → map/estimate), 4 = calorie/macro targets + an in-vs-out dashboard.

## The diary is a date-scoped fetch-on-mount resource — the app's first one

Every other per-user resource (active program, cursors, history) is boot-hydrated into the reducer
behind the render-gate ([[017-pattern-per-user-state-persistence]]). A food diary is many-entries-
per-day-forever — a different volume profile — so it is the first resource fetched **on mount**
instead. `useFoodLog(date)` (`src/hooks/useFoodLog.ts`) holds a single **date-stamped snapshot**
(`{ date, entries, status }`), written only inside the async resolution (never synchronously in the
effect body — the [[004-pattern-expo56-react-compiler-hook-rules]] deferred-setState rule). The
fetch is driven SOLELY by `useFocusEffect(load)` where `load` is memoized on `[getToken, date]`:
one fetch on mount-focus, a re-fetch when `date` changes (a new `load` re-subscribes the focus
effect), and a re-fetch when the screen regains focus after the add-food route closes — no separate
mount effect, so no double fetch. The returned `entries`/`status` are **derived in render**: a
snapshot counts only when `snapshot.date === date`, so a pending day-switch shows empty + `loading`
rather than the PREVIOUS day's entries and totals under the new day's header (the load-bearing fix —
"no loading flash" holds for a same-day refocus, NOT for a date change). Nothing food-related
touches `StateProvider` / `boot-status`, so boot is unchanged.

## Schema: per-user, local-day, macros snapshotted absolute at log time

`food_log_entries` (one additive migration) is keyed by `clerk_user_id` (soft reference, no FK —
the same no-FK-to-the-catalog rationale as the per-user state,
[[017-pattern-per-user-state-persistence]]). `logged_on` is a **`YYYY-MM-DD` LOCAL day** computed
client-side from local
calendar fields (`todayLocalDay` / `shiftLocalDay`, never `toISOString`), so an entry logged near
local midnight lands on the correct local day, not the UTC day. The four macros are stored
**absolute for the logged quantity and snapshotted at log time** — re-fetching USDA later can never
rewrite a past total (the [[028-pattern-per-set-log-tracking]] self-containment idea applied to
nutrition). `source` is `usda | manual`; `source_ref` holds the USDA `fdcId` (null for manual).
Index on `(clerk_user_id, logged_on)`.

**pg numeric/date gotcha:** node-pg returns `numeric` columns as STRINGS and `date` as a
local-midnight `Date`. The routes `SELECT … ::text` every uuid/date/numeric column and the mapper
coerces the numerics through `numericColumn` (string|number → finite number, else throw). This is
why `logged_on::text` is load-bearing — it yields the `YYYY-MM-DD` string directly and dodges a
server-TZ `Date`.

## Routes: authed, server-only USDA key, generic foods only, graceful degradation

`GET/POST/DELETE /api/me/food-log` + `GET /api/me/food-search` are all under `requireAuth`
([[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]]); POST **forces** `clerk_user_id`
from auth (never the body) and the DB mints the uuid; DELETE scopes by `id::text = $1 AND
clerk_user_id = $2`. The search route proxies **USDA FoodData Central** with a server-only
`USDA_API_KEY` (read from `process.env`, never `EXPO_PUBLIC_*` — the [[035-pattern-server-llm-integration]]
key discipline); an absent key or any USDA failure throws → the route returns **502** and the UI
falls back (manual entry is independent and still works). Search is restricted to **generic data
types** (Foundation / SR Legacy / Survey-FNDDS) so the per-100 g macro basis is uniform; each hit
is reduced to per-100 g macros + a `servingOptions` list (always a `100 g` base, plus the food's
own gram serving when USDA returns one). Branded/packaged foods are deferred to the barcode unit.
The client multiplies per-100 g × chosen grams to get the absolute macros it snapshots.

## Strict-writer guards at the boundary (028) — tightened in review

Every trust boundary (POST body, pg row, parsed search response) narrows from `unknown` through
cast-free guards. Review hardened three invariants worth keeping: `isLocalDay` validates a day
string for **format AND real-calendar validity** (round-trips through a local `Date`), so an
impossible date like `2026-13-45` is a 400 rather than a Postgres cast error (500) — used by both
the POST guard and the GET route; `quantity` and serving `grams` must be **`> 0`** (a zero serving
is meaningless, though macros may legitimately be 0, so `isMacroNumber` keeps `>= 0`); and `name` /
`servingLabel` are length-capped (200 / 100) so a crafted body can't store an unbounded blob.

## Data-source decision (recap from the explore/propose phase)

Free **USDA + Open Food Facts live APIs** + the existing OpenRouter LLM were chosen over commercial
nutrition APIs (Nutritionix / FatSecret / Edamam): the commercial ToS forbid the self-hosted /
cached per-user data model VITAL already uses, their natural-language advantage is neutralized by
the LLM the app already pays for, and they cost money. No bulk ingestion in v1 — the live-API
rate ceilings are irrelevant at this scale; self-hosting the dumps is a deferred optimization. The
planned AI-capture unit uses **LLM-as-parser, database-as-source-of-truth**: the LLM only does
entity extraction and the USDA/OFF lookup produces the authoritative, deterministic macros.
