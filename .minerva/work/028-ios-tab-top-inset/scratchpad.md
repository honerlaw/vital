# 028 — ios-tab-top-inset · scratchpad

Promoted 2026-06-10 — durable knowledge folded into
`.minerva/knowledge/031-pattern-ios-native-tabs-liquid-glass.md` "Trap 1" (now covering BOTH
safe-area axes: the both-axes double-count lesson, the symmetric top fix, and the updated
validation status — band confirms a native top inset EXISTS; FULL-vs-PARTIAL extent still
pending on-device, Approach B fallback). 032 needs no edit (it cites the overlay-bar mechanism
as already-true, never made the "not yet validated" claim) — positively checked, not skipped.
overview.md untouched (synthesis watermark at 030; 031/032 already post-watermark, and an
in-place edit does not move the watermark). proposal.md reconciled to shipped reality
(Status → Shipped). Panel-decision log (scope skip, approach 3/3, whole-proposal 3/3,
completion 3/3, review-triage skip, promote-partition 2/3 accept-with-folded-refinements) was
routine process exhaust and discarded per the promote partition. No divergence, no replan.

Open obligation carried to the PR: on-device notch-clearance verification on both UITabBar
generations is a hard merge precondition; if the top inset proves partial, fall back to
Approach B (`disableAutomaticContentInsets` on the NativeTabs triggers + own the padding).
