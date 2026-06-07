# 021 — follow-ups

- Migrate the tab-screen header rows (inline date-eyebrow + "Account" link on Today,
  eyebrow rows on Programs/History) to native header chrome — explicitly deferred from
  021 (tab screens have no back affordance; different interaction surface).
- If Android predictive back (`enableOnBackInvokedCallback`) is ever enabled, the
  workout screen's `BackHandler` interception no longer covers the gesture — revisit
  with the react-native-screens preventRemove path (code comment in `workout.tsx`).
- (review F1) Subscribe-once-via-ref refactor for the workout BackHandler effect — the
  current re-subscription per dispatch is correct but churny (StateProvider's dispatch is
  re-memoized on [state]).
- (review F3) Optional `onAccessibilityEscape` backstop on the workout screen routing to
  `onCancel` — the labeled Cancel button is the only accessible exit today.
