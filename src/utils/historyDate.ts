/** An ISO timestamp as an uppercase short date, e.g. "MAY 31". */
export const historyDate = (iso: string): string =>
  new Date(iso)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase();
