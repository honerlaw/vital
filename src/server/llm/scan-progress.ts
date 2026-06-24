/**
 * Streaming structural-progress scanner (034). Given the text accumulated so far from a streaming
 * LLM completion (a partial JSON object), report how many ELEMENTS of one named top-level array
 * have fully closed, plus one optional scalar field, WITHOUT parsing — final validation stays
 * server-side via the existing guards/mapper (035, server-owns-validation). The scan is
 * string-literal / escape aware so braces, brackets, or the array key appearing inside a string
 * value (e.g. a `blurb`) never miscount depth.
 *
 * It is deliberately tolerant of a truncated tail: a partial element or a half-arrived scalar at
 * the end of the buffer is simply not counted yet — the next chunk completes it. Re-scanning the
 * whole (few-KB) buffer per chunk keeps the function pure and chunk-boundary-correct by
 * construction; counts are monotonic because a token only appears in the buffer once it has fully
 * arrived. Used by the SSE routes to emit `progress` snapshots: `days[]` (+ `perWeek`) for
 * generate/refine, `questions[]` for plan.
 */

export interface ProgressScan {
  /** Completed elements of the target top-level array so far. */
  count: number;
  /** The target scalar (e.g. `perWeek`), once it has fully arrived; otherwise undefined. */
  scalar?: number;
}

// Single-character classes, inlined as string membership so the module keeps ONE declaration
// (local/single-declaration). WHITESPACE matches JSON insignificant whitespace; DIGIT matches every
// character that can appear inside a JSON number token.
const WHITESPACE = ' \n\r\t';
const DIGIT = '0123456789+-.eE';

export function scanProgress(buffer: string, arrayKey: string, scalarKey?: string): ProgressScan {
  let inString = false;
  let escaped = false;
  let current = ''; // chars of the string literal currently being read
  let lastString: string | null = null; // most recently closed string literal
  let pendingKey: string | null = null; // a closed string confirmed (by a following ':') as a key
  let depth = 0;

  let targetOpen = false;
  let targetInteriorDepth = -1;
  let count = 0;

  let scalar: number | undefined;
  let readingScalar = false; // positioned right after `scalarKey :`, consuming a number token
  let scalarText = '';

  for (let i = 0; i < buffer.length; i++) {
    const c = buffer[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (c === '\\') {
        escaped = true;
      } else if (c === '"') {
        inString = false;
        lastString = current;
        current = '';
      } else {
        current += c;
      }
      continue;
    }

    if (readingScalar) {
      if (DIGIT.includes(c)) {
        scalarText += c;
        continue;
      }
      if (scalarText === '' && WHITESPACE.includes(c)) {
        continue; // skip whitespace between the colon and the number's first digit
      }
      // Terminator reached → the number fully arrived; commit it.
      const parsed = Number(scalarText);
      if (scalarText.length > 0 && !Number.isNaN(parsed)) scalar = parsed;
      readingScalar = false;
      scalarText = '';
      // fall through to process the terminator char normally
    }

    if (c === '"') {
      inString = true;
      current = '';
      continue;
    }
    if (WHITESPACE.includes(c)) continue;

    if (c === ':') {
      // The string just before this colon is an object key.
      pendingKey = lastString;
      lastString = null;
      if (scalarKey !== undefined && pendingKey === scalarKey) {
        // Begin consuming the scalar value (skip leading whitespace handled above).
        readingScalar = true;
        scalarText = '';
      }
      continue;
    }

    if (c === '{' || c === '[') {
      if (c === '[' && !targetOpen && pendingKey === arrayKey) {
        targetOpen = true;
        targetInteriorDepth = depth + 1;
      }
      depth++;
      pendingKey = null;
      lastString = null;
      continue;
    }

    if (c === '}' || c === ']') {
      depth--;
      if (targetOpen && depth === targetInteriorDepth) {
        // An element of the target array just closed (returned to the array interior depth).
        count++;
      }
      if (targetOpen && depth < targetInteriorDepth) {
        // The target array itself closed; stop counting.
        targetOpen = false;
      }
      pendingKey = null;
      lastString = null;
      continue;
    }

    if (c === ',') {
      pendingKey = null;
      lastString = null;
      continue;
    }
    // Any other token (digits/true/false/null outside a tracked scalar) is ignored.
  }

  return scalar === undefined ? { count } : { count, scalar };
}
