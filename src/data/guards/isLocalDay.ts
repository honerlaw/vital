// A `YYYY-MM-DD` local-day string that is ALSO a real calendar date (032). The bare format regex
// accepts impossible dates (`2026-13-45`, `2026-02-30`) that Postgres then rejects with a cast
// error → a 500 where a 400 belongs; round-tripping through a local `Date` and comparing the
// fields back confirms the month/day are real. Shared by the POST-body guard and the GET route so
// both reject the same impossible days.
const LOCAL_DAY_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export function isLocalDay(value: unknown): value is string {
  if (typeof value !== 'string' || !LOCAL_DAY_FORMAT.test(value)) return false;
  const parts = value.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
