/**
 * Render a `YYYY-MM-DD` diary day as the header label (032): "TODAY" for the current local day,
 * otherwise an uppercase short weekday + month + day, e.g. "SAT JUN 21". `today` is passed in
 * (from `todayLocalDay`) rather than recomputed so the label and the diary share one notion of
 * "today". The date is built through a LOCAL `Date` from the calendar fields (no UTC drift).
 */
export const diaryDayLabel = (day: string, today: string): string => {
  if (day === today) return 'TODAY';
  const parts = day.split('-');
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return date
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();
};
