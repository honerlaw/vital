# Proposal: food-tracking-foundation

**Date**: 2026-06-22
**Status**: Shipped (2026-06-22)

## Goal

Ship **Unit 1 (Foundation)** of food / calorie tracking in VITAL: a new **Nutrition tab**
(4th tab, before Settings) presenting the selected day's food diary as a flat chronological
list with running **calorie / protein / carbs / fat** totals, backed by a per-user
`food_log_entries` Postgres table, with two ways to add an entry — **USDA generic-food text
search** and **manual entry** — loaded as a **date-scoped fetch-on-mount** resource (NOT
boot-hydrated into the reducer). The diary supports prev/next day navigation; entries can be
added and deleted (no edit-in-place in v1).

This is the first of four planned units. The later additive units — **2: barcode (Open Food
Facts)**, **3: AI capture (LLM parse → map/estimate)**, **4: targets + in-vs-out dashboard** —
each get their own `minerva:propose` run and layer on top of this foundation.

## Why

VITAL tracks workouts but not nutrition. A prior `minerva:explore` session settled two things:
food tracking is wanted, and the cheapest best-fit data layer is **free live APIs** (USDA
FoodData Central + Open Food Facts) plus the **existing OpenRouter LLM** (work 031/035) — not a
paid nutrition API. Commercial APIs (Nutritionix / FatSecret / Edamam) were ruled out: they cost
money, their natural-language advantage is neutralized by the LLM the app already pays for, and
their ToS forbids the self-hosted / cached data model VITAL already uses (per-user Postgres,
knowledge 014/017).

The architecture the explore phase converged on is **LLM-as-parser, database-as-source-of-truth**:
the LLM only does entity extraction and the USDA/OFF lookup produces authoritative, deterministic
macros. Unit 1 is the **spine** that proves the data model, the new tab, and one real data source
(USDA) end-to-end, so the AI-capture and barcode on-ramps and the targets/dashboard all attach to
a working diary — mirroring how work 030 (AI routines) rode the existing program/history spine
rather than forking the model.

## Approach

### Data source (this unit)

USDA FoodData Central **live API**, generic data types only (Foundation / SR Legacy /
Survey-FNDDS). No bulk ingestion — the 1,000 req/hr signed-key ceiling is irrelevant at this
scale. Branded/packaged foods are explicitly **out of scope** here and deferred to Unit 2 (Open
Food Facts barcode), which keeps the v1 serving model uniform.

### Schema (node-pg-migrate; knowledge 009/010)

New `food_log_entries` table:

- `id uuid` primary key (server-minted, not client/LLM)
- `clerk_user_id text` — Clerk subject (shipped column name)
- `logged_on date` — the diary day, computed in the user's **local timezone** client-side
- `name text`
- `quantity numeric`
- `serving_label text` — e.g. `"1 cup (240 g)"`
- `calories numeric`, `protein_g numeric`, `carbs_g numeric`, `fat_g numeric` — **absolute for
  the logged quantity, snapshotted at log time** (self-contained like 028 history; re-fetching
  USDA later can never retroactively rewrite past totals)
- `source text` — `'usda' | 'manual'`
- `source_ref text null` — USDA `fdcId` when `source = 'usda'`
- `created_at timestamptz` — default `now()`, used as the in-day ordering key
- Index on `(clerk_user_id, logged_on)`

### Routes (one-function-per-file in `src/server/routes/`, re-exported by `src/app/api/**`)

All under the authenticated `/api/me/*` boundary (`requireAuth`, knowledge 011), cast-free
mappers (knowledge 014), strict-writer validation of all inputs (knowledge 028):

- `GET /api/me/food-log?date=YYYY-MM-DD` — entries for the user + day, ordered by `created_at`.
- `POST /api/me/food-log` — validate body cast-free, **server-mint** the uuid, **force**
  `user_id` from auth (never trust client), insert, return the row.
- `DELETE /api/me/food-log/[id]` — delete, ownership enforced on `user_id`.
- `GET /api/me/food-search?q=` — **server-side USDA proxy**. `USDA_API_KEY` is **server-only**
  env (Doppler locally, DO App Platform in prod; never `EXPO_PUBLIC_*`) per the 035 key
  discipline. Query sanitized + length-capped. Restricted to generic data types. Cast-free map
  to a slim result shape: `{ fdcId, name, perGramMacros, servingOptions: [{ label, gramWeight }] }`
  (plus an implicit `100 g` / enter-grams base when a food exposes no household portions).

### Client data layer

- New `food-log-api.ts` mirroring `programs-api.ts`, using the authed `apiFetch` helper
  (`src/auth/api-fetch.ts`).
- A minimal `useFoodLog(date)` hook (`useState` + `useEffect` refetch on date change) — the
  app's **first fetch-on-mount pattern** (there is no react-query/swr in the repo; per-user data
  is otherwise boot-hydrated). Add/delete call the route then refetch. Explicit loading / empty /
  error states (an inline status surface in the spirit of `CatalogStatus`).
- `logged_on` is computed in the user's **local timezone** client-side and sent as a date string;
  the server validates the format but trusts the client's local day.

### UI

- Register the Nutrition tab: a `TABS` entry in `AppTabs.ios.tsx` (SF Symbol `fork.knife`,
  Liquid Glass native bar, knowledge 031/025) + a `Tabs.Screen` in `AppTabs.tsx` (Android/web JS
  bar) + a new `(tabs)/nutrition.tsx` route. Order: **Today · Programs · History · Nutrition ·
  Settings** (Settings stays rightmost). Five tabs is within UITabBar's no-overflow limit.
- Tab screen: a date header with `‹` / `›` arrows (default today), a running totals row
  (cal / P / C / F), the flat chronological entry list (name, serving × qty, calories; with a
  delete affordance), and an Add affordance opening the USDA search sheet + the manual-entry form.
- Conformance: strict lint (001/003), one-function-per-file, native-stack headers for pushed
  screens (027), flush-bottom tab-bar inset (032).

### Explicitly deferred (later units / not this unit)

Branded/packaged foods, barcode scanning, AI text/photo capture, calorie/macro targets, the
in-vs-out dashboard, meal grouping, edit-in-place, and a calendar date picker.

### As shipped (deltas from the design)

The design above shipped intact; the durable shape is captured in
`.minerva/knowledge/036-pattern-food-tracking-foundation.md`. Two implementation realities and the
review-phase hardening are worth recording here:

- **pg numeric/date gotcha:** node-pg returns `numeric` as a STRING and `date` as a local-midnight
  `Date`, so the routes `SELECT … ::text` every uuid/date/numeric column and a `numericColumn`
  helper coerces the numerics in the mapper.
- **`useFoodLog` keeps a date-stamped snapshot and derives entries/status in render** (not a bare
  `entries` array): a snapshot counts only when its date matches the requested day, so a pending
  day-switch shows empty + loading rather than the previous day's data under the new day's header.
- **Review-phase hardening (triage panel 3/3):** `isLocalDay` validates a day for format AND
  real-calendar validity (impossible dates → 400, not a Postgres 500), used by the POST guard and
  the GET route; `quantity` and serving `grams` must be `> 0`; `name`/`servingLabel` are
  length-capped (200/100); and a failed add now shows an inline "couldn't save" message in both the
  search and manual panels (a failed delete stays a silent v1 choice — it reconciles on refocus).
- **Android/web tab icon is Feather `coffee`** (Feather has no utensil glyph); iOS uses the proper
  SF Symbol `fork.knife`.

## Success criteria

- A signed-in user can search USDA generic foods, pick a serving + quantity, and log it; it
  appears in today's diary with correct macros and the running totals update.
- A user can add a manual entry (name + the four macros) and it logs identically.
- A user can delete an entry; the totals update.
- The `‹` / `›` arrows show the correct day's entries (empty state when a day has none); the
  diary day resolves in the user's local timezone (an entry logged near local midnight lands on
  the correct local day, not the UTC day).
- Entries persist across app restart and are scoped to the authenticated user (another user
  never sees them).
- The USDA key is server-only; with the key absent the search route returns 502 and the UI
  degrades gracefully (manual entry still works).
- Boot time / the startup render-gate is unchanged (the food log is not boot-hydrated).
- `eslint . --max-warnings 0` passes and unit tests (route mappers / input guards) pass.

## Open Questions

None outstanding — all resolved during grill-plan (USDA scope narrowed to generic; add+delete
only; prev/next date arrows; tab placed 4th; local-timezone diary day; search route kept authed).
