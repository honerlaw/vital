/**
 * Build the equipment photo-scan prompt (042). The system message pins the model to the CLOSED
 * canon: it embeds every allowed id (grouped by category for context) and demands a strict
 * `{ "items": string[] }` of ids drawn only from that list. Anything off-list is later dropped by
 * `parseScannedEquipment`, but constraining the prompt up front keeps the model on the rails. Each
 * line stays within the 100-column cap; the prompt is assembled from short single-quoted lines.
 */
import { EQUIPMENT_CATALOG } from '@/data/equipment-catalog';

const SYSTEM_LINES = [
  'You identify workout equipment visible in user-supplied photos of a gym or home setup.',
  'You are given a CLOSED LIST of equipment ids. Consider ONLY equipment clearly visible.',
  'Map each visible item to the SINGLE best-matching id from the list. Never invent an id.',
  'Return ONLY a JSON object: { "items": string[] }, every string an id from the list below.',
  'If nothing on the list is visible, return { "items": [] }. No prose, no code fences.',
];

export function equipmentScanPrompt(): { system: string; text: string } {
  const catalogLines = EQUIPMENT_CATALOG.map(
    (category) =>
      `${category.label}: ` + category.items.map((item) => `${item.id} (${item.label})`).join(', '),
  );
  const lines = [...SYSTEM_LINES, 'Allowed equipment ids, grouped by category:', ...catalogLines];
  return {
    system: lines.join('\n'),
    text: 'Identify the workout equipment visible in these photos and return the JSON object.',
  };
}
