# 021 — follow-ups

- Migrate the tab-screen header rows (inline date-eyebrow + "Account" link on Today,
  eyebrow rows on Programs/History) to native header chrome — explicitly deferred from
  021 (tab screens have no back affordance; different interaction surface).
- If Android predictive back (`enableOnBackInvokedCallback`) is ever enabled, the
  workout screen's `BackHandler` interception no longer covers the gesture — revisit
  with the react-native-screens preventRemove path (code comment in `workout.tsx`).
