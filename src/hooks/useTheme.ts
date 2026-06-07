import { useEffect } from 'react';
import { Platform } from 'react-native';
import { setStatusBarBackgroundColor, setStatusBarStyle } from 'expo-status-bar';
import { useAppStore } from '@/data/store/appStore';
import * as lightTokens from '../constants/light';
import * as darkTokens from '../constants/dark';
import * as blackTokens from '../constants/black';

export type ThemeMode = 'light' | 'dark' | 'black';

export interface AwanTheme {
  bg: string;
  surface: string;
  title: string;
  selected: string;
  text: string;
  mute: string;
  danger: string;
  palette: string[];
  /** rgba(255,255,255,0.05) — fixed */
  surfaceDim: string;
  /** Stroke color relative to theme */
  border: string;
  borderSoft: string;
  /** rgba(0,0,0,0.85) — fixed */
  overlay: string;
  /** rgba(0,0,0,0.92) — fixed */
  overlayDeep: string;
  statusOk: string;
  statusWarn: string;
  statusInfo: string;
  /** = selected (gold) */
  statusSpirit: string;
}

function buildTheme(mode: ThemeMode): AwanTheme {
  let src: any;
  let suffix: string;
  if (mode === 'dark') {
    src = darkTokens; suffix = 'Dark';
  } else if (mode === 'black') {
    src = blackTokens; suffix = 'Black';
  } else {
    src = lightTokens; suffix = 'Light';
  }
  const isLight = mode === 'light';
  const selected = src[`UiSelected${suffix}`] as string;
  return {
    bg:       src[`UiBg${suffix}`],
    surface:  src[`UiSurface${suffix}`],
    title:    src[`UiTitle${suffix}`],
    selected,
    text:     src[`UiText${suffix}`],
    mute:     src[`UiMute${suffix}`],
    danger:   src[`UiDanger${suffix}`],
    palette: [
      src.Palette0, src.Palette1, src.Palette2, src.Palette3, src.Palette4,
      src.Palette5, src.Palette6, src.Palette7, src.Palette8, src.Palette9,
    ],
    surfaceDim:  'rgba(255,255,255,0.05)',
    border:      isLight ? 'rgba(26,26,26,0.18)'  : 'rgba(237,232,226,0.18)',
    borderSoft:  isLight ? 'rgba(26,26,26,0.10)'  : 'rgba(237,232,226,0.10)',
    overlay:     'rgba(0,0,0,0.85)',
    overlayDeep: 'rgba(0,0,0,0.92)',
    statusOk:    '#4ECDC4',
    statusWarn:  '#FFE66D',
    statusInfo:  '#4FACFE',
    statusSpirit: selected,
  };
}

const LIGHT = buildTheme('light');
const DARK  = buildTheme('dark');
const BLACK = buildTheme('black');

export function useTheme(): AwanTheme {
  const theme = useAppStore((s) => s.theme);
  if (theme === 'dark')  return DARK;
  if (theme === 'black') return BLACK;
  return LIGHT;
}

export function useThemeMode(): ThemeMode {
  return useAppStore((s) => s.theme);
}

export function useColorMap(): Record<string, string> {
  return {};
}

export function useThemeSync(): void {
  const theme = useTheme();
  const mode = useThemeMode();

  useEffect(() => {
    // CSS custom properties — web uniquement
    if (Platform.OS === 'web') {
      const root = document.documentElement;
      root.style.setProperty('--color-awan-bg',            theme.bg);
      root.style.setProperty('--color-awan-surface',       theme.surface);
      root.style.setProperty('--color-awan-gold',          theme.selected);
      root.style.setProperty('--color-awan-tx',            theme.title);
      root.style.setProperty('--color-awan-tx-dim',        theme.text);
      root.style.setProperty('--color-awan-tx-mute',       theme.mute);
      root.style.setProperty('--color-awan-status-ok',     '#4ECDC4');
      root.style.setProperty('--color-awan-status-warn',   '#FFE66D');
      root.style.setProperty('--color-awan-status-info',   '#4FACFE');
      root.style.setProperty('--color-awan-status-error',  theme.danger);
      root.style.setProperty('--color-awan-status-spirit', theme.selected);
    }

    // StatusBar native — Android/iOS uniquement
    if (Platform.OS !== 'web') {
      setStatusBarBackgroundColor(theme.bg, true);
      setStatusBarStyle(mode === 'light' ? 'dark' : 'light');
    }
  }, [theme, mode]);
}
