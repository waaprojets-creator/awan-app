import { StyleSheet } from 'react-native';
import { FontSans, FontMono } from '../constants/typography';

// ─── Échelle typographique (px absolus, source : index.css @theme) ────────────
export const Fs = {
  xxs:  7,
  xs:   8,
  sm:   9,
  md:   10,
  lg:   11,
  data: 22,
  body: 14,
  base: 16,
} as const;

// ─── Poids (string — compatible StyleSheet) ───────────────────────────────────
export const Fw = {
  mute:    '300' as const,
  body:    '400' as const,
  label:   '600' as const,
  value:   '700' as const,
  display: '900' as const,
};

// ─── Letter-spacing (px absolus = em × fontSize) ─────────────────────────────
// Formule : ls = ratio_em × fontSize_px
export const Ls = {
  xxs_02:  1.4,   // 0.2em × 7px
  xs_02:   1.6,   // 0.2em × 8px
  sm_02:   1.8,   // 0.2em × 9px
  sm_015:  1.35,  // 0.15em × 9px
  md_02:   2.0,   // 0.2em × 10px
  md_03:   3.0,   // 0.3em × 10px
  lg_02:   2.2,   // 0.2em × 11px
  body_005: 0.7,  // 0.05em × 14px
  body_033: 4.6,  // 0.33em × 14px
  neg:     -0.5,  // tracking-tighter
  tight:   -0.44, // -0.02em × 22px (data value)
} as const;

// ─── Line-heights (px absolus = ratio × fontSize) ────────────────────────────
export const Lh = {
  xxs:  11,  // 1.57 × 7
  xs:   12,  // 1.5 × 8
  sm:   14,  // 1.56 × 9
  md:   16,  // 1.6 × 10
  lg:   17,  // 1.55 × 11
  body: 22,  // 1.57 × 14
  data: 22,  // 1.0 × 22
  display: 80, // 1.0 × 80
} as const;

// ─── Radii (design AWAN = 0 partout) ──────────────────────────────────────────
export const Br = {
  none: 0,
  full: 9999,
} as const;

// ─── Espacements (scale x4 = Tailwind compatible) ─────────────────────────────
export const Sp = {
  0: 0, 0.5: 2, 1: 4, 1.5: 6, 2: 8, 3: 12, 4: 16,
  5: 20, 6: 24, 7: 28, 8: 32, 9: 36, 10: 40, 12: 48,
  14: 56, 16: 64,
} as const;

// ─── Couleurs semi-transparentes fixes ────────────────────────────────────────
export const Clr = {
  white5:   'rgba(255,255,255,0.05)',
  white8:   'rgba(255,255,255,0.08)',
  white10:  'rgba(255,255,255,0.10)',
  white15:  'rgba(255,255,255,0.15)',
  white20:  'rgba(255,255,255,0.20)',
  white40:  'rgba(255,255,255,0.40)',
  gold8:    'rgba(212,175,55,0.08)',
  gold10:   'rgba(212,175,55,0.10)',
  gold12:   'rgba(212,175,55,0.12)',
  gold20:   'rgba(212,175,55,0.20)',
  gold30:   'rgba(212,175,55,0.30)',
  border:   'rgba(237,232,226,0.18)',
  borderSoft:'rgba(237,232,226,0.10)',
  overlay:  'rgba(0,0,0,0.85)',
  overlayDeep:'rgba(0,0,0,0.92)',
  surfaceDim:'rgba(255,255,255,0.05)',
} as const;

// ─── Fragments de style réutilisables ─────────────────────────────────────────
// Usage : <View style={[T.card, { backgroundColor: theme.surface }]}>

export const T = StyleSheet.create({
  // awan-card : border + bg theme (bg injecté dynamiquement)
  card: {
    borderWidth: 1,
    borderRadius: Br.none,
    padding: Sp[5],
  },
  // awan-glass
  glass: {
    backgroundColor: Clr.white5,
    borderWidth: 1,
    borderColor: Clr.white10,
  },
  // awan-label (mono sm mute uppercase)
  label: {
    fontFamily: FontMono,
    fontSize: Fs.sm,
    fontWeight: Fw.value,
    textTransform: 'uppercase',
    letterSpacing: Ls.sm_02,
  },
  // awan-label-xxs
  labelXxs: {
    fontSize: Fs.xxs,
    fontWeight: Fw.display,
    textTransform: 'uppercase',
    letterSpacing: Ls.xxs_02,
  },
  // awan-label-xs
  labelXs: {
    fontSize: Fs.xs,
    fontWeight: Fw.display,
    textTransform: 'uppercase',
    letterSpacing: Ls.xs_02,
  },
  // awan-label-sm
  labelSm: {
    fontSize: Fs.sm,
    fontWeight: Fw.display,
    textTransform: 'uppercase',
    letterSpacing: Ls.sm_02,
  },
  // awan-label-md
  labelMd: {
    fontSize: Fs.md,
    fontWeight: Fw.display,
    textTransform: 'uppercase',
    letterSpacing: Ls.md_02,
  },
  // awan-label-lg
  labelLg: {
    fontSize: Fs.lg,
    fontWeight: Fw.display,
    textTransform: 'uppercase',
    letterSpacing: Ls.lg_02,
  },
  // awan-data-value
  dataValue: {
    fontFamily: FontMono,
    fontSize: Fs.data,
    fontWeight: Fw.value,
    letterSpacing: Ls.tight,
  },
  // awan-value (mono sm title)
  value: {
    fontFamily: FontMono,
    fontSize: Fs.body,
    fontWeight: Fw.body,
    letterSpacing: Ls.neg,
  },
  // Lignes séparatrices
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  col: {
    flexDirection: 'column',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
});
