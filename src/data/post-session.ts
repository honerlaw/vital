/**
 * Best-effort write-through of a finished workout to `POST /api/me/sessions` (012). The server
 * appends the session row AND merges the finished program's cursor into the per-program map
 * atomically (one data-modifying-CTE statement; 015). `cursor` is the NEW value for
 * `cursors[programId]`; `activeProgramId` rides along solely to seed the settings row's
 * NOT NULL column when the user has no row yet. Throws on a non-2xx response; the caller
 * catches and console-warns.
 */
import { apiFetch } from '@/auth/api-fetch';
import { type SessionExerciseLog } from '@/data/types';

type GetSessionToken = () => Promise<string | null>;

export interface FinishedSessionBody {
  programId: string;
  programName: string;
  dayName: string;
  dateISO: string;
  cursor: number;
  activeProgramId: string;
  // Per-set log (022): present on every new-client finish (the wrapper spreads the
  // finishSession log, which always carries both); optional so the type matches the wire
  // contract, where pre-022 clients send neither.
  exercises?: SessionExerciseLog[];
  unit?: 'lb';
}

export async function postSession(
  getToken: GetSessionToken,
  body: FinishedSessionBody,
): Promise<void> {
  const res = await apiFetch('/api/me/sessions', getToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
}
