/**
 * Client-side fetch of the authenticated user's equipment profile from `GET /api/me/equipment`
 * (042). The JSON body arrives typed `unknown` and is validated through `isEquipmentProfile` before
 * use — a malformed response throws so the caller flips `equipmentStatus` to 'error'. A user with
 * no saved equipment gets `{ items: [] }`.
 */
import { apiFetch } from '@/auth/api-fetch';
import { type EquipmentProfile } from '@/data/equipment-types';
import { isEquipmentProfile } from '@/data/guards';

type GetSessionToken = () => Promise<string | null>;

export async function fetchEquipment(getToken: GetSessionToken): Promise<EquipmentProfile> {
  const res = await apiFetch('/api/me/equipment', getToken);
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
  const body: unknown = await res.json();
  if (!isEquipmentProfile(body)) {
    throw new Error('Malformed /api/me/equipment response');
  }
  return body;
}
