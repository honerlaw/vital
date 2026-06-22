/**
 * Call Claude and return the parsed JSON object (030), with ONE retry. The first failure (a
 * truncated or fence-wrapped or chatty response that won't parse) re-asks with a stricter
 * instruction; a second failure propagates so the route 502s and the client falls back. Returns
 * `unknown` for the caller to validate through a guard.
 */
import { callClaude } from '@/server/llm/call-claude';
import { extractJson } from '@/server/llm/extract-json';

const RETRY_NUDGE = '\n\nReturn ONLY the JSON object — no prose, no markdown fences.';

export async function requestJson(system: string, user: string): Promise<unknown> {
  try {
    return extractJson(await callClaude(system, user));
  } catch {
    return extractJson(await callClaude(system, user + RETRY_NUDGE));
  }
}
