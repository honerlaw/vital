# 017-app-icon-branding

## Status

Implemented — review complete; PR pending (`minerva:ship` flips this to Shipped on
merge). Approved + delivered via `minerva:propose-ship-auto` consensus panels — approach
v2 escalated to the user (iOS sourcing: flat `icon.png` over the unvalidatable Icon
Composer bundle), whole-proposal 3/3 after one revision round (prebuild gate added),
completion 3/3 with pixel-level independent verification.

## Goal

Replace the default Expo template icons with a custom "vital" brand mark across every
surface — iOS app icon, Android adaptive icon set, web favicon, Android splash glyph —
all derived from one checked-in master SVG.

## Why

The app builds and auto-submits to the App Store via EAS on every merge to `main`
(`.eas/workflows/build-and-submit-ios.yml`, orchestrated by
`.github/workflows/release-ios.yml`), and still ships Expo's placeholder branding: the
default `icon.png`, the Expo-symbol Icon Composer bundle at `assets/expo.icon/`, and the
template Android adaptive icons.

## Approach

**Design.** A bold white EKG/pulse trace ("vital" = vital signs) on a blue gradient
anchored on brand `#208AEF` — the existing splash `backgroundColor` in `app.json`.
Rejected alternatives: V-lettermark with integrated pulse (busier at favicon size),
heart + bolt glyph (generic, weakest tie to the name).

**Pipeline.** Master `assets/images/vital-icon.svg` is the single design source. A
checked-in `scripts/generate-icons.mjs` — run **locally only**, one-time manual
generation; the committed PNGs are the artifacts and CI never runs the script — installs
the rasterizer via `npm install --no-save @resvg/resvg-js@2.6.2` (pinned; never in
CI/deploy; `package.json` and `package-lock.json` must show zero diff, because this repo
was bitten by the npm/cli#4828 missing-optional-dep lockfile bug, commit `d16484e`).

**Extraction contract.** `vital-icon.svg` keeps `id="bg"` (gradient rect + defs) and
`id="pulse"` (white trace group) as direct children of
`<svg viewBox="0 0 1024 1024">`. The script extracts those elements by id and **fails
loudly** if either is missing, then composes per-surface SVG variants and rasterizes
them with resvg. Android foreground safe zone: glyph scaled into the central 676px box
(66% of 1024², 174px inset per side).

**iOS sourcing** (resolved via user escalation after panel deadlock): delete
`assets/expo.icon/` and the `ios.icon` key from `app.json`; iOS falls back to the flat
top-level 1024×1024 `icon.png`, which `expo prebuild` turns into the standard asset
catalog at EAS build time. We ship a standard flat PNG — no claims about OS glass
treatment. This makes the locally-validated PNG pipeline the actual deliverable for
every platform.

**Android adaptive layering.** The blue gradient lives in the **background** layer
(`android-icon-background.png`); the foreground is the white trace only, on transparent
— a legibility fix, since a white glyph over the previous near-white `#E6F4FE`
`backgroundColor` would have been invisible. All blues standardize on `#208AEF`.

## Success criteria

1. `assets/images/vital-icon.svg` checked in as the single design source, honoring the
   id contract above.
2. Generated and committed (intentional dimension changes from the template assets are
   noted inline):
   - `assets/images/icon.png` — 1024², opaque full composition (gradient + trace).
   - `assets/images/android-icon-background.png` — 1024² (was 512²), gradient only;
     this PNG (not the `backgroundColor` field) is the load-bearing carrier of the
     Android background design.
   - `assets/images/android-icon-foreground.png` — 1024² (was 512²), white trace within
     the central 676px safe zone, transparent elsewhere.
   - `assets/images/android-icon-monochrome.png` — 1024² (was 432²), trace silhouette,
     white on transparent.
   - `assets/images/favicon.png` — 48².
   - `assets/images/splash-icon.png` — 512², white trace on transparent (intentional
     aspect change from 228×213; near-full-bleed glyph since `imageWidth: 76` dp scales
     the whole source image down).
3. `app.json`: `ios.icon` key removed; `assets/expo.icon/` deleted;
   `android.adaptiveIcon.backgroundColor` changed `#E6F4FE` → `#208AEF` (flat fallback
   only — see criterion 2 for the load-bearing background PNG); all other asset paths
   unchanged.
4. `scripts/generate-icons.mjs` checked in with a header comment documenting local-only
   usage and the exact pinned install command.
5. Acceptance gates, all green before ship:
   - `package.json` / `package-lock.json` zero diff.
   - `npx expo config` parses.
   - `sips` confirms every dimension in criterion 2.
   - `npx expo prebuild -p ios --no-install --clean` succeeds and the generated
     (gitignored) ios project contains an `AppIcon.appiconset` populated from
     `icon.png` — exercising the actual CNG path EAS runs; generated native dirs are
     removed afterwards.
   - lint + tsc CI gates green.

## Open Questions

None — iOS sourcing was the open question and was resolved by the user (flat
`icon.png`).
