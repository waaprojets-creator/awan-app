// Stub — sera remplacé par le module Coach local (Sprint F2+)
export const LocalAIService = {
  auditPhase: (_entries?: unknown[], _kcal?: number, _tdee?: number): string =>
    'Coach en initialisation...',
  predictCollation: (_hours?: number): string => 'Données insuffisantes',
  generateZenSummary: (_data?: unknown, _kcal?: number, _tdee?: number): Promise<string> =>
    Promise.resolve('Analyse disponible après 7 jours de données.'),
  auditHalalIngredients: (_text?: string): string =>
    'Analyse halal non disponible (module en développement).',
};
