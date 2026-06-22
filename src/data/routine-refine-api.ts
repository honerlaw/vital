/**
 * Client call to `POST /api/me/routine/refine` (030) — regenerate the draft from the same spec
 * plus structured re-prompt knobs. Validated through `isProgram`; throws on failure.
 */
import { apiFetch } from '@/auth/api-fetch';
import { isProgram } from '@/data/guards';
import { type IntakeSpec, type RoutineKnob } from '@/data/routine-types';
import { type Program } from '@/data/types';

type GetSessionToken = () => Promise<string | null>;

export async function refineRoutine(
  getToken: GetSessionToken,
  spec: IntakeSpec,
  knobs: RoutineKnob[],
): Promise<Program> {
  const res = await apiFetch('/api/me/routine/refine', getToken, {
    method: 'POST',
    body: JSON.stringify({ spec, knobs }),
  });
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
  const body: unknown = await res.json();
  if (!isProgram(body)) {
    throw new Error('Malformed /api/me/routine/refine response');
  }
  return body;
}
