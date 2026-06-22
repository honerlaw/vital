/**
 * Client call to `POST /api/me/programs` (030) — persist a generated draft (with the intake spec
 * that made it). Returns the DB-authoritative saved program (server-minted id), validated through
 * `isProgram`; the caller dispatches ADD_USER_PROGRAM with it.
 */
import { apiFetch } from '@/auth/api-fetch';
import { isProgram } from '@/data/guards';
import { type IntakeSpec } from '@/data/routine-types';
import { type Program } from '@/data/types';

type GetSessionToken = () => Promise<string | null>;

export async function saveUserProgram(
  getToken: GetSessionToken,
  program: Program,
  spec: IntakeSpec,
): Promise<Program> {
  const res = await apiFetch('/api/me/programs', getToken, {
    method: 'POST',
    body: JSON.stringify({ program, spec }),
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
