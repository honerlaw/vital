/**
 * VITAL — food / calorie tracking domain model (032).
 *
 * The diary is a per-user, date-scoped log of foods. Macros are stored ABSOLUTE for the logged
 * quantity and snapshotted at log time (so a later USDA change can't rewrite a past total — the
 * 028 self-containment idea applied to nutrition). `loggedOn` is a `YYYY-MM-DD` LOCAL day string,
 * never a timestamp, so the diary day is the user's local day. These types are type-only and run
 * on both client and server, narrowed at each trust boundary through `@/data/guards`.
 */

/** Where a logged entry's numbers came from: a USDA lookup or hand-typed by the user. */
export type FoodSource = 'usda' | 'manual';

/** The four tracked macros, as a day total or a single entry's contribution. */
export interface FoodMacros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** The POST body that creates a diary entry — everything except the server-minted id. */
export interface NewFoodLogEntry {
  loggedOn: string;
  name: string;
  quantity: number;
  servingLabel: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  source: FoodSource;
  sourceRef: string | null;
}

/** A persisted diary entry: a `NewFoodLogEntry` plus its server-minted uuid. */
export interface FoodLogEntry extends NewFoodLogEntry {
  id: string;
}

/** A selectable serving for a search result: a human label and its weight in grams. */
export interface FoodServingOption {
  label: string;
  grams: number;
}

/**
 * A slim USDA search hit. Macros are per 100 g (USDA's native basis for generic foods); the
 * client multiplies by the chosen grams to get the absolute numbers it logs. `servingOptions`
 * always carries at least a `100 g` base so there is a uniform unit even when USDA exposes no
 * household portion.
 */
export interface FoodSearchResult {
  fdcId: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingOptions: FoodServingOption[];
}
