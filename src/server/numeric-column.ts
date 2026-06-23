/**
 * Coerce a Postgres `numeric` column to a finite JS number (032). node-pg returns `numeric` as a
 * STRING (to avoid float precision loss), so the food-log row mapper can't read these columns as
 * numbers directly. This narrows the `unknown` value (string or number) and throws a labelled
 * error on anything non-finite, so a malformed row fails the route rather than serving NaN into a
 * running total.
 */
export function numericColumn(value: unknown, label: string): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) {
    throw new Error(`food_log_entries.${label} is not numeric`);
  }
  return n;
}
