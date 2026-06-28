import { type EquipmentProfile } from '@/data/equipment-types';
import { type UnknownRow } from '@/server/db';

/**
 * Map a `user_equipment` row to an `EquipmentProfile` (042). The `items` jsonb column is returned
 * already parsed by node-pg; this narrows it cast-free to a `string[]` (a non-array, or non-string
 * element, throws — surfacing a corrupt row as a 500 rather than flowing on untyped). Canon
 * membership is NOT re-checked here: reads stay lenient so a retired id doesn't break hydration;
 * the write path (`isEquipmentUpdate`) is what enforces the closed set.
 */
export function rowToEquipmentProfile(row: UnknownRow): EquipmentProfile {
  const items = row['items'];
  if (!Array.isArray(items)) {
    throw new Error('user_equipment.items is not an array');
  }
  const out: string[] = [];
  for (const item of items) {
    if (typeof item !== 'string') {
      throw new Error('user_equipment.items contains a non-string');
    }
    out.push(item);
  }
  return { items: out };
}
