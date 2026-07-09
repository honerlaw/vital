# Scratchpad — 046-differentiate-generated-programs

## Quick decisions 2026-07-09

- [decided] scope check: single additive unit — no migration; one SELECT/RETURNING column, one optional type field, mapper + guard, list sectioning, card stamp, one prompt line. Cohesive, bounded.
- [decided] approach: surface existing `created_at` + section by existing `userProgramIds` (dominant). Rejected app-side auto-naming (discards LLM's descriptive names, heavier, doesn't fix already-saved collisions) and a new `source` column + migration (`userProgramIds` already partitions client-side; catalog-omits-field mirrors 030/034 progression idiom).
- [decided] whole-proposal soundness: optional `Program.createdAt` where catalog omits it follows the established "absence = catalog" idiom (034); internal API response field only, tolerant-reader guard — not a cross-cutting/external contract, no escalation.
- [decided] stamp format: include time (not date only) so same-day generations disambiguate — the user's two collisions were likely one session.
