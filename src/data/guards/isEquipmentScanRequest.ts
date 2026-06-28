import { type EquipmentScanRequest } from '@/data/equipment-types';

/**
 * Shape guard for the `POST /api/me/equipment/scan` body (042): `{ images: string[] }` where each
 * image is a non-empty base64 data-URL string. Count and total-size BOUNDS are enforced separately
 * in the route (server policy, not part of the wire shape). Narrowing here gives the route a typed
 * `string[]` so the per-image work stays cast-free.
 */
export function isEquipmentScanRequest(value: unknown): value is EquipmentScanRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'images' in value &&
    Array.isArray(value.images) &&
    value.images.length > 0 &&
    value.images.every((img) => typeof img === 'string' && img.startsWith('data:image/'))
  );
}
