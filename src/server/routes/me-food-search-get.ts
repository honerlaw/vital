/**
 * Implementation of `GET /api/me/food-search?q=...` (032). Auth-enforced (kept under `/api/me/*`
 * so anonymous callers can't burn the shared USDA quota). The query is sanitized + length-capped
 * by `sanitizeFreeText` (the same data-boundary hygiene the LLM routes use); an empty query
 * returns `[]` without calling USDA. On any USDA failure — including a missing `USDA_API_KEY` —
 * `searchUsdaFoods` throws and this returns 502, the signal the client falls back on (manual entry
 * still works). One function per file; re-exported by `src/app/api/me/food-search+api.ts`.
 */
import { sanitizeFreeText } from '@/server/llm/sanitize-free-text';
import { requireAuth } from '@/server/requireAuth';
import { searchUsdaFoods } from '@/server/usda-search';

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const q = sanitizeFreeText(new URL(request.url).searchParams.get('q') ?? '');
  if (q.length === 0) {
    return Response.json([]);
  }
  try {
    const results = await searchUsdaFoods(q);
    return Response.json(results);
  } catch (error) {
    console.error('GET /api/me/food-search failed:', error);
    return Response.json({ error: 'Bad Gateway' }, { status: 502 });
  }
}
