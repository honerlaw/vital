# 039 — usda-search-post · scratchpad

## Quick decisions 2026-06-24
- [decided] scope check: single work unit — server-internal transport change (one function rewritten + one moot file/test deleted), no public-interface change. Small.
- [decided] approach: POST `/foods/search` with JSON body (`dataType` as JSON array). Dominant — verified live 15/15 → 200 with valid body, sidesteps the query-string gateway path that flakes. Rejected: drop `Survey (FNDDS)` (loses a food source, no guarantee other inputs don't flake); GET+retry-on-400 (latency band-aid on a ~50%-flaky path).
- [decided] whole-proposal soundness: POST is USDA's documented endpoint, confirmed live with the real key (15/15, foods:25); api_key stays in query string (the tested form); no cross-cutting contract change. Sound, no escalation.

- [synthesis] refreshed overview.md (watermark 037→039; +038-llm-sse-streaming, +039-usda-post-fix; superseded-038 noted)
