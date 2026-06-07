/**
 * Deterministic avatar background for a seed string — the user's email when present, else
 * the Clerk user id (023). Hash → hue; saturation/lightness are PINNED (55% / 29%) so white
 * text clears WCAG AA (≥ 4.5:1) on every hue — the worst hue (~60, yellow) passes with
 * margin (4.75:1 at L=30%, more at 29%; verified by the unit test's sweep). Helpers stay
 * inside the function body per the `single-declaration` rule.
 */
export const avatarColor = (seed: string): string => {
  // Plain-arithmetic hash (no bitwise): hash stays < 1e9, so 31*hash + charCode is exact.
  let hash = 7;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000000007;
  }
  const h = hash % 360;
  const s = 0.55;
  const l = 0.29;
  // HSL → RGB (https://www.w3.org/TR/css-color-3/#hsl-color), then hex.
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const m = l - c / 2;
  const toHex = (channel: number): string =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
