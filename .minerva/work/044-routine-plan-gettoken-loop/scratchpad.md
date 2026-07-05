# Scratchpad — 044-routine-plan-gettoken-loop

## Quick decisions 2026-07-05
- [decided] scope check: single work unit — one bounded bug in one file (`new.tsx` plan effect). Not decomposable.
- [decided] approach: localized "latest ref" fix in `new.tsx` (dominant). Rejected the global stable-getToken hook across all 8 call sites — cross-cutting auth-seam change, higher blast radius, and the other getToken-dep effects (StateProvider ×3, useFoodLog) are latent-but-benign (no abort-on-cleanup + no sustained render driver). Deferred as a hardening followup.
- [decided] whole-proposal soundness: standard latest-ref pattern; lint-conforming per 001/004 (no inline eslint-disable, no .current-in-render); no public interface change. Confident, no escalation.
