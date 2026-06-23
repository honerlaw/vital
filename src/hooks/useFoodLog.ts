import { useAuth } from '@clerk/expo';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { type FoodLogEntry } from '@/data/food-types';
import { fetchFoodLog } from '@/data/fetch-food-log';

export type FoodLogStatus = 'loading' | 'ready' | 'error';

export interface FoodLogState {
  entries: FoodLogEntry[];
  status: FoodLogStatus;
  reload: () => void;
}

/** The latest resolved load, stamped with the day it belongs to. */
interface FoodLogSnapshot {
  date: string;
  entries: FoodLogEntry[];
  status: 'ready' | 'error';
}

/**
 * Date-scoped food diary for one local day (032) — the app's first fetch-on-mount resource (no
 * react-query in the repo; per-user state is otherwise boot-hydrated). The fetch is driven SOLELY
 * by `useFocusEffect`, so it runs once on mount-focus, again whenever `date` changes (the memoized
 * `load` — and thus the focus effect — re-subscribes on a new date), and again when the screen
 * regains focus after the add-food route closes. No separate mount effect → no double fetch.
 *
 * State is a single date-STAMPED snapshot, written only inside the async resolution (never
 * synchronously in the effect body — 004 deferred-setState rule). The returned entries/status are
 * DERIVED in render: a snapshot counts only when its date matches the requested day, so a pending
 * date change shows empty + 'loading' rather than the PREVIOUS day's data under the new day's
 * header. On a same-day refetch the matching snapshot stays visible (no loading flash).
 */
export const useFoodLog = (date: string): FoodLogState => {
  const { getToken } = useAuth();
  const [snapshot, setSnapshot] = useState<FoodLogSnapshot | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    fetchFoodLog(getToken, date)
      .then((rows) => {
        if (!cancelled) setSnapshot({ date, entries: rows, status: 'ready' });
      })
      .catch(() => {
        if (!cancelled) setSnapshot({ date, entries: [], status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [getToken, date]);

  useFocusEffect(load);

  const reload = useCallback(() => {
    load();
  }, [load]);

  const fresh = snapshot !== null && snapshot.date === date;
  const entries = fresh ? snapshot.entries : [];
  const status: FoodLogStatus = fresh ? snapshot.status : 'loading';
  return { entries, status, reload };
};
