/**
 * Single Anthropic Messages API call (030), server-only. The key is read from `process.env`
 * exactly as `db.ts` reads `DATABASE_URL` — it lives in the server env (Doppler / DO App Platform)
 * and is NEVER `EXPO_PUBLIC_*`, so it can't reach the client bundle / iOS binary. Called via the
 * platform `fetch` (no SDK dependency). Throws on a missing key or a non-2xx response; callers
 * (the routine routes) translate a throw into a 502 + the client's Retry/fallback path.
 */
import { CLAUDE_MAX_TOKENS, CLAUDE_MODEL } from '@/server/llm/model';
import { extractClaudeText } from '@/server/llm/extract-text';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';

export async function callClaude(system: string, user: string): Promise<string> {
  const key: unknown = process.env.ANTHROPIC_API_KEY;
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic request failed (${String(res.status)})`);
  }
  const body: unknown = await res.json();
  return extractClaudeText(body);
}
