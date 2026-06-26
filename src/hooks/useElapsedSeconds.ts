import { useEffect, useState } from 'react';

/**
 * Live elapsed seconds since `startISO` (041), recomputed every second from the wall clock so the
 * count stays accurate across re-renders and brief JS stalls (unlike a self-incrementing counter).
 * A null start (no live session, e.g. during the screen's boot gate) yields 0 and schedules no
 * interval — the hook is still called unconditionally, so it stays above the screen's early
 * returns without breaking the rules of hooks. SSR-safe: a null start renders 0 on the server and
 * the client alike; the timer only ticks once a session is live (client-only interaction).
 */
export const useElapsedSeconds = (startISO: string | null): number => {
  const [elapsed, setElapsed] = useState(() => {
    if (startISO === null) return 0;
    const startMs = Date.parse(startISO);
    return Number.isFinite(startMs) ? Math.max(0, Math.floor((Date.now() - startMs) / 1000)) : 0;
  });
  useEffect(() => {
    if (startISO === null) return;
    const startMs = Date.parse(startISO);
    if (!Number.isFinite(startMs)) return;
    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      clearInterval(id);
    };
  }, [startISO]);
  return elapsed;
};
