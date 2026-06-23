/**
 * Today's date as a `YYYY-MM-DD` string in the device's LOCAL timezone (032). Built from the local
 * calendar fields (never `toISOString`, which would shift to UTC and roll the day near midnight),
 * so the diary's "today" is the user's local day. This is the diary day sent to the API.
 */
export const todayLocalDay = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${String(now.getFullYear())}-${month}-${day}`;
};
