/**
 * Normalize a scheme string from the LLM (030). The catalog separator is U+00D7 '×', but a model
 * may emit ASCII 'x'; this rewrites the separator between digits so `parseSchemeReps` (which
 * matches '×' only) can read the rep target for prefill (022/028). A safety net on top of the
 * prompt instruction.
 */
export function normalizeScheme(scheme: string): string {
  return scheme.replace(/(\d)\s*[x×]\s*(\d)/g, '$1×$2');
}
