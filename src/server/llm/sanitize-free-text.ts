/**
 * Sanitize a free-text intake value before it is woven into a generation prompt (030). Strips
 * control characters and caps length so a free-form answer can't bloat the prompt or smuggle
 * instructions across the data boundary (the prompt builder additionally labels it as data).
 */
const MAX_LEN = 280;
// Matches ASCII control characters (C0 range and DEL); built from an escaped string so no raw
// control byte appears in source.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001f\\u007f]', 'g');

export function sanitizeFreeText(value: string): string {
  return value.replace(CONTROL_CHARS, ' ').trim().slice(0, MAX_LEN);
}
