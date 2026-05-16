// Textes lisibles pour chaque adviceKey du moteur Coach.
// Format : { titre court, conseil actionnable en français }

export interface AdviceText {
  title: string;
  advice: string;
}

const ADVICE_TEXTS: Record<string, AdviceText> = {
  // ── Sport ────────────────────────────────────────────────────────────────
  'coach.sport.no_workout_7d': {
    title: 'Inactivité 7 jours',
    advice: 'Aucun entraînement depuis 7 jours. Une séance légère de 20 min relancera la dynamique.',
  },
  'coach.sport.stagnation_charge': {
    title: 'Stagnation des charges',
    advice: 'Les charges moyennes n\'ont pas progressé depuis 3 semaines. Augmente de 2,5 kg sur les mouvements principaux.',
  },
  'coach.sport.fatigue_rpe': {
    title: 'Fatigue accumulée',
    advice: 'RPE moyen > 8 sur les dernières séances. Planifie une semaine de décharge à 60% des charges habituelles.',
  },
  'coach.sport.deconditioning': {
    title: 'Déconditionnement',
    advice: '14 jours sans entraînement — la force et l\'endurance commencent à décliner. Reprends progressivement.',
  },
  'coach.sport.insufficient_frequency': {
    title: 'Fréquence insuffisante',
    advice: 'Moins de 2 séances/semaine. L\'OMS recommande 150 min d\'activité modérée par semaine minimum.',
  },
  'coach.sport.consecutive_days': {
    title: 'Surcharge consécutive',
    advice: '5 jours d\'entraînement consécutifs détectés. Insère au moins 1 jour de repos pour la récupération musculaire.',
  },

  // ── Nutrition ─────────────────────────────────────────────────────────────
  'coach.nutrition.protein_low': {
    title: 'Protéines insuffisantes',
    advice: 'Apport protéique en dessous de 0,8 g/kg (minimum OMS). Ajoute une source de protéines à chaque repas.',
  },
  'coach.nutrition.deficit_agressif': {
    title: 'Déficit calorique extrême',
    advice: 'Moyenne < 1200 kcal/j sur 7 jours. Un déficit aussi agressif entraîne une perte musculaire et fatigue hormonale.',
  },
  'coach.nutrition.proteines_faibles': {
    title: 'Protéines basses (objectif perso)',
    advice: 'Apport protéique inférieur à ton objectif. Cible 1,6–2 g/kg pour préserver la masse musculaire.',
  },
  'coach.nutrition.tdee_surplus': {
    title: 'Surplus calorique élevé',
    advice: 'Moyenne > 2800 kcal/j. Un surplus modéré de 200–300 kcal est idéal pour une prise de masse propre.',
  },
  'coach.nutrition.meal_regularity': {
    title: 'Repas irréguliers',
    advice: 'Peu d\'entrées nutritionnelles détectées. Des repas réguliers stabilisent la glycémie et réduisent les fringales.',
  },

  // ── Anthropométrie ────────────────────────────────────────────────────────
  'coach.anthropo.weight_gain_trend': {
    title: 'Prise de poids progressive',
    advice: 'Tendance à la hausse sur 14 jours. Vérifie que ce gain correspond à un objectif de masse musculaire.',
  },
  'coach.anthropo.perte_rapide': {
    title: 'Perte de poids rapide',
    advice: 'Plus de 1 kg perdu en 7 jours. Une perte > 0,5–0,8 kg/sem entraîne une perte musculaire significative.',
  },
  'coach.anthropo.no_measurement_21d': {
    title: 'Pas de mesure récente',
    advice: 'Aucune pesée depuis 21 jours. La régularité des mesures est essentielle pour ajuster la nutrition et l\'entraînement.',
  },
  'coach.anthropo.weight_gain_rapid': {
    title: 'Prise de masse accélérée',
    advice: 'Gain > 1 kg/sem détecté sur 14 jours. Réduis légèrement le surplus calorique pour limiter la prise de graisse.',
  },

  'coach.sport.low_recovery': {
    title: 'Récupération insuffisante',
    advice: 'Score de récupération < 6/10. Réduis le volume de 30% aujourd\'hui et priorise le sommeil ce soir — protocole Halson 2014.',
  },
  'coach.sport.deload_due': {
    title: 'Décharge planifiée',
    advice: 'Semaine 6 du mésocycle atteinte. Réduis le volume de 40–50% tout en maintenant la fréquence pour une récupération optimale.',
  },

  // ── Nutrition ─────────────────────────────────────────────────────────────
  'coach.nutrition.fat_low': {
    title: 'Lipides insuffisants',
    advice: 'Apport lipidique < 74 g/j (0,9 g/kg). Les lipides sont essentiels à la production de testostérone — ajoute huile d\'olive, noix ou avocat. Source : Hamalainen 1984.',
  },

  // ── Anthropométrie ────────────────────────────────────────────────────────
  'coach.anthropo.wht_elevated': {
    title: 'WHtR élevé',
    advice: 'Rapport taille/hauteur ≥ 0,50. Cible < 0,50 pour réduire le risque cardiovasculaire. Source : Ashwell 2012.',
  },

  // ── Sommeil ───────────────────────────────────────────────────────────────
  'coach.sleep.short_avg': {
    title: 'Sommeil insuffisant',
    advice: 'Durée de sommeil moyenne < 7h. Le manque de sommeil réduit la synthèse protéique et les performances sportives.',
  },

  // ── Cross-module ──────────────────────────────────────────────────────────
  'coach.cross.sleep_workout': {
    title: 'Dette de sommeil',
    advice: 'Moyenne < 7h/nuit sur 14 jours. Le manque de sommeil réduit la MPS de 18% et la testostérone de 24% (Lamon 2021). Vise 7–9h par nuit pour une récupération optimale.',
  },
  'coach.cross.underfueled_training': {
    title: 'Entraînement sous-alimenté',
    advice: 'Apport calorique faible malgré des séances régulières. Augmente les glucides autour des entraînements.',
  },
};

export function getAdviceText(key: string): AdviceText {
  return ADVICE_TEXTS[key] ?? {
    title: key.split('.').pop()?.replace(/_/g, ' ') ?? key,
    advice: key,
  };
}

export function getRuleLabel(ruleId: string): string {
  const text = ADVICE_TEXTS[`coach.${ruleId}`] ?? ADVICE_TEXTS[ruleId];
  return text?.title ?? ruleId.replace(/_/g, ' ');
}
