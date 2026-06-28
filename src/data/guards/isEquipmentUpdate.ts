import { type EquipmentProfile } from '@/data/equipment-types';
import { isCanonicalEquipmentId } from '@/data/guards/isCanonicalEquipmentId';

// Bound the array so a crafted PUT can't store an unbounded blob in the jsonb column (028). Far
// above the ~34-item canon, so a legitimate "everything selected" save always fits.
const MAX_ITEMS = 100;

/**
 * Strict-writer validator (028) for the `PUT /api/me/equipment` body (042). Stricter than
 * `isEquipmentProfile`: every id must be CANONICAL, so junk or a retired id can never be written
 * to the table. Length-bounded. Duplicates are tolerated here — the route de-dups before storing.
 */
export function isEquipmentUpdate(value: unknown): value is EquipmentProfile {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    Array.isArray(value.items) &&
    value.items.length <= MAX_ITEMS &&
    value.items.every(isCanonicalEquipmentId)
  );
}
