/**
 * Client call to `POST /api/me/routine/refine` (030; streamed since 034) — regenerate the draft
 * from the same spec plus structured re-prompt knobs over SSE, forwarding `progress` / `retry` to
 * the wizard. `isProgram` is a light transport sanity check (server already validated + mapped).
 * Throws on stream `error`, non-2xx, or a dropped connection.
 */
import { type GetSessionToken } from '@/auth/auth-headers';
import { isProgram } from '@/data/guards';
import { streamRoutine, type RoutineStreamOpts } from '@/data/stream-routine';
import { type IntakeSpec, type RoutineKnob } from '@/data/routine-types';
import { type Program } from '@/data/types';

export async function refineRoutine(
  getToken: GetSessionToken,
  spec: IntakeSpec,
  knobs: RoutineKnob[],
  opts: RoutineStreamOpts,
): Promise<Program> {
  return streamRoutine<Program>({
    path: '/api/me/routine/refine',
    getToken,
    body: JSON.stringify({ spec, knobs }),
    signal: opts.signal,
    isValid: isProgram,
    onProgress: opts.onProgress,
    onRetry: opts.onRetry,
  });
}
