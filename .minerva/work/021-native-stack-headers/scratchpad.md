# 021 — native-stack-headers · scratchpad

## Panel decisions 2026-06-07

- [2/3 accept ×2 rounds, escalated to user] scope check: single unit — all 6 agents
  across both rounds agreed sizing; Skeptic dissents were spec precision. User
  confirmed: single unit; minimal chevron with no back text (UX delta accepted).
- [1/3 accept r1 → 2/3 accept r2, proceeded on Arbiter ruling] approach selection:
  option A (native chrome-only headers on pushed screens) over B (headers everywhere)
  and C (custom components in header slots). r1 Skeptic HIGHs (Android back bypass;
  early-return options hole) absorbed. r2 protocol note: second vote was 2/3 at a 3/3
  quorum — the explicit ≤1/3 escalation trigger was not met, the Arbiter independently
  verified every disputed fact and ruled all surviving dissent implementation notes,
  and no user-facing decision remained; orchestrator proceeded with the Skeptic's
  required commitments folded into the proposal (BackHandler committed; inline-arrow
  headerLeft; predictive-back caveat; nested-Screen verify item) rather than triggering
  a false-positive propose-phase abort. Whole-proposal panel re-reviewed the full text.
- [3/3 accept] whole-proposal acceptance: strong consensus; Skeptic wording
  clarifications folded in (the `!live` → fragment-not-null branch; whole non-ready
  branch not just loading; not-found branch `Screen` needs `hasHeader`).

## Panel concerns 2026-06-07

- (approach r2 Skeptic, absorbed as commitments) Android predictive-back gesture is not
  intercepted by BackHandler — not enabled in this app (CNG, no
  `enableOnBackInvokedCallback`); code comment + proposal note required.
- (approach r2 Skeptic, resolved) `usePreventRemove` not publicly exported by
  expo-router ~56.2.8 — BackHandler from react-native committed.
- (whole-proposal Skeptic, folded) criterion-3 wording: Cancel chrome must mount in the
  `!live` branch via fragment-with-Stack.Screen, not bare null.

## Implementation notes 2026-06-07

- v56 option names pinned from docs.expo.dev/router/advanced/stack: headerBackButtonDisplayMode
  ('default'|'generic'|'minimal', iOS), gestureEnabled (iOS), headerBackVisible, headerLeft,
  in-route <Stack.Screen options> all confirmed.
- CANCEL_WORKOUT verified a reducer no-op when live is null (reducer.ts:115) — BackHandler can
  safely route through onCancel in every branch.
- exhaustive-deps required a stable onCancel for the BackHandler effect → useCallback([dispatch,
  router]); preserves the proposal's single-cancel-path property (header Cancel + hardware back
  share one function). No divergence — knowledge 004's "write to the rule" pattern.
- workout headerLeft text uses AppText variant="backLink" ("Cancel" → uppercase mono muted),
  keeping the design language inside the native chrome.
- account.tsx lost its only router use with BackLink → useRouter import removed.
