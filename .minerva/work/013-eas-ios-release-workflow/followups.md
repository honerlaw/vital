# 013 — eas-ios-release-workflow · followups

- **Optional: gate App Store submission behind a manual `workflow_dispatch`** instead of
  auto-submit-on-merge. Deliberately not adopted in 013 — the user explicitly asked for
  submit-on-merge; semantics (TestFlight-not-public, ASC manual release) are documented in
  `docs/ios-release.md` instead. Revisit if merge cadence starts outpacing App Store
  review (submissions queueing/superseding each other in review).
