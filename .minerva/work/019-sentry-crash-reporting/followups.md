# 019 — followups

- **Web-client Sentry coverage**: init is deliberately `Platform.OS === 'web'` → no-op
  (SSR safety + scope control). Web client errors are currently unobserved; server
  errors go to DO logs. If web usage grows, add `@sentry/react` (or the RN SDK's web
  support once stable) behind the same DSN with its own SSR guard.
- **Post-merge symbolication check** (owner: Derek): when the first real production
  event arrives in `onerlaw-llc/vital`, confirm the stack is symbolicated; if not,
  check `SENTRY_AUTH_TOKEN` in the EAS production env and the plugin slugs
  (protocol in docs/ios-release.md).
