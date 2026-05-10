export const fr = {
  common: {
    loading: 'Chargement...',
    error: 'Erreur',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    back: 'Retour',
    confirm: 'Confirmer',
    yes: 'Oui',
    no: 'Non',
  },
  nav: {
    dashboard: 'Accueil',
    planning: 'Planning',
    journal: 'Journal',
    trajet: 'Trajet',
    sante: 'Santé',
    reglages: 'Réglages',
  },
  sport: {
    title: 'Sport',
    routine: { title: 'Routine', new: 'Nouvelle routine', noData: 'Aucune routine' },
    workout: { active: 'Séance en cours', start: 'Démarrer', finish: 'Terminer' },
    set: { working: 'Working', warmup: 'Échauffement', drop: 'Drop', failure: 'Échec' },
    noSession: 'Aucune séance aujourd\'hui',
  },
  anthropo: {
    title: 'Anthropométrie',
    weight: 'Poids',
    measurements: 'Mesures',
    photos: 'Photos',
    noData: 'Aucune mesure enregistrée',
  },
  nutrition: {
    title: 'Nutrition',
    meal: { breakfast: 'Petit-déjeuner', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation' },
    macros: { kcal: 'kcal', protein: 'Prot.', carbs: 'Gluc.', fat: 'Lip.', fiber: 'Fibres' },
    noData: 'Aucun repas enregistré',
  },
  coach: {
    title: 'Coach',
    verdicts: {
      optimal: 'Optimal',
      undertrained: 'Sous-stimulé',
      excessive: 'Excessif',
      warning: 'Attention',
    },
  },
  planning: {
    title: 'Planning',
    optimize: 'Optimiser ma journée',
    noEvents: 'Aucun événement aujourd\'hui',
  },
  islam: {
    title: 'Islam',
    prayers: {
      fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
    },
  },
  settings: {
    title: 'Réglages',
    theme: 'Thème',
    dark: 'Sombre',
    light: 'Clair',
  },
} as const;

export type Translations = typeof fr;
export const useT = (): Translations => fr;
