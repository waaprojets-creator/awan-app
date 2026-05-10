export interface HalalAuditResult {
  status: 'halal' | 'douteux' | 'haram';
  message: string;
  flagged: string[];
}

const HARAM_KEYWORDS = [
  'porc', 'cochon', 'lard', 'bacon', 'jambon', 'prosciutto', 'chorizo',
  'saucisse de porc', 'rillettes', 'pancetta', 'boudin noir', 'saindoux',
  'alcool', 'ethanol', 'éthanol', 'vin', 'bière', 'biere', 'cidre',
  'rhum', 'whisky', 'vodka', 'gin', 'tequila', 'liqueur', 'champagne',
  'prosecco', 'sake', 'mirin', 'extract de vanille',
  'sang', 'blood',
  'e120', 'carmin', 'cochenille',
  'l-cystéine de porc', 'e920 porc',
];

const DOUTEUX_KEYWORDS = [
  'gélatine', 'gelatine', 'e441',
  'e471', 'e472', 'mono et diglycérides', 'mono-et-diglycérides',
  'présure', 'caillette',
  'arôme naturel', 'arome naturel', 'natural flavor',
  'e631', 'inosinate', 'e627', 'guanylate',
  'carmin', 'e120',
  'lactosérum', 'lactoserum',
];

function normalize(text: string): string {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export const LocalAIService = {
  auditPhase: (_entries?: unknown[], _kcal?: number, _tdee?: number): string =>
    'Coach en initialisation...',

  predictCollation: (_hours?: number): string => 'Données insuffisantes',

  generateZenSummary: (_data?: unknown, _kcal?: number, _tdee?: number): Promise<string> =>
    Promise.resolve('Analyse disponible après 7 jours de données.'),

  auditHalalIngredients(text?: string): HalalAuditResult {
    if (!text?.trim()) {
      return { status: 'halal', message: 'Aucun ingrédient à analyser.', flagged: [] };
    }

    const normalized = normalize(text);
    const flaggedHaram: string[] = [];
    const flaggedDouteux: string[] = [];

    for (const kw of HARAM_KEYWORDS) {
      if (normalized.includes(normalize(kw))) {
        flaggedHaram.push(kw);
      }
    }

    if (flaggedHaram.length > 0) {
      return {
        status: 'haram',
        message: `Ingrédients interdits détectés : ${flaggedHaram.join(', ')}. Ce produit n'est pas conforme aux standards halal.`,
        flagged: flaggedHaram,
      };
    }

    for (const kw of DOUTEUX_KEYWORDS) {
      if (normalized.includes(normalize(kw))) {
        flaggedDouteux.push(kw);
      }
    }

    if (flaggedDouteux.length > 0) {
      return {
        status: 'douteux',
        message: `Ingrédients à vérifier : ${flaggedDouteux.join(', ')}. L'origine ou le procédé de fabrication doit être confirmé.`,
        flagged: flaggedDouteux,
      };
    }

    return {
      status: 'halal',
      message: 'Aucun ingrédient problématique détecté. Composition a priori conforme.',
      flagged: [],
    };
  },
};
