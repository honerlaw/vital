# 013 — eas-ios-release-workflow · scratchpad

## Panel decisions 2026-06-05
- [skipped — small] scope check: single additive unit (evidence: adds eas.json, one workflow file, additive app.json keys + the user's existing linkage diff; no plausible decomposition)
- [skipped — small] approach selection: EAS Workflows dominant (rejected: GH Actions `eas build --auto-submit` — requires EXPO_TOKEN secret + duplicated infra; GH Actions thin trigger via `eas workflow:run` — strictly more indirection); user directive "use eas for the majority of things"
- [1/3 accept → revision round] whole-proposal acceptance v1: Skeptic+Arbiter flagged (1) no build-time env in production profile → dead-on-arrival binary (Clerk key + API URL inlined at build, EAS can't see Doppler/DO env); (2) change falsifies knowledge 008 ("don't spread config.extra") — supersede required; (3) auto-submit semantics undocumented (TestFlight-not-public, version vs build number, review queuing)
- [3/3 accept] whole-proposal acceptance v2: env via `environment: "production"` + manual step creating EAS env vars + covering success criterion; 008 supersede in scope; semantics + sequencing documented. Residual low concerns logged: `environment` eas.json key + `build_id` output not verifiable in-repo (first interactive build is the safety net); bundle ID proposed-not-confirmed
