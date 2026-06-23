# Scratchpad — 031-openrouter-llm

## Quick decisions 2026-06-22
- [decided] scope check: single work unit — bounded to `src/server/llm/` (~5 files), no route/guard changes (internal `callLlm(system,user)=>string` seam preserved)
- [decided] approach: provider-neutral rename + OpenRouter OpenAI-compatible client + env-overridable model. Rejected (A) in-place swap keeping Claude/Anthropic names (misleading, contradicts goal); (B) pluggable multi-provider layer (over-engineering — OpenRouter IS that layer)
- [decided] whole-proposal soundness: OpenRouter `/chat/completions` is the well-known stable OpenAI contract; internal seam unchanged so callers/routes untouched — no public-interface uncertainty
- [decided] knowledge 035: this intentionally supersedes the *provider specifics* of 035 (endpoint, env-var name, response shape); structural principles (fetch-not-SDK, server-only key, untrusted-output guard+retry+degrade, rate limit) all carry over. Not a conflict — a user-requested evolution; 035 updated in promote
- [decided] model default: `anthropic/claude-sonnet-4.5` pinned slug (preserves current Sonnet) + `OPENROUTER_MODEL` env override (serves "any model easily"); degrades gracefully if slug wrong
- [decided] review triage: no FIX/SUGGEST code findings — no dep churn, only intended files, all criteria met; default-slug correctness is the documented open question (degrades gracefully) → note in PR, no code change
- [decided] promote partition: knowledge change is a MERGE/UPDATE into existing [[035-pattern-server-llm-integration]] (provider/endpoint/env/response-shape rewritten; structural principles unchanged) + overview.md stale-clause fix; no new knowledge entry. Ops TODO → followups.md
- [synthesis] no-op (current — unsynthesized [], link_rot []; watermark 35 = corpus max; 035 updated in place, overview stale clause fixed directly during promote)
