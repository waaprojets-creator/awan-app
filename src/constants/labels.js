export const L = {
  header: { latin: 'AWAN', arabic: 'أوان' },

  tabs: {
    planning: 'Planning',
    trajet:   'Trajet',
    sante:    'Santé',
    reglages: 'Réglages',
  },

  dash: {
    widgets: {
      planning:  'PLANNING DU JOUR',
      tasks:     'TÂCHES PROCHES',
      trajet:    'PROCHAIN TRAJET',
      transport: 'MOYEN DE TRANSPORT',
      analyse:   'ANALYSE DU JOUR',
      sport:     'SPORT',
      courses:   'COURSES',
      macros:    'MACROS DU JOUR',
      week:      'CETTE SEMAINE',
    },
    tasks: {
      none:  'Aucune tâche en attente',
      late:  (n) => `${n} en retard`,
      today: (n) => `${n} aujourd'hui`,
    },
    trajet: {
      noEvent:  'Aucun trajet prévu',
      departIn: (mins) => `Départ dans ${mins} min`,
      duration: (mins) => `${mins} min`,
    },
    analyse: {
      total:      'Total occupé',
      free:       'Temps libre',
      tapDetails: 'Toucher pour le détail',
    },
    sport: {
      last: 'Dernière séance',
      next: 'Prochaine séance',
    },
    macros: {
      proteins: 'Protéines',
      carbs:    'Glucides',
      lipids:   'Lipides',
      kcal:     'Calories',
    },
    courses: {
      today:    "Aujourd'hui",
      tomorrow: 'Demain',
      after:    'Après-demain',
    },
    demo: 'données démo',
  },

  transport: {
    car:     { key: 'car',     label: 'Voiture' },
    moto:    { key: 'moto',    label: 'Moto' },
    bike:    { key: 'bike',    label: 'Vélo' },
    foot:    { key: 'foot',    label: 'À pied' },
    transit: { key: 'transit', label: 'Transports' },
  },

  trajet: {
    title:    'TRAJET',
    desc:     "Calcul automatique des temps de trajet entre événements.",
    delivery: 'Intégration prévue Sprint 2 — 3.',
  },

  sante: {
    title: 'SANTÉ',
    sub:   'Sport · Nutrition · Mesures',
    sections: {
      sport: {
        title: 'SPORT',
        desc: 'Suivi des séances, programmes, performances.',
        delivery: 'Sprint 2',
      },
      nutrition: {
        title: 'NUTRITION',
        desc: 'Macros du jour, repas, garde-manger.',
        delivery: 'Sprint 2',
      },
      mesures: {
        title: 'MESURES',
        desc: 'Poids, tour de taille, autres marqueurs corporels.',
        delivery: 'Sprint 2',
      },
    },
  },

  islam: {
    title:    'ISLAM',
    desc:     'Heures de prière, calendrier hégirien, rappels.',
    delivery: 'Intégration prévue Sprint 3.',
  },

  state: {
    wip:     'En travaux',
    loading: 'Chargement…',
    empty:   'Aucune donnée',
    sprint2: 'Sprint 2',
    sprint3: 'Sprint 3',
    sprint4: 'Sprint 4',
  },

  a11y: {
    open_analyse: "Ouvrir l'analyse",
    home:         'Retour au tableau de bord',
    open_islam:   'Ouvrir le module Islam',
  },
};

export const DATE_FORMAT_BANNER = {
  weekday: 'long',
  day:     'numeric',
  month:   'long',
  year:    'numeric',
};

export const TRANSPORT_OPTIONS = [
  L.transport.car,
  L.transport.moto,
  L.transport.bike,
  L.transport.foot,
  L.transport.transit,
];
