/**
 * Client call to `POST /api/me/programs` (030) — persist a generated draft (with the intake spec
 * that made it). Returns the DB-authoritative saved program (server-minted id), validated through
 * `isProgram`; the caller dispatches ADD_USER_PROGRAM with it.
 */
import { apiFetch } from '@/auth/api-fetch';
import { type GetSessionToken } from '@/auth/auth-headers';
import { isProgram } from '@/data/guards';
import { type IntakeSpec } from '@/data/routine-types';
import { type Program } from '@/data/types';

export async function saveUserProgram(
  getToken: GetSessionToken,
  program: Program,
  spec: IntakeSpec,
  signal?: AbortSignal,
): Promise<Program> {
  const res = await apiFetch('/api/me/programs', getToken, {
    method: 'POST',
    body: JSON.stringify({ program, spec }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
  const body: unknown = await res.json();
  if (!isProgram(body)) {
    throw new Error('Malformed /api/me/programs response');
  }
  return body;
}
