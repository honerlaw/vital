import { isCanonicalEquipmentId } from '@/data/guards';
import { extractJson } from '@/server/llm/extract-json';

/**
 * Parse the photo-scan model output into a deduped list of CANONICAL equipment ids (042). The model
 * is asked for `{ "items": string[] }`; this slices the JSON object out (tolerating fences / prose
 * via `extractJson`), then keeps only ids that pass `isCanonicalEquipmentId` — so a hallucinated or
 * off-list id is silently dropped rather than trusted. Order-preserving dedup. A malformed-but-
 * present object degrades to `[]`; only a complete absence of any JSON object throws (the caller
 * turns that into a 502).
 */
export function parseScannedEquipment(raw: string): string[] {
  const parsed = extractJson(raw);
  if (typeof parsed !== 'object' || parsed === null || !('items' in parsed)) {
    return [];
  }
  const items = parsed.items;
  if (!Array.isArray(items)) {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (isCanonicalEquipmentId(item) && !seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}
