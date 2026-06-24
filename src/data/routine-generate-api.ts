/**
 * Client call to `POST /api/me/routine/generate` (030; streamed since 034) — turn the answered
 * spec into a draft program over SSE. Forwards structural `progress` / `retry` to the wizard and
 * resolves with the server-validated draft; `isProgram` is a light transport sanity check (the
 * server already validated + mapped). Throws on stream `error`, non-2xx, or a dropped connection.
 */
import { type GetSessionToken } from '@/auth/auth-headers';
import { isProgram } from '@/data/guards';
import { streamRoutine, type RoutineStreamOpts } from '@/data/stream-routine';
import { type IntakeSpec } from '@/data/routine-types';
import { type Program } from '@/data/types';

export async function generateRoutine(
  getToken: GetSessionToken,
  spec: IntakeSpec,
  opts: RoutineStreamOpts,
): Promise<Program> {
  return streamRoutine<Program>({
    path: '/api/me/routine/generate',
    getToken,
    body: JSON.stringify({ spec }),
    signal: opts.signal,
    isValid: isProgram,
    onProgress: opts.onProgress,
    onRetry: opts.onRetry,
  });
}
