# 045 scratchpad

## Quick decisions 2026-07-09
- [decided] scope check: single additive UI unit (program-detail screen + one Button variant); no decompose.
- [decided] approach: add standalone secondary "Switch to this program" CTA dispatching existing SET_ACTIVE_PROGRAM + navigate home; keep "Switch & begin workout" and its 015 cancel-revert unchanged. Rejected: (a) persist-on-cancel for switch&begin (breaks 015 lossless revert, doesn't serve switch-now-train-later); (b) replace switch&begin outright (regresses one-tap switch+start).
- [decided] whole-proposal soundness: SET_ACTIVE_PROGRAM already wired (reducer + StateProvider persist + reducer.test.ts). Intentionally departs from 019's "no standalone set-active tap" per explicit user feedback → update 019 knowledge on promote. Low blast-radius, no public-interface change → decided directly, no escalation.
