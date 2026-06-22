# Scratchpad — 031-openrouter-llm

## Quick decisions 2026-06-22
- [decided] scope check: single work unit — bounded to `src/server/llm/` (~5 files), no route/guard changes (internal `callLlm(system,user)=>string` seam preserved)
- [decided] approach: provider-neutral rename + OpenRouter OpenAI-compatible client + env-overridable model. Rejected (A) in-place swap keeping Claude/Anthropic names (misleading, contradicts goal); (B) pluggable multi-provider layer (over-engineering — OpenRouter IS that layer)
- [decided] whole-proposal soundness: OpenRouter `/chat/completions` is the well-known stable OpenAI contract; internal seam unchanged so callers/routes untouched — no public-interface uncertainty
- [decided] knowledge 035: this intentionally supersedes the *provider specifics* of 035 (endpoint, env-var name, response shape); structural principles (fetch-not-SDK, server-only key, untrusted-output guard+retry+degrade, rate limit) all carry over. Not a conflict — a user-requested evolution; 035 updated in promote
- [decided] model default: `anthropic/claude-sonnet-4.5` pinned slug (preserves current Sonnet) + `OPENROUTER_MODEL` env override (serves "any model easily"); degrades gracefully if slug wrong
