/**
 * ISO-8601 week key ("YYYY-Www") for a date string (030) — used by `linearTarget` to count the
 * distinct training weeks of a `per-week` progression from history alone. Pure and deterministic
 * (the date comes from the input string, never the clock). Computed in UTC so a session's bucket
 * doesn't shift with the device timezone.
 */
export const isoWeekKey = (dateISO: string): string => {
  const d = new Date(dateISO);
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${String(date.getUTCFullYear())}-W${String(week).padStart(2, '0')}`;
};
