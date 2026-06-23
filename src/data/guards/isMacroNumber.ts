/**
 * A finite, non-negative number — the shape every macro / gram / quantity value must have before
 * it reaches the diary or the totals math (032). `Number.isFinite` rejects NaN/Infinity (so a
 * malformed USDA value or a junk POST body can't poison a running total), and `>= 0` rejects
 * negatives. Shared by the food guards so the three trust boundaries (POST body, DB row mapper,
 * client response) validate macros identically.
 */
export function isMacroNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
