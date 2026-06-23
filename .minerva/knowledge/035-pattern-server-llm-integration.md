# Pattern: server-side LLM integration — fetch-based OpenRouter calls, server-only key, strict-writer guard validation

- Type: pattern
- Date: 2026-06-22
- Work unit: 030-ai-routine-generator (originally Anthropic-direct); 031-openrouter-llm (routed
  through OpenRouter so any model is a config value, not a code change)
- Related: [[034-pattern-ai-routine-generation]] (the first consumer — the routine generator),
  [[014-pattern-server-pg-access-expo-routes]] (the lazy-singleton / unknown-row / cast-free-mapper
  shape this mirrors for the LLM client), [[028-pattern-per-set-log-tracking]] (strict-writer /
  tolerant-reader — applied here to LLM output), [[024-bug-npm10-npm11-lockfile-divergence]] (why
  the no-new-dependency choice matters), [[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]]
  (the requireAuth gate every LLM route uses)

How VITAL talks to an LLM from its Expo Router API routes (030) — the app's first LLM integration.

## Call OpenRouter via `fetch`, not an SDK

The LLM is reached through the platform `fetch` (`src/server/llm/call-llm.ts`), NOT a provider SDK.
No new dependency means no `package-lock` churn and no exposure to the npm10/11 lockfile divergence
trap (024) or EAS prune surprises. As of 031 the transport is OpenRouter's OpenAI-compatible Chat
Completions endpoint (`https://openrouter.ai/api/v1/chat/completions`) — `Authorization: Bearer`
auth, body `{ model, max_tokens, messages: [{role:'system'},{role:'user'}] }`, response read at
`choices[0].message.content` (`extract-text.ts`, cast-free). OpenRouter fronts every major provider,
so **the model is just a string**: `LLM_MODEL` in `model.ts` is the pinned default
(`anthropic/claude-sonnet-4.5`) and `OPENROUTER_MODEL` overrides it at runtime with no deploy. It is
still an explicit PINNED slug (no unstable "latest" alias) so the prompt/output contract can't shift
under us. The client is reached only from `src/app/api/**` route handlers (re-exported
one-function-per-file from `src/server/routes/`), the same boundary as pg access (014). (History: 030
called the Anthropic Messages API directly via `call-claude.ts`; 031 swapped the transport for
provider flexibility. The internal `callLlm(system, user) => string` seam was preserved, so no route
or guard changed.)

## The key is server-only — NEVER `EXPO_PUBLIC_*`

`OPENROUTER_API_KEY` is read from `process.env` inside `call-llm.ts` (exactly as `db.ts` reads
`DATABASE_URL`). It must live in the server env — Doppler locally, DO App Platform in prod — and must
NEVER be `EXPO_PUBLIC_*`, which would bake it into the client/iOS bundle. A missing key makes the
route 502 (the client then falls back), never a broken-but-shipped binary. (Ops: the key has to be
added to both env sources for the live feature to work; absent it, the feature degrades, it doesn't
brick. The pre-031 `ANTHROPIC_API_KEY` can be retired once OpenRouter is wired up.)

## LLM output is untrusted — validate cast-free, retry once, then degrade

Every LLM response is JSON-extracted (`extract-json.ts` slices first `{`..last `}`, tolerating
fences/prose) and validated through hand-written cast-free guards before it is trusted — the same
strict-writer discipline as 028's set-log writer. `request-json.ts` retries once with a stricter
instruction, then throws → the route returns 502 and the client falls back (fixed spine for the
plan; Retry + catalog for generation). Free-text inputs are sanitized (control chars stripped,
length-capped) and framed as data in the prompt (prompt-injection mitigation). A server-minted uuid
(not the model) is the generated entity's id; constant fields like `cred` are forced server-side,
never trusted from the model.

## Rate limiting

A per-user daily cap (`llm_usage` table, `withinDailyLlmCap`) is checked-and-incremented with a
single atomic upsert per call, returning 429 over the cap. It fails OPEN on a surprise row shape —
the cap is a cost/abuse guard, not a security control, so a counter bug must not lock users out.
