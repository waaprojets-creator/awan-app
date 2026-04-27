/**
 * Tous les libellés affichés à l'utilisateur sont centralisés ici.
 *
 * Bénéfices :
 *  - Un seul fichier à modifier pour changer un texte partout dans l'app
 *  - Préparation à une éventuelle internationalisation (i18n)
 *  - Évite les fautes de frappe dispersées dans 10 fichiers
 *
 * Convention : organiser par contexte d'affichage (header, tabs, écrans, états).
 */

export const L = {
  // ---------------------------------------------------------------------------
  // Header universel (3 zones cliquables)
  // ---------------------------------------------------------------------------
  header: {
    latin:  'AWAN',
    arabic: 'أوان',
  },

  // ---------------------------------------------------------------------------
  // Onglets du bas
  // ---------------------------------------------------------------------------
  tabs: {
    planning: 'Planning',
    trajet:   'Trajet',
    sante:    'Santé',
    reglages: 'Réglages',
  },

  // ---------------------------------------------------------------------------
  // Écran Dashboard (accueil)
  // ---------------------------------------------------------------------------
  dash: {
    widgets: {
      planning: 'PLANNING DU JOUR',
      tasks:    'TÂCHES PROCHES',
      sport:    'SPORT',
      courses:  'COURSES',
      macros:   'MACROS DU JOUR',
      analyse:  'ANALYSE DU TEMPS',
    },
    tasks: {
      none:   'Aucune tâche en attente',
      late:   (n) => `${n} en retard`,
      today:  (n) => `${n} aujourd'hui`,
    },
  },

  // ---------------------------------------------------------------------------
  // Module Trajet
  // ---------------------------------------------------------------------------
  trajet: {
    title: 'TRAJET',
    desc:  "Calcul automatique des temps de trajet entre événements.",
    delivery: 'Intégration prévue Sprint 2 — 3.',
  },

  // ---------------------------------------------------------------------------
  // Module Santé (agrégateur)
  // ---------------------------------------------------------------------------
  sante: {
    title: 'SANTÉ',
    sub:   'Sport · Nutrition · Mesures',
    sections: {
      sport: {
        title:    'SPORT',
        desc:     'Suivi des séances, programmes, performances.',
        delivery: 'Sprint 2',
      },
      nutrition: {
        title:    'NUTRITION',
        desc:     'Macros du jour, repas, garde-manger.',
        delivery: 'Sprint 2',
      },
      mesures: {
        title:    'MESURES',
        desc:     'Poids, tour de taille, autres marqueurs corporels.',
        delivery: 'Sprint 2',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Module Islam
  // ---------------------------------------------------------------------------
  islam: {
    title:    'ISLAM',
    desc:     'Heures de prière, calendrier hégirien, rappels.',
    delivery: 'Intégration prévue Sprint 3.',
  },

  // ---------------------------------------------------------------------------
  // États communs (placeholders / loading / WIP)
  // ---------------------------------------------------------------------------
  state: {
    wip:        'En travaux',
    loading:    'Chargement…',
    empty:      'Aucune donnée',
    sprint2:    'Sprint 2',
    sprint3:    'Sprint 3',
    sprint4:    'Sprint 4',
  },

  // ---------------------------------------------------------------------------
  // Accessibilité (aria labels)
  // ---------------------------------------------------------------------------
  a11y: {
    open_analyse:   "Ouvrir l'analyse",
    home:           'Retour au tableau de bord',
    open_islam:     'Ouvrir le module Islam',
  },
};

/**
 * Format de date utilisé dans le bandeau du dashboard.
 * Ex: "LUNDI 27 AVRIL 2026"
 */
export const DATE_FORMAT_BANNER = {
  weekday: 'long',
  day:     'numeric',
  month:   'long',
  year:    'numeric',
};
