/**
 * Client call to `POST /api/me/equipment/scan` (042) — send one or more base64 data-URL images for
 * the server to pass through the multimodal LLM, returning the canonical equipment ids it
 * recognizes (images are never stored). The response `{ items }` is validated through
 * `isEquipmentProfile`; the caller merges the suggested ids into the editable selection. An
 * optional `signal` lets the screen cancel the scan. Throws on a non-2xx or malformed response.
 */
import { apiFetch } from '@/auth/api-fetch';
import { type EquipmentProfile } from '@/data/equipment-types';
import { isEquipmentProfile } from '@/data/guards';

type GetSessionToken = () => Promise<string | null>;

export async function scanEquipment(
  getToken: GetSessionToken,
  images: string[],
  signal?: AbortSignal,
): Promise<EquipmentProfile> {
  const res = await apiFetch('/api/me/equipment/scan', getToken, {
    method: 'POST',
    body: JSON.stringify({ images }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
  const body: unknown = await res.json();
  if (!isEquipmentProfile(body)) {
    throw new Error('Malformed /api/me/equipment/scan response');
  }
  return body;
}
