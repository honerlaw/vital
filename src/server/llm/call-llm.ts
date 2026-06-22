/**
 * Single OpenRouter Chat Completions call (031), server-only. OpenRouter fronts every major model
 * provider behind one OpenAI-compatible endpoint, so the model is just a string (`LLM_MODEL`, or
 * the `OPENROUTER_MODEL` env override) — switch models without touching transport code. The key is
 * read from `process.env` exactly as `db.ts` reads `DATABASE_URL` — it lives in the server env
 * (Doppler / DO App Platform) and is NEVER `EXPO_PUBLIC_*`, so it can't reach the client bundle /
 * iOS binary. Called via the platform `fetch` (no SDK dependency). Throws on a missing key or a
 * non-2xx response; callers (the routine routes) translate a throw into a 502 + the client's
 * Retry/fallback path.
 */
import { LLM_MAX_TOKENS, LLM_MODEL } from '@/server/llm/model';
import { extractText } from '@/server/llm/extract-text';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export async function callLlm(system: string, user: string): Promise<string> {
  const key: unknown = process.env.OPENROUTER_API_KEY;
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }
  const model = process.env.OPENROUTER_MODEL ?? LLM_MODEL;
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: LLM_MAX_TOKENS,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenRouter request failed (${String(res.status)})`);
  }
  const body: unknown = await res.json();
  return extractText(body);
}
