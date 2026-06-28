import { CANONICAL_EQUIPMENT_IDS } from '@/data/equipment-catalog';

/**
 * True when `value` is one of the canonical equipment ids (042). The membership gate for the
 * strict closed vocabulary: the PUT route rejects any non-canonical id, the photo-scan drops
 * unmappable ones, and the picker only ever offers ids that pass this.
 */
export function isCanonicalEquipmentId(value: unknown): value is string {
  return typeof value === 'string' && CANONICAL_EQUIPMENT_IDS.has(value);
}
