/**
 * Build the USDA FoodData Central `/foods/search` GET URL (032 search; 038 hotfix).
 *
 * Spaces MUST be encoded as `%20`, never `+`. `URLSearchParams.toString()` serializes a space as
 * `+` (form-urlencoding), which turns `Survey (FNDDS)` into `dataType=Survey+%28FNDDS%29` — and
 * USDA's nginx gateway rejects the `+%28` sequence with a 400 (verified live: `+%28` → 400,
 * `%20%28` → 200). That 400 made the search route 502 for every query once a key was present, and
 * it was invisible to CI, which never hits the live API. The 032 hotfix blamed the `%2C` comma
 * (harmless — USDA returns 200 for it) and kept the `+`-space encoding, so the bug survived.
 *
 * `dataType` is passed as REPEATED params. The query string is assembled by hand with
 * `encodeURIComponent` (which emits `%20` for spaces) rather than `URLSearchParams`. Pure (no
 * fetch, no env read) so the request-URL contract is unit-testable.
 */
const SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const DATA_TYPES = ['Foundation', 'SR Legacy', 'Survey (FNDDS)'];
const PAGE_SIZE = '25';

export function buildUsdaSearchUrl(apiKey: string, queryText: string): string {
  const params = [
    `api_key=${encodeURIComponent(apiKey)}`,
    `query=${encodeURIComponent(queryText)}`,
    `pageSize=${PAGE_SIZE}`,
    ...DATA_TYPES.map((dataType) => `dataType=${encodeURIComponent(dataType)}`),
  ];
  return `${SEARCH_URL}?${params.join('&')}`;
}
