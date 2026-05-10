import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import * as lightTokens from '../constants/light';
import * as darkTokens from '../constants/dark';

export type ThemeMode = 'light' | 'dark';

export interface AwanTheme {
  bg: string;
  surface: string;
  title: string;
  selected: string;
  text: string;
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
  const cfg = useAppStore((s: any) => s.cfg);
  return cfg?.theme === 'dark' ? DARK : LIGHT;
}

export function useThemeMode(): ThemeMode {
  const cfg = useAppStore((s: any) => s.cfg);
  return cfg?.theme === 'dark' ? 'dark' : 'light';
}

export function useColorMap(): Record<string, string> {
  const cfg = useAppStore((s: any) => s.cfg);
  return cfg?.colorMap || {};
}

export function useThemeSync(): void {
  const theme = useTheme();

  useEffect(() => {
    const root = document.documentElement;

    // Backgrounds & surfaces
    root.style.setProperty('--color-awan-bg', theme.bg);
    root.style.setProperty('--color-awan-bg-soft', theme.surface);
    root.style.setProperty('--color-awan-bg-card', theme.surface);
    root.style.setProperty('--color-awan-bg-highlight', theme.surface);

    // Selected (gold)
    root.style.setProperty('--color-awan-gold', theme.selected);
    root.style.setProperty('--color-awan-gold-active', theme.selected);

    // Typography
    root.style.setProperty('--color-awan-tx', theme.title);
    root.style.setProperty('--color-awan-tx-dim', theme.text);
    root.style.setProperty('--color-awan-tx-mute', theme.text);

    // Status (mapping selon décisions projet)
    root.style.setProperty('--color-awan-status-error', theme.danger);
    root.style.setProperty('--color-awan-status-warn', theme.danger);
    root.style.setProperty('--color-awan-status-ok', theme.title);
    root.style.setProperty('--color-awan-status-info', theme.text);
    root.style.setProperty('--color-awan-status-spirit', theme.selected);
  }, [theme]);
}
