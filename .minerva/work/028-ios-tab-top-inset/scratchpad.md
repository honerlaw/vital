# Scratchpad — 028-ios-tab-top-inset

Live working notes for this unit. Promoted/archived at `minerva:promote`.

## Panel decisions 2026-06-10
- [skipped — small] scope check: single additive unit (evidence: one file `src/components/Screen.tsx`, one concern — the `paddingTop` else-branch on the iOS tab scroll path; no new public interface; mirrors the already-shipped 025 bottom fix)
- [3/3 accept] approach selection: option A — drop manual `insets.top` on the iOS tab scroll path (rejected: B — disable native auto-inset + own all padding, reverts shipped 025 bottom fix, retained only as device-verification fallback per 031 Trap 1; C — cancel insets.top via negative margin, fights the platform). Carried concerns: notch-clearance is a hard merge precondition; correct the "full safe area top AND bottom" framing; B stays the named fallback.
- [3/3 accept] whole-proposal acceptance: folded in 3 panel-required refinements — (1) sharpened device-dependency/blast-radius note tied to 031 Trap 1 + Approach B fallback, (2) criterion 6 lint marked "to be confirmed at work-time", (3) added code-verifiable criterion 5 (Android/web paddingTop byte-identical). Already-settled (not re-litigated): paddingBottom invariance, three screens/props, Settings scroll={false}, theme screenPaddingTop=8, [visual] tagging convention (027 precedent).

## Panel concerns 2026-06-10
(none below quorum — all panels reached full 3/3 consensus; concerns above were folded into the proposal text, not deferred)

## Work log
(implementation notes appended during minerva:work)
