/**
 * Guard for the per-program cursor map (015): a plain object whose every value is a number,
 * keyed by program id. Shared by the client payload guard, the server row mapper, and the PUT
 * body validator — one implementation so the three trust boundaries can't drift. Rejects
 * non-number values so nothing reaches the `% days.length` arithmetic as NaN.
 */
export function isCursorMap(value: unknown): value is Record<string, number> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === 'number')
  );
}
