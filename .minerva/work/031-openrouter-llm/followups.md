# Followups — 031-openrouter-llm

## Ops: wire up the OpenRouter key (required for the live feature)
- Add `OPENROUTER_API_KEY` to **Doppler** (local) and **DO App Platform** (prod) — server env only,
  NEVER `EXPO_PUBLIC_*`. Until it is set the routine generator 502s and the client falls back
  (degrades, doesn't brick).
- Retire `ANTHROPIC_API_KEY` from both env sources once OpenRouter is verified working.

## Model selection
- Default is `anthropic/claude-sonnet-4.5` (`LLM_MODEL` in `src/server/llm/model.ts`), preserving the
  prior Sonnet behavior. To use a different model, set `OPENROUTER_MODEL` in the server env (no
  deploy) or change the constant.
- Verify the default slug resolves on OpenRouter for this account; if not, set `OPENROUTER_MODEL` to a
  known-good slug. A bad slug → 502 → client fallback (no brick).
