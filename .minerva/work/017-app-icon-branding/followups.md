# Followups — 017-app-icon-branding

Forward work deferred from this unit. Real work, not abandoned — recorded here rather
than auto-seeded into proposals.

- **Retina/PWA favicon sizes.** `favicon.png` is a single 48² render (template parity).
  If web icon quality ever matters — retina tabs, PWA install icons, apple-touch-icon —
  derive the larger sizes from the same master `assets/images/vital-icon.svg` via
  `scripts/generate-icons.mjs` (one extra `render(master, N, ...)` line each).
