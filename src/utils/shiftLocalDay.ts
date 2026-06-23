/**
 * Shift a `YYYY-MM-DD` local-day string by a whole number of days (032), used by the diary's
 * prev/next arrows. Parses the calendar fields and rebuilds through a LOCAL `Date`, so month and
 * year roll over correctly and the result is re-emitted from local fields (no UTC drift).
 */
export const shiftLocalDay = (day: string, delta: number): string => {
  const parts = day.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const date = Number(parts[2]);
  const shifted = new Date(year, month - 1, date + delta);
  const mm = String(shifted.getMonth() + 1).padStart(2, '0');
  const dd = String(shifted.getDate()).padStart(2, '0');
  return `${String(shifted.getFullYear())}-${mm}-${dd}`;
};
