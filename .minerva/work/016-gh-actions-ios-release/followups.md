# 016 — gh-actions-ios-release · followups

All three are conditional hardening on the shipped release pipeline — adopt when the
stated trigger condition arrives, not before:

- **`eas workflow:run --wait` to gate the GH run on build+submit outcome** — adopt if a
  build-gating GitHub status ever becomes worth ~30-40 idle runner minutes per merge
  (and accept that the workflow-scoped concurrency group then serializes merges behind
  it). Until then, EAS's build-failure notifications are the red signal.
- **`--ref ${{ github.sha }}` pinning on the trigger step** — pins the EAS build to the
  exact pushed commit instead of the runner's working tree. Fact-checked during review:
  `--ref` resolves against the *local* git repo (`rev-parse`) and does **not** require
  the EAS GitHub-app link. Adopt if any step ever mutates the tree before the trigger.
- **Multiline-safe env filter** (`doppler secrets download --format json` + `jq`) — the
  current line-based `grep '^EXPO_PUBLIC_'` silently truncates multiline values. Adopt
  the moment any multiline `EXPO_PUBLIC_*` value (e.g. a PEM) enters the Doppler prd
  config.
