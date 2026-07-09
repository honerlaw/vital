# Scratchpad — 046-differentiate-generated-programs

> Promoted 2026-07-09 — durable knowledge in
> `.minerva/knowledge/046-pattern-program-origin-sections-and-generated-stamp.md`; reality folded
> into `proposal.md` (Status: Shipped). No open TODOs. Working notes archived below.

## Review 2026-07-09 (inline — no PR yet)
- minerva audit: all 6 success criteria met; knowledge-compliant (034 catalog-omits idiom, 028
  strict-writer/tolerant-reader, 001 strict lint). No spec divergence.
- code review: no load-bearing findings. `generatedStamp` reuses the shipped `historyDate` Intl
  pattern; conditional-spread keeps catalog omission clean; draft POST carries no `createdAt`.
- Verification: 134/134 unit tests pass (incl. new mapper Date→ISO + guard tolerance); lint clean
  on all changed files; changed files type-clean (baseline typecheck errors are pre-existing
  environmental — missing optional native deps + expo-router typegen — unrelated to this diff).
  Simulator render not booted (simple conditional JSX; data path unit-tested).

## Quick decisions 2026-07-09

- [decided] scope check: single additive unit — no migration; one SELECT/RETURNING column, one optional type field, mapper + guard, list sectioning, card stamp, one prompt line. Cohesive, bounded.
- [decided] approach: surface existing `created_at` + section by existing `userProgramIds` (dominant). Rejected app-side auto-naming (discards LLM's descriptive names, heavier, doesn't fix already-saved collisions) and a new `source` column + migration (`userProgramIds` already partitions client-side; catalog-omits-field mirrors 030/034 progression idiom).
- [decided] whole-proposal soundness: optional `Program.createdAt` where catalog omits it follows the established "absence = catalog" idiom (034); internal API response field only, tolerant-reader guard — not a cross-cutting/external contract, no escalation.
- [decided] stamp format: include time (not date only) so same-day generations disambiguate — the user's two collisions were likely one session.
