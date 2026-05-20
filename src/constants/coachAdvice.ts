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
    title: 'Repas faibles en énergie',
    advice: 'Moyenne < 500 kcal/repas sur 7 jours. Tes repas sont peu denses en énergie — augmente la portion ou ajoute des féculents/lipides pour atteindre tes besoins quotidiens.',
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
  // Gabbett 2016 (doi:10.1136/bjsports-2015-095788) : ACWR > 1.5 → risque blessure ×2
  'coach.sport.acwr_danger': {
    title: 'Charge d\'entraînement dangereuse',
    advice: 'Ratio charge aiguë/chronique > 1.5. Réduis le volume de 30% cette semaine. Zone optimale ACWR : 0,8–1,3 (Gabbett 2016).',
  },
  // Cheung 2003 (doi:10.1007/s00421-003-0879-y) : dommages musculaires max 24-48h post-séance
  'coach.sport.insufficient_rest_48h': {
    title: 'Récupération insuffisante (< 48h)',
    advice: '2+ séances en 48h détectées. Accorde 48h minimum entre séances du même groupe musculaire (DOMS pic 24-48h, Cheung 2003).',
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

  // Norton & Layman 2006 (doi:10.3945/jn.108.103382) : 25-40g protéines autour entraînement → MPS maximale
  'coach.nutrition.periworkout_protein': {
    title: 'Fenêtre anabolique sous-exploitée',
    advice: 'Moins de 30 g de protéines ce jour. Consomme 25–40 g de protéines dans les 2h autour de chaque séance pour maximiser la MPS (Norton & Layman 2006).',
  },
  // EFSA 2010 (efsa.europa.eu/doi/10.2903/j.efsa.2010.1462) : 25 g/j recommandé pour adultes
  'coach.nutrition.fiber_low': {
    title: 'Apport fibres insuffisant',
    advice: 'Fibres < 25 g/j. Les fibres régulent la glycémie, la satiété et la flore intestinale. Ajoute légumes, légumineuses, céréales complètes. Référence : EFSA 2010.',
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
