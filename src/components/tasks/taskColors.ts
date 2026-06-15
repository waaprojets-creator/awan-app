import type { AwanTheme } from '../../hooks/useTheme';
import { CATS } from '../../constants/theme';

/** Couleur d'un domaine : palette CATS si connu, sinon teinte stable de la palette. */
export function domainColor(theme: AwanTheme, domain: string | null): string {
  if (!domain) return theme.mute;
  const known = (CATS as Record<string, { l: string; c: string }>)[domain]?.c;
  if (known) return known;
  let h = 0;
  for (let i = 0; i < domain.length; i++) h = (h * 31 + domain.charCodeAt(i)) >>> 0;
  return theme.palette[h % theme.palette.length] ?? theme.selected;
}

/** Couleur de priorité : 1=urgent, 2=important, 3=souple. */
export function priorityColor(theme: AwanTheme, p: 1 | 2 | 3 | null): string {
  if (p === 1) return theme.danger;
  if (p === 2) return theme.statusWarn;
  if (p === 3) return theme.statusOk;
  return theme.mute;
}

export const PRIORITY_LABEL: Record<1 | 2 | 3, string> = { 1: 'P1', 2: 'P2', 3: 'P3' };

/** Initiales jours, index = Date.getDay() (0=dimanche … 6=samedi). */
export const DOW_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'] as const;
