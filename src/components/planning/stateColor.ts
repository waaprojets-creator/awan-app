import type { AwanTheme } from '../../hooks/useTheme';
import type { LifeState } from '../../data/schemas/planning/dayState';

/** Couleur d'un état de vie — tokens design-system uniquement. */
export function stateColor(theme: AwanTheme, st: LifeState): string {
  switch (st) {
    case 'endormi':  return theme.statusInfo;
    case 'travail':  return theme.selected;
    case 'malade':   return theme.danger;
    case 'vacances': return theme.statusOk;
    case 'libre':    return theme.borderSoft;
  }
}

/** Opacité du calque d'état peint en fond du calendrier (tâches au premier plan). */
export const STATE_BG_OPACITY = 0.1;
