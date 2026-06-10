# Scratchpad — 025-ios-liquid-glass-tabs

## Working notes

## Panel decisions 2026-06-10
- [3/3 single-unit] scope check: SINGLE work unit (Proponent accept; Skeptic+Arbiter "revise" = single unit with tightened success criteria, NOT decompose). Tightenings folded: Screen.tsx "tab-child on iOS" discriminator + non-tab consumers byte-for-byte; verify unstable NativeTabs API + iOS-26 glass; web-SSR-unregressed criterion.
- [escalated to user] approach selection: panel 1/3 accept (Proponent accept B; Skeptic+Arbiter revise) — converged that B (NativeTabs) is the ONLY path to real system glass, but B-vs-C is a product-identity values call (real glass vs preserving the bespoke iOS bar) the panel cannot make. Escalated via AskUserQuestion → user chose **Native glass (NativeTabs) = Approach B**. (escalation #1)
- [accept] whole-proposal acceptance: vote 1 = 2/3 (Skeptic revise: Settings non-scroll clip [HIGH] + inline-arrow lint [MEDIUM]) → revised. Vote 2 = Proponent accept + Arbiter accept; Skeptic revise on a now-resolved wording point (programs/history also pass `tabScreen`, already mandated by criterion 4). Arbiter ruled the residual non-load-bearing → consensus to proceed.

## Panel concerns 2026-06-10
- (logged, non-blocking) On-device/simulator validation of the native-tab-bar auto-inset assumption is required before claiming criterion 4 — the "drop manual tabBarHeight on the iOS scroll path" relies on the native UITabBar auto-insetting the first ScrollView. Fallback if false: keep manual padding + `disableAutomaticContentInsets`.
- (logged) iOS 26 SDK build target gates whether glass actually renders vs opaque fallback; confirm which the available simulator exercises.
