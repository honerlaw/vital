/**
 * Pinned Claude model + token budget for the routine generator (030). Pinned to a specific model
 * string (no unstable "latest" alias) so the prompt/output contract can't shift under us on
 * Anthropic's release cadence. Server-only — reached exclusively from `src/app/api/**`.
 */
export const CLAUDE_MODEL = 'claude-sonnet-4-6';
export const CLAUDE_MAX_TOKENS = 4096;
