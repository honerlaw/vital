# 023 — follow-ups

- **Revisit `scroll={false}` on Settings when it gains content.** The bottom-pinned layout
  clips silently if preference rows (units kg/lb, notifications) ever overflow a short
  viewport; switch to a scrolling layout with a sticky footer at that point. (Panel concern,
  proposal Open Questions.)
- **`Screen`'s `center` prop is silently ignored under `scroll={false}`.** Either apply
  centering in the View branch or document the prop as scroll-only at the prop definition.
  Latent — no call site combines them today. (Review F1.)
- **Avatar size token.** `Avatar.tsx` hardcodes the 64px circle; if avatars spread beyond
  Settings, add an avatar-size token to `theme.ts`. (Review F2.)
