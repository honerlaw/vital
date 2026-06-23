/**
 * Build the USDA FoodData Central `/foods/search` GET URL (032 hotfix). `dataType` MUST be passed
 * as REPEATED params (`dataType=Foundation&dataType=SR Legacy&dataType=Survey (FNDDS)`), never a
 * single comma-joined value: `URLSearchParams` percent-encodes the joining commas to `%2C`, and
 * USDA's gateway rejects that comma-list form with a 400 (this 502'd the search route for every
 * query once a key was present — it was invisible to CI, which never hits the live API). Pure (no
 * fetch, no env read) so the request-URL contract is unit-testable, which the original inline
 * construction was not.
 */
const SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const DATA_TYPES = ['Foundation', 'SR Legacy', 'Survey (FNDDS)'];
const PAGE_SIZE = '25';

export function buildUsdaSearchUrl(apiKey: string, queryText: string): string {
  const params = new URLSearchParams({ api_key: apiKey, query: queryText, pageSize: PAGE_SIZE });
  for (const dataType of DATA_TYPES) {
    params.append('dataType', dataType);
  }
  return `${SEARCH_URL}?${params.toString()}`;
}
