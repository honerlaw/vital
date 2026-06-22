/**
 * Pull the first text block out of an Anthropic Messages API response (030). The body arrives
 * typed `unknown`; this narrows through `in`/`typeof` checks (cast-free) and throws if no text
 * block is present, so a surprise response shape fails loudly rather than flowing on untyped.
 */
export function extractClaudeText(body: unknown): string {
  if (typeof body !== 'object' || body === null || !('content' in body)) {
    throw new Error('Anthropic response has no content');
  }
  const content = body.content;
  if (!Array.isArray(content)) throw new Error('Anthropic content is not an array');
  // Re-type to unknown[] so each block narrows cast-free (Array.isArray widens to any[]).
  const blocks: unknown[] = content;
  for (const block of blocks) {
    if (
      typeof block === 'object' &&
      block !== null &&
      'type' in block &&
      block.type === 'text' &&
      'text' in block &&
      typeof block.text === 'string'
    ) {
      return block.text;
    }
  }
  throw new Error('Anthropic response has no text block');
}
