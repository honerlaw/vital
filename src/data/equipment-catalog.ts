/**
 * Canonical workout-equipment vocabulary (042). The SINGLE source of truth for equipment ids,
 * shared by the client picker, the server PUT validator, and the photo-scan prompt — so a stored
 * profile, a routine-intake selection, and an LLM photo extraction all speak the same closed set
 * of ids. Strict canon: there is no free-text "other"; anything outside this list is rejected on
 * write and dropped from a scan. Pure data (no functions) so it imports cleanly on both client and
 * server; the membership guard lives in `@/data/guards/isCanonicalEquipmentId`.
 */

/** One canonical piece of equipment: a stable id (persisted) + a human label (shown / prompted). */
export interface EquipmentItem {
  id: string;
  label: string;
}

/** A display grouping of equipment for the picker UI. */
export interface EquipmentCategory {
  id: string;
  label: string;
  items: EquipmentItem[];
}

export const EQUIPMENT_CATALOG: EquipmentCategory[] = [
  {
    id: 'free-weights',
    label: 'Free weights',
    items: [
      { id: 'barbell', label: 'Barbell' },
      { id: 'dumbbells', label: 'Dumbbells' },
      { id: 'adjustable-dumbbells', label: 'Adjustable dumbbells' },
      { id: 'kettlebells', label: 'Kettlebells' },
      { id: 'weight-plates', label: 'Weight plates' },
      { id: 'ez-curl-bar', label: 'EZ curl bar' },
      { id: 'trap-bar', label: 'Trap (hex) bar' },
    ],
  },
  {
    id: 'racks-benches',
    label: 'Racks & benches',
    items: [
      { id: 'power-rack', label: 'Power rack / cage' },
      { id: 'squat-stand', label: 'Squat stand' },
      { id: 'flat-bench', label: 'Flat bench' },
      { id: 'adjustable-bench', label: 'Adjustable bench' },
      { id: 'pull-up-bar', label: 'Pull-up bar' },
      { id: 'dip-station', label: 'Dip station' },
    ],
  },
  {
    id: 'machines',
    label: 'Machines',
    items: [
      { id: 'smith-machine', label: 'Smith machine' },
      { id: 'leg-press', label: 'Leg press' },
      { id: 'hack-squat-machine', label: 'Hack squat machine' },
      { id: 'leg-extension', label: 'Leg extension' },
      { id: 'leg-curl', label: 'Leg curl' },
      { id: 'lat-pulldown', label: 'Lat pulldown' },
      { id: 'seated-row-machine', label: 'Seated row machine' },
      { id: 'chest-press-machine', label: 'Chest press machine' },
      { id: 'pec-deck', label: 'Pec deck' },
    ],
  },
  {
    id: 'cables',
    label: 'Cables',
    items: [
      { id: 'cable-machine', label: 'Cable machine' },
      { id: 'functional-trainer', label: 'Functional trainer' },
    ],
  },
  {
    id: 'cardio',
    label: 'Cardio',
    items: [
      { id: 'treadmill', label: 'Treadmill' },
      { id: 'stationary-bike', label: 'Stationary bike' },
      { id: 'rowing-machine', label: 'Rowing machine' },
      { id: 'elliptical', label: 'Elliptical' },
    ],
  },
  {
    id: 'bodyweight-accessories',
    label: 'Bodyweight & accessories',
    items: [
      { id: 'resistance-bands', label: 'Resistance bands' },
      { id: 'suspension-trainer', label: 'Suspension trainer (TRX)' },
      { id: 'gymnastic-rings', label: 'Gymnastic rings' },
      { id: 'ab-wheel', label: 'Ab wheel' },
      { id: 'plyo-box', label: 'Plyo box' },
      { id: 'jump-rope', label: 'Jump rope' },
    ],
  },
];

/** Flattened id → label lookup, for rendering a stored id and building the scan prompt. */
export const EQUIPMENT_LABELS: Record<string, string> = Object.fromEntries(
  EQUIPMENT_CATALOG.flatMap((category) =>
    category.items.map((item): [string, string] => [item.id, item.label]),
  ),
);

/** Every canonical id, for O(1) membership checks on the write / scan trust boundary. */
export const CANONICAL_EQUIPMENT_IDS: ReadonlySet<string> = new Set(Object.keys(EQUIPMENT_LABELS));
