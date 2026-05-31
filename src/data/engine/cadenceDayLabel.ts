/**
 * Cadence label for the "up next" list. The real scheduling model is a product
 * decision (fixed calendar days vs. flexible "you're due"). For v1 this returns
 * a simple weekday spread derived from perWeek. Swap later.
 */
export const cadenceDayLabel = (perWeek: number, stepsAhead: number): string => {
  const gap = Math.ceil(7 / perWeek);
  const d = new Date();
  d.setDate(d.getDate() + stepsAhead * gap);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
};
