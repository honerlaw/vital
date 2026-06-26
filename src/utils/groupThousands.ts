/**
 * Group an integer's digits with thousands commas, e.g. 12500 → "12,500" (041). A deterministic
 * string transform rather than `Number.toLocaleString` — the app renders numbers via plain
 * `String(Math.round(...))` (see FoodLogRow) and avoids `Intl.NumberFormat`, whose digit-grouping
 * support is inconsistent across the RN JS engine. Rounds and handles a sign defensively, though
 * the only caller (session volume) is always a non-negative integer.
 */
export const groupThousands = (n: number): string => {
  const sign = n < 0 ? '-' : '';
  const digits = String(Math.abs(Math.round(n)));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
