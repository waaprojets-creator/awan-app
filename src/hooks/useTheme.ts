import { useEffect } from 'react';
import { useAppStore } from '@/data/store/appStore';
import * as lightTokens from '../constants/light';
import * as darkTokens from '../constants/dark';

export type ThemeMode = 'light' | 'dark';

export interface AwanTheme {
  bg: string;
  surface: string;
  title: string;
  selected: string;
  text: string;
  mute: string;
  danger: string;
  palette: string[];
}

function buildTheme(mode: ThemeMode): AwanTheme {
  const src: any = mode === 'dark' ? darkTokens : lightTokens;
  const suffix = mode === 'dark' ? 'Dark' : 'Light';
  return {
    bg:       src[`UiBg${suffix}`],
    surface:  src[`UiSurface${suffix}`],
    title:    src[`UiTitle${suffix}`],
    selected: src[`UiSelected${suffix}`],
    text:     src[`UiText${suffix}`],
    mute:     src[`UiMute${suffix}`],
    danger:   src[`UiDanger${suffix}`],
    palette: [
      src.Palette0, src.Palette1, src.Palette2, src.Palette3, src.Palette4,
      src.Palette5, src.Palette6, src.Palette7, src.Palette8, src.Palette9,
    ],
  };
}

const LIGHT = buildTheme('light');
const DARK = buildTheme('dark');

export function useTheme(): AwanTheme {
  const theme = useAppStore((s) => s.theme);
  return theme === 'dark' ? DARK : LIGHT;
}

export function useThemeMode(): ThemeMode {
  return useAppStore((s) => s.theme);
}

export function useColorMap(): Record<string, string> {
  return {};
}

export function useThemeSync(): void {
  const theme = useTheme();

  useEffect(() => {
    const root = document.documentElement;

    // Backgrounds
    root.style.setProperty('--color-awan-bg',      theme.bg);
    root.style.setProperty('--color-awan-surface',  theme.surface);

    // Gold
    root.style.setProperty('--color-awan-gold', theme.selected);

    // Typography
    root.style.setProperty('--color-awan-tx',           theme.title);
    root.style.setProperty('--color-awan-tx-dim',       theme.text);
    root.style.setProperty('--color-awan-tx-mute',      theme.mute);

    // Status sémantiques fixes (ne dépendent pas du mode)
    root.style.setProperty('--color-awan-status-ok',     '#4ECDC4');
    root.style.setProperty('--color-awan-status-warn',   '#FFE66D');
    root.style.setProperty('--color-awan-status-info',   '#4FACFE');
    // Status liés au thème
    root.style.setProperty('--color-awan-status-error',  theme.danger);
    root.style.setProperty('--color-awan-status-spirit', theme.selected);
  }, [theme]);
}
