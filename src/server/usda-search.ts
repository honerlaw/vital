/**
 * Server-side USDA FoodData Central search proxy (032). Reached only from the
 * `GET /api/me/food-search` route handler, the same server boundary as pg access (014) and the
 * LLM client (035). `USDA_API_KEY` is read from `process.env` and is SERVER-ONLY — never
 * `EXPO_PUBLIC_*`, which would bake it into the client bundle (035 key discipline). A missing key
 * or a non-OK USDA response throws, so the route returns 502 and the UI degrades (manual entry
 * still works).
 *
 * Scope is GENERIC foods only — Foundation / SR Legacy / Survey (FNDDS) — so the per-100 g macro
 * basis is uniform and results stay clean; branded/packaged foods are deferred to the Open Food
 * Facts barcode unit. Each hit is reduced to a slim `FoodSearchResult`: per-100 g macros plus a
 * `servingOptions` list built by `buildServingOptions` (040), which reads USDA's household measures
 * (`foodMeasures[]` — "1 cup (8 fl oz)", "1 fl oz", "1 small/medium/large") so a beverage isn't
 * stuck at "100 g"; it always still carries a `100 g` base. The client multiplies by the chosen
 * grams to get the absolute numbers it logs.
 *
 * Transport is POST with a JSON body (039), NOT GET with a query string. USDA's `api.data.gov`
 * gateway (api-umbrella / ApacheTrafficServer fronting nginx) intermittently returns 400 — ~50%
 * of the time — for a GET whose query string carries the parenthesized `dataType=Survey (FNDDS)`
 * value, in any encoding (raw `(` and `%28` both flake; a lone `%20` space is fine). That 502'd
 * half of all searches since 032; two prior URL-encoding fixes (#44, #47) missed it because they
 * verified with single-shot live requests that got a lucky 200. POSTing `dataType` as a JSON
 * array bypasses the query-string path entirely (verified live 15/15 → 200). `api_key` stays in
 * the query string (the form the live test used). The bug is invisible to CI — it never hits the
 * live USDA API.
 */
import { type FoodSearchResult } from '@/data/food-types';
import { buildServingOptions } from '@/server/usda-serving-options';
import { usdaNutrientValue } from '@/server/usda-nutrient-value';

const SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const DATA_TYPES = ['Foundation', 'SR Legacy', 'Survey (FNDDS)'];
const PAGE_SIZE = 25;

export async function searchUsdaFoods(queryText: string): Promise<FoodSearchResult[]> {
  const apiKey: unknown = process.env.USDA_API_KEY;
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    throw new Error('USDA_API_KEY is not set');
  }

  const res = await fetch(`${SEARCH_URL}?api_key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: queryText, pageSize: PAGE_SIZE, dataType: DATA_TYPES }),
  });
  if (!res.ok) {
    throw new Error(`USDA search failed (${String(res.status)})`);
  }

  const body: unknown = await res.json();
  if (typeof body !== 'object' || body === null || !('foods' in body)) return [];
  if (!Array.isArray(body.foods)) return [];
  // `Array.isArray` narrows to `any[]`; re-typing as `unknown[]` (a safe assignment, no cast)
  // keeps each hit `unknown` so member access stays guarded, not `any`.
  const foods: unknown[] = body.foods;

  const results: FoodSearchResult[] = [];
  for (const food of foods) {
    if (typeof food !== 'object' || food === null) continue;

    const description = 'description' in food ? food.description : undefined;
    if (typeof description !== 'string' || description.length === 0) continue;

    const rawId = 'fdcId' in food ? food.fdcId : undefined;
    const fdcId =
      typeof rawId === 'number' ? String(rawId) : typeof rawId === 'string' ? rawId : '';
    if (fdcId.length === 0) continue;

    const nutrients = 'foodNutrients' in food ? food.foodNutrients : undefined;

    results.push({
      fdcId,
      name: description,
      caloriesPer100g: usdaNutrientValue(nutrients, '208'),
      proteinPer100g: usdaNutrientValue(nutrients, '203'),
      carbsPer100g: usdaNutrientValue(nutrients, '205'),
      fatPer100g: usdaNutrientValue(nutrients, '204'),
      servingOptions: buildServingOptions(food),
    });
  }
  return results;
}
