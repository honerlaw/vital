/**
 * Extract the JSON object from model output (030). Slices from the first `{` to the last `}` so
 * stray prose or ```json fences around the object are tolerated, then parses. Returns `unknown` —
 * the caller validates the shape through the matching guard (strict-writer, 028). Throws when no
 * object is present or the slice doesn't parse.
 */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object found in model output');
  }
  const parsed: unknown = JSON.parse(text.slice(start, end + 1));
  return parsed;
}
