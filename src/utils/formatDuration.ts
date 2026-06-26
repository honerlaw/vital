/**
 * Seconds → a compact stopwatch string (041): "m:ss" under an hour, "h:mm:ss" at/over an hour
 * (a workout can run past 60 minutes, where formatTime's plain "m:ss" would read "65:30").
 * Clamped at zero. Used by both the in-session elapsed timer and the history duration label.
 */
export const formatDuration = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const ss = String(secs).padStart(2, '0');
  if (hours > 0) {
    return `${String(hours)}:${String(mins).padStart(2, '0')}:${ss}`;
  }
  return `${String(mins)}:${ss}`;
};
