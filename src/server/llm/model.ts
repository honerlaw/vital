/**
 * Default model + token budget for the routine generator, routed through OpenRouter (031).
 * `LLM_MODEL` is an OpenRouter model slug (`provider/model`). It is the DEFAULT — the operator can
 * switch models at runtime via the `OPENROUTER_MODEL` env var (resolved in `call-llm.ts`) with no
 * deploy, which is the point of going through OpenRouter. It is a PINNED explicit slug (no unstable
 * "latest" alias) so the prompt/output contract can't silently shift under us. Server-only —
 * reached exclusively from `src/app/api/**`.
 */
export const LLM_MODEL = 'anthropic/claude-sonnet-4.5';
export const LLM_MAX_TOKENS = 4096;
