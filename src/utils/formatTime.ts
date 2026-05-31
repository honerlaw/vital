/** Seconds → "m:ss" (clamped at zero). */
export const formatTime = (totalSeconds: number): string => {
  const s = Math.max(0, totalSeconds);
  const mins = Math.floor(s / 60);
  const secs = String(s % 60).padStart(2, '0');
  return `${mins}:${secs}`;
};
