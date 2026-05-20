// Symboles UI AWAN — toute occurrence inline (◆ ◇ → ← · …) DOIT pointer ici.
// Permet de retoucher l'identité visuelle ou de localiser sans chasser dans
// 30 fichiers.

export const SYMBOLS = {
  /** Toggle actif — losange plein */
  diamondFilled:  '◆',
  /** Toggle inactif — losange vide */
  diamondOutline: '◇',
  /** Flèche action en avant (CTA suivant) */
  arrowRight:     '→',
  /** Flèche retour (CTA précédent) */
  arrowLeft:      '←',
  /** Séparateur signature AWAN (badges, tags, headers) */
  bullet:         '·',
  /** Tendance haussière (poids, métriques) */
  trendUp:        '↑',
  /** Tendance baissière (poids, métriques) */
  trendDown:      '↓',
} as const;

export type SymbolKey = keyof typeof SYMBOLS;
