import { type EquipmentProfile } from '@/data/equipment-types';

/**
 * Validates the `{ items: string[] }` shape returned by `GET /api/me/equipment` and the photo-scan
 * route (042). Read-LENIENT by design: it checks that `items` is an array of strings but does NOT
 * require each id to be canonical, so a future catalog revision can retire an id without bricking
 * an existing profile's hydration — the picker filters unknown ids out when it renders. The write
 * boundary (`isEquipmentUpdate`) is what enforces the closed canon.
 */
export function isEquipmentProfile(value: unknown): value is EquipmentProfile {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    Array.isArray(value.items) &&
    value.items.every((item) => typeof item === 'string')
  );
}
