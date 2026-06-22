/**
 * Client call to `POST /api/me/routine/generate` (030) — turn the answered spec into a draft
 * program. The response is validated through `isProgram`; throws on failure (caller shows Retry).
 */
import { apiFetch } from '@/auth/api-fetch';
import { isProgram } from '@/data/guards';
import { type IntakeSpec } from '@/data/routine-types';
import { type Program } from '@/data/types';

type GetSessionToken = () => Promise<string | null>;

export async function generateRoutine(
  getToken: GetSessionToken,
  spec: IntakeSpec,
): Promise<Program> {
  const res = await apiFetch('/api/me/routine/generate', getToken, {
    method: 'POST',
    body: JSON.stringify({ spec }),
  });
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
  const body: unknown = await res.json();
  if (!isProgram(body)) {
    throw new Error('Malformed /api/me/routine/generate response');
  }
  return body;
}
