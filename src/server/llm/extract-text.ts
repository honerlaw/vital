/**
 * Pull the assistant message text out of an OpenRouter / OpenAI-compatible Chat Completions
 * response (031). The body arrives typed `unknown`; narrows through `in`/`typeof` checks
 * (cast-free) and throws if no `choices[0].message.content` string is present, so a surprise shape
 * fails loudly rather than flowing on untyped.
 */
export function extractText(body: unknown): string {
  if (typeof body !== 'object' || body === null || !('choices' in body)) {
    throw new Error('LLM response has no choices');
  }
  const choices = body.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('LLM choices is empty or not an array');
  }
  const first: unknown = choices[0];
  if (
    typeof first === 'object' &&
    first !== null &&
    'message' in first &&
    typeof first.message === 'object' &&
    first.message !== null &&
    'content' in first.message &&
    typeof first.message.content === 'string'
  ) {
    return first.message.content;
  }
  throw new Error('LLM response has no message content');
}
