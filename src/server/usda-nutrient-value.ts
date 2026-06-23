/**
 * Extract one nutrient's per-100 g value from a USDA `foodNutrients` array (032). The array is
 * `unknown` (a parsed third-party JSON body), so every element is narrowed before use; a missing
 * or non-finite value yields 0 rather than throwing — a generic food that omits a macro is normal,
 * not an error. USDA identifies nutrients by `nutrientNumber` ('208' energy kcal, '203' protein,
 * '204' fat, '205' carbohydrate); it is usually a string but is matched tolerantly against a
 * numeric form too.
 */
export function usdaNutrientValue(foodNutrients: unknown, nutrientNumber: string): number {
  if (!Array.isArray(foodNutrients)) return 0;
  // `Array.isArray` narrows `unknown` to `any[]`; re-typing as `unknown[]` (a safe assignment,
  // no cast) keeps each element `unknown` so member access stays guarded, not `any`.
  const entries: unknown[] = foodNutrients;
  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) continue;
    if (!('nutrientNumber' in entry)) continue;
    const num: unknown = entry.nutrientNumber;
    const matches =
      (typeof num === 'string' && num === nutrientNumber) ||
      (typeof num === 'number' && String(num) === nutrientNumber);
    if (!matches) continue;
    if (!('value' in entry)) return 0;
    const value: unknown = entry.value;
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
    return 0;
  }
  return 0;
}
