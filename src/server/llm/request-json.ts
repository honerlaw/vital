/**
 * Call the LLM and return the parsed JSON object (030, OpenRouter as of 031), with ONE retry. The
 * first failure (a truncated or fence-wrapped or chatty response that won't parse) re-asks with a
 * stricter instruction; a second failure propagates so the route 502s and the client falls back.
 * Returns `unknown` for the caller to validate through a guard.
 */
import { callLlm } from '@/server/llm/call-llm';
import { extractJson } from '@/server/llm/extract-json';

const RETRY_NUDGE = '\n\nReturn ONLY the JSON object — no prose, no markdown fences.';

export async function requestJson(system: string, user: string): Promise<unknown> {
  try {
    return extractJson(await callLlm(system, user));
  } catch {
    return extractJson(await callLlm(system, user + RETRY_NUDGE));
  }
}
