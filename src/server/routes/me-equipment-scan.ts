/**
 * Implementation of `POST /api/me/equipment/scan` (042). Auth-enforced; takes one or more base64
 * data-URL images, passes them THROUGH to the multimodal LLM, and returns the canonical equipment
 * ids it recognizes — the image bytes are never written to disk, DB, or logs (pure pass-through).
 *
 * Order of checks mirrors `routine-generate`: auth → body validation → bounds → daily cap, so a
 * 401/400/413/429 is a plain JSON Response before any model call. The body is `{ images }` (shape
 * via `isEquipmentScanRequest`); count and total payload size are bounded as a defensive guard
 * against an unbounded request (the client downscales to ~1024px first). Scans share the existing
 * per-user daily `llm_usage` cap with routine generation. The model output is parsed and FILTERED
 * to the canon by `parseScannedEquipment`. A model/transport failure is a 502 (client shows retry).
 */
import { isEquipmentScanRequest } from '@/data/guards';
import { type LlmContentBlock, callLlm } from '@/server/llm/call-llm';
import { equipmentScanPrompt } from '@/server/llm/equipment-scan-prompt';
import { parseScannedEquipment } from '@/server/llm/parse-scanned-equipment';
import { withinDailyLlmCap } from '@/server/rate-limit';
import { requireAuth } from '@/server/requireAuth';

const MAX_IMAGES = 6;
// Defensive ceiling on the total base64 payload (a handful of downscaled JPEGs). NOT a tight
// product cap — the client downscales to ~1024px — just a guard against an unbounded request body.
const MAX_TOTAL_CHARS = 8_000_000;

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isEquipmentScanRequest(body)) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { images } = body;
  if (images.length > MAX_IMAGES) {
    return Response.json({ error: 'Too many images' }, { status: 400 });
  }
  const totalChars = images.reduce((sum, img) => sum + img.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    return Response.json({ error: 'Payload too large' }, { status: 413 });
  }
  try {
    if (!(await withinDailyLlmCap(auth.userId))) {
      return Response.json({ error: 'Daily limit reached' }, { status: 429 });
    }
  } catch (error) {
    console.error('POST /api/me/equipment/scan cap check failed:', error);
    return Response.json({ error: 'Bad Gateway' }, { status: 502 });
  }
  const { system, text } = equipmentScanPrompt();
  const content: LlmContentBlock[] = [
    { type: 'text', text },
    ...images.map((url): LlmContentBlock => ({ type: 'image_url', image_url: { url } })),
  ];
  try {
    const raw = await callLlm(system, content, request.signal);
    return Response.json({ items: parseScannedEquipment(raw) });
  } catch (error) {
    console.error('POST /api/me/equipment/scan failed:', error);
    return Response.json({ error: 'Bad Gateway' }, { status: 502 });
  }
}
