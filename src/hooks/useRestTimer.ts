import { useCallback, useEffect, useState } from 'react';

export interface RestTimer {
  visible: boolean;
  seconds: number;
  start: (s: number) => void;
  skip: () => void;
}

/**
 * Local rest-timer state. Owns its own countdown via a self-scheduling effect:
 * each tick is a deferred setTimeout (state updates happen in the async callback,
 * never synchronously in the effect body). Auto-hides at zero. Lives in the
 * Workout screen, deliberately NOT in the global reducer.
 */
export const useRestTimer = (defaultSeconds: number): RestTimer => {
  const [visible, setVisible] = useState(false);
  const [seconds, setSeconds] = useState(defaultSeconds);

  useEffect(() => {
    if (!visible || seconds <= 0) return;
    const id = setTimeout(() => {
      if (seconds <= 1) {
        setSeconds(0);
        setVisible(false);
      } else {
        setSeconds(seconds - 1);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [visible, seconds]);

  const start = useCallback((s: number) => {
    setSeconds(s);
    setVisible(true);
  }, []);

  const skip = useCallback(() => setVisible(false), []);

  return { visible, seconds, start, skip };
};
