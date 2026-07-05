# Followups — 044-routine-plan-gettoken-loop

## Hardening: stabilize `getToken` globally (deferred)
`@clerk/expo` v3's `useAuth().getToken` is a new reference every render (no `useCallback`) — see
[[044-bug-clerk-expo-unstable-gettoken-stream-loop]]. 044 fixed the one effect that actually looped
(the routine plan fetch). The remaining `getToken`-keyed effects (`StateProvider` ×3, `useFoodLog`)
are latent-but-benign but still issue redundant fetches during their pending windows. A small
`useStableAuth` hook that `useCallback`-memoizes `getToken` (or a `getTokenRef` threaded from a
provider) would close the whole class and remove the redundant fetches. No live bug forces it; size it
as its own small work unit when convenient.
