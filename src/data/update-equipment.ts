/**
 * Client call to `PUT /api/me/equipment` (042) — replace the saved equipment profile. The server
 * validates every id against the canon, de-dups, and returns the authoritative stored list, which
 * is validated through `isEquipmentProfile` before the caller converges on it. Throws on a non-2xx
 * response or a malformed body.
 */
import { apiFetch } from '@/auth/api-fetch';
import { type EquipmentProfile } from '@/data/equipment-types';
import { isEquipmentProfile } from '@/data/guards';

type GetSessionToken = () => Promise<string | null>;

export async function updateEquipment(
  getToken: GetSessionToken,
  items: string[],
): Promise<EquipmentProfile> {
  const res = await apiFetch('/api/me/equipment', getToken, {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
  const body: unknown = await res.json();
  if (!isEquipmentProfile(body)) {
    throw new Error('Malformed /api/me/equipment response');
  }
  return body;
}
