/** Today's date as an uppercase eyebrow, e.g. "MONDAY, MAY 31". */
export const dateEyebrow = (d: Date): string =>
  d
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase();
