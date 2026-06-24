/**
 * Streaming sibling of `callLlm` (034). Opens the OpenRouter Chat Completions call with
 * `stream: true` and yields the assistant text deltas as they arrive, so the SSE routes can scan
 * partial JSON for structural progress. The `signal` is threaded into the upstream `fetch` so a
 * client cancel/disconnect aborts the OpenRouter call itself (no orphaned, billed generation).
 *
 * OpenRouter speaks the OpenAI-compatible SSE wire format: `data: {choices:[{delta:{content}}]}`
 * lines terminated by `\n`, plus `:`-prefixed keep-alive comments and a final `data: [DONE]`. We
 * buffer across chunk boundaries, split on newlines, and narrow each delta cast-free (028) — an
 * unparseable keep-alive line is skipped, not fatal. Throws on a missing key or non-2xx, exactly
 * like `callLlm`, so the caller can fall back.
 */
import { LLM_MAX_TOKENS, LLM_MODEL } from '@/server/llm/model';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export async function* streamLlm(
  system: string,
  user: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const key: unknown = process.env.OPENROUTER_API_KEY;
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }
  const model = process.env.OPENROUTER_MODEL ?? LLM_MODEL;
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    signal,
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: LLM_MAX_TOKENS,
      stream: true,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok || res.body === null) {
    throw new Error(`OpenRouter request failed (${String(res.status)})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl = buffer.indexOf('\n');
    while (nl !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      nl = buffer.indexOf('\n');
      if (!line.startsWith('data:')) continue;
      const data = line.slice('data:'.length).trim();
      if (data === '[DONE]') return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue; // keep-alive / non-JSON line
      }
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'choices' in parsed &&
        Array.isArray(parsed.choices) &&
        parsed.choices.length > 0
      ) {
        const first: unknown = parsed.choices[0];
        if (
          typeof first === 'object' &&
          first !== null &&
          'delta' in first &&
          typeof first.delta === 'object' &&
          first.delta !== null &&
          'content' in first.delta &&
          typeof first.delta.content === 'string' &&
          first.delta.content.length > 0
        ) {
          yield first.delta.content;
        }
      }
    }
  }
}
