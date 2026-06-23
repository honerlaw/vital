# 031 — Route LLM calls through OpenRouter (provider-agnostic)

- Status: Shipped (2026-06-22)
- Date: 2026-06-22
- Branch: 031-openrouter-llm

## Goal

Replace the direct Anthropic Messages API integration (030) with [OpenRouter](https://openrouter.ai)
so the routine generator can target **any** model — Anthropic, OpenAI, Google, open-weight — by
changing a single config value instead of code, while preserving the existing internal contract
(`callLlm(system, user) => Promise<string>`) so no route or guard changes.

## Why

The current client is hard-wired to `api.anthropic.com` with Anthropic-specific headers, request
body, and response shape (`call-claude.ts`, `extract-text.ts`, `model.ts`). Trying a different model
means rewriting the transport. OpenRouter exposes an OpenAI-compatible `/chat/completions` endpoint
that fronts every major provider behind one API and key, so model choice becomes a string. This is
exactly the "use any model more easily" the user asked for.

## Approach

Swap the transport to OpenRouter's OpenAI-compatible Chat Completions API and make the LLM module
provider-neutral. The internal seam (`callLlm`/`requestJson` returning a `string`) is unchanged, so
`request-json.ts` and the three routine routes need no behavioral edits.

- **`src/server/llm/call-claude.ts` → `src/server/llm/call-llm.ts`** (renamed): POST to
  `https://openrouter.ai/api/v1/chat/completions` with `Authorization: Bearer ${OPENROUTER_API_KEY}`.
  Body uses the OpenAI shape: `{ model, max_tokens, messages: [{role:'system',...},{role:'user',...}] }`.
  Function renamed `callClaude` → `callLlm`. Key read from `process.env.OPENROUTER_API_KEY`
  (server-only, NEVER `EXPO_PUBLIC_*`, exactly as before). Throws on missing key / non-2xx.
- **`src/server/llm/extract-text.ts`**: rewrite `extractClaudeText` → `extractText` to read the
  OpenAI response shape `choices[0].message.content` (cast-free narrowing, throws on a surprise
  shape — same strict-reader discipline).
- **`src/server/llm/model.ts`**: `CLAUDE_MODEL`/`CLAUDE_MAX_TOKENS` → `LLM_MODEL`/`LLM_MAX_TOKENS`.
  Default `LLM_MODEL = 'anthropic/claude-sonnet-4.5'` (preserves current Sonnet behavior). The model
  is overridable at runtime via `process.env.OPENROUTER_MODEL` (resolved in `call-llm.ts`), so the
  operator can switch models with an env var and no deploy — the "any model easily" payoff. The
  default is still an explicit pinned slug (not an auto-shifting "latest" alias), honoring 035's
  contract-stability rationale.
- **`src/server/llm/request-json.ts`**: update the import `callClaude` → `callLlm`. No logic change
  (the retry-once-then-degrade behavior is unchanged).
- Update the Anthropic/Claude-specific doc comments across these files to describe OpenRouter.

Rejected alternatives:
- *Minimal in-place endpoint swap keeping the `Claude`/`Anthropic` names* — leaves actively
  misleading symbol/file names on an OpenRouter client, contradicting the provider-agnostic goal.
- *A pluggable multi-provider abstraction layer* — over-engineering for a single consumer; OpenRouter
  already is the provider-abstraction layer.

## Success criteria

1. `call-llm.ts` POSTs to OpenRouter's `/chat/completions` with a `Bearer` auth header and the
   OpenAI request body; `call-claude.ts` no longer exists.
2. The model is resolved from `OPENROUTER_MODEL` env with the pinned `LLM_MODEL` default; key from
   `OPENROUTER_API_KEY`; neither is `EXPO_PUBLIC_*`.
3. `extractText` parses `choices[0].message.content` cast-free and throws on an unexpected shape.
4. No Anthropic-specific identifiers (`callClaude`, `extractClaudeText`, `CLAUDE_MODEL`,
   `ANTHROPIC_API_KEY`, `api.anthropic.com`, `anthropic-version`) remain in `src/server/llm/`.
5. `npm run typecheck` and `npm run lint` pass; the three routine routes are unchanged.

## Open questions

- **Default model slug.** Defaulted to `anthropic/claude-sonnet-4.5` to preserve current behavior;
  the operator can change it via `OPENROUTER_MODEL` or the constant. If the exact slug is wrong the
  route 502s and the client falls back (035) — it degrades, it doesn't brick.
- **Ops.** `OPENROUTER_API_KEY` must be added to Doppler (local) and DO App Platform (prod);
  `ANTHROPIC_API_KEY` can be retired. Until the key is set the feature degrades gracefully.
