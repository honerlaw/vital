# Follow-ups — 025-ios-liquid-glass-tabs

## Runtime verification (the one unverified slice from this unit)
- [ ] On an iOS 26 device/simulator, confirm the NativeTabs bar actually renders Apple Liquid
      Glass (vs the opaque legacy bar → indicates the build is not against the iOS 26 SDK).
- [ ] Confirm the tab-screen bottom spacing is pixel-correct: no ~64pt double-gap above the bar
      on the scrolling tabs (index/programs/history), and Sign-out not clipped on Settings.
      This validates the native-auto-inset assumption behind `Screen.tsx`'s scroll-gated
      `tabBarPad`. **If the assumption is false**, set `disableAutomaticContentInsets` on the
      NativeTabs triggers and keep the manual `layout.tabBarHeight` padding instead.

## Deferred enhancements (out of scope for 025, trivially additive later)
- [ ] Header Liquid Glass on the pushed screens — currently a deliberate inline-large-title
      white-bar design ([[027-pattern-native-stack-headers-pushed-screens]]); making headers
      glass is a separate design decision that fights that language.
- [ ] Android Material 3 NativeTabs — Android keeps the custom bar today; the `AppTabs.ios.tsx`/
      `AppTabs.tsx` split makes flipping Android to NativeTabs a one-file change.
- [ ] `minimizeBehavior="onScrollDown"` for the iOS 26 minimize-on-scroll effect (left at the
      `automatic` default for v1).
- [ ] Brand retention inside NativeTabs — attempt the JetBrains-mono label font via NativeTabs
      `labelStyle.fontFamily` + accent `iconColor`. Not attempted in 025 (custom fonts may not
      render on native UIKit tab labels); if it renders, it partially recovers the brand chrome
      surrendered to the system bar.
