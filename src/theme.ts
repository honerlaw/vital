import { StyleSheet, TextStyle } from 'react-native';

/**
 * VITAL — design tokens
 * Clean-room minimal aesthetic. Monochrome structure + single green accent.
 * No external styling library required. Import these into StyleSheet.create.
 */

export const colors = {
  // surfaces
  bg: '#FFFFFF',          // app background / cards
  // text
  ink: '#0A0A0A',         // primary text, structural marks
  body: '#5A5A5A',        // body copy / blurbs
  muted: '#9A9A9A',       // secondary labels
  faint: '#C9C9C9',       // tertiary / disabled
  // lines
  line: '#EDEDED',        // hairline dividers (lightest)
  line2: '#E0E0E0',       // default borders
  // accent — "true green". Marks ACTION + ACTIVE + DONE + LIVE only.
  accent: '#0D8348',      // white text on this = ~4.8:1 (WCAG AA)
  accentSoft: '#E4F5EC',  // tinted background for active tags
  onAccent: '#FFFFFF',
  onAccentLine: 'rgba(255,255,255,0.24)', // dividers ON an accent fill only (no text → WCAG N/A)
} as const;

// Spacing scale (px). Use these instead of ad-hoc numbers.
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
  '6xl': 68,
} as const;

export const layout = {
  screenPaddingX: 24,
  screenPaddingTop: 8,
  tabBarHeight: 64,
} as const;

export const radius = {
  xs: 4,   // tags, history check
  sm: 6,   // set chips
  md: 7,   // cards, buttons, hero block
  lg: 8,   // rest timer bar
} as const;

export const border = {
  hairline: StyleSheet.hairlineWidth, // light dividers (colors.line)
  thin: 1,                            // default borders (colors.line2)
} as const;

/**
 * Fonts. Loaded via @expo-google-fonts — each weight is its OWN family string.
 * Do NOT rely on fontWeight with custom fonts; pick the family.
 */
export const font = {
  archivoRegular: 'Archivo_400Regular',
  archivoMedium: 'Archivo_500Medium',
  archivoSemiBold: 'Archivo_600SemiBold',
  archivoBold: 'Archivo_700Bold',
  monoRegular: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

/**
 * Typography presets. letterSpacing is ABSOLUTE px in RN (not em) — already converted.
 * Apply a color at the call site or rely on the default baked in here.
 */
export const type = {
  // Archivo — headings & body
  screenTitle: {
    fontFamily: font.archivoSemiBold, fontSize: 32, lineHeight: 34,
    letterSpacing: -0.6, color: colors.ink,
  },
  displayDay: {
    fontFamily: font.archivoSemiBold, fontSize: 25, lineHeight: 27,
    letterSpacing: -0.3, color: colors.ink,
  },
  programTitle: {
    fontFamily: font.archivoSemiBold, fontSize: 23, lineHeight: 27,
    letterSpacing: -0.3, color: colors.ink,
  },
  exerciseName: {
    fontFamily: font.archivoSemiBold, fontSize: 17, lineHeight: 21, color: colors.ink,
  },
  body: {
    fontFamily: font.archivoRegular, fontSize: 15, lineHeight: 22, color: colors.body,
  },
  bodySub: {
    fontFamily: font.archivoRegular, fontSize: 14, lineHeight: 20, color: colors.muted,
  },

  // JetBrains Mono — labels, numbers, technical chrome
  label: {
    fontFamily: font.monoMedium, fontSize: 10, letterSpacing: 2.2,
    textTransform: 'uppercase', color: colors.muted,
  },
  statValue: {
    fontFamily: font.monoMedium, fontSize: 16, color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: font.monoRegular, fontSize: 9, letterSpacing: 1.6,
    textTransform: 'uppercase', color: colors.muted,
  },
  scheme: {
    fontFamily: font.monoRegular, fontSize: 11, letterSpacing: 0.6, color: colors.muted,
  },
  setValue: { fontFamily: font.monoMedium, fontSize: 15, color: colors.ink },
  setLabel: {
    fontFamily: font.monoMedium, fontSize: 9, letterSpacing: 1.0,
    textTransform: 'uppercase', color: colors.muted,
  },
  buttonLabel: {
    fontFamily: font.monoMedium, fontSize: 12, letterSpacing: 1.9,
    textTransform: 'uppercase', color: colors.onAccent,
  },
  progressCount: {
    fontFamily: font.monoMedium, fontSize: 11, color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  restTime: {
    fontFamily: font.monoBold, fontSize: 22, color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  restLabel: {
    fontFamily: font.monoMedium, fontSize: 10, letterSpacing: 2.0,
    textTransform: 'uppercase', color: colors.muted,
  },
  tabLabel: {
    fontFamily: font.monoMedium, fontSize: 9, letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  rowWhen: {
    fontFamily: font.monoMedium, fontSize: 11, letterSpacing: 1.1,
    textTransform: 'uppercase', color: colors.muted,
  },
  historyDate: {
    fontFamily: font.monoRegular, fontSize: 11, letterSpacing: 0.9, color: colors.muted,
  },
  backLink: {
    fontFamily: font.monoMedium, fontSize: 11, letterSpacing: 1.5,
    textTransform: 'uppercase', color: colors.muted,
  },
  tag: {
    fontFamily: font.monoMedium, fontSize: 9, letterSpacing: 1.6,
    textTransform: 'uppercase', color: colors.muted,
  },
} satisfies Record<string, TextStyle>;

export const theme = { colors, space, layout, radius, border, font, type };
export default theme;
