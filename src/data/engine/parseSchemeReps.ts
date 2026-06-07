/**
 * Best-effort per-set rep target from a display scheme string (022) — used ONLY as a
 * non-authoritative UI prefill, never as coercion (that lives in `updateSet`) and never to
 * clamp a typed value (a "5+" set where the user did 15 records 15).
 *
 * The separator in the catalog is U+00D7 '×' (the multiplication sign), NOT ASCII 'x' — an
 * ASCII pattern would silently no-op the whole prefill. Shapes: "N×M" → M, "N×M+" → M (AMRAP
 * floor), "N×M-K" → M (range floor). Anything else ("5/3/1", "9 sets", …) → null (blank).
 */
export const parseSchemeReps = (scheme: string): number | null => {
  const match = /^\d+×(\d+)(?:-\d+)?\+?$/.exec(scheme);
  return match ? Number(match[1]) : null;
};
