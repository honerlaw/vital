/**
 * Guard for the per-program cursor map (015): a plain object whose every value is a
 * NON-NEGATIVE INTEGER (cursors are day indices), keyed by program id. Shared by the client
 * payload guard, the server row mapper, and the PUT body validator — one implementation so the
 * three trust boundaries can't drift. `Number.isInteger` (not `typeof === 'number'`) is
 * load-bearing: it rejects NaN and floats, so nothing reaches the `% days.length` arithmetic
 * as NaN or a fractional index.
 */
export function isCursorMap(value: unknown): value is Record<string, number> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === 'number' && Number.isInteger(v) && v >= 0)
  );
}
