export const L = {
  header: { latin: 'AWAN', arabic: 'أوان' },

  tabs: {
    planning: 'Planning',
    trajet:   'Trajet',
    sante:    'Santé',
    reglages: 'Réglages',
    islam:    'Vigie',
    analyse:  'Analyse',
  },

  common: {
    cancel:  'Annuler',
    save:    'Sauver',
    add:     'Ajouter',
    close:   'Fermer',
    finish:  'Terminer',
    delete:  'Supprimer',
    edit:    'Modifier',
    import:  'Importer',
    today:   "Aujourd'hui",
    tomorrow:'Demain',
    none:    'Aucun',
    all:     'Tout',
    validate:'Valider',
    import_json: 'Import JSON',
    done: 'Terminé',
    todo: 'À faire',
  },

  state: {
    wip:     'En travaux',
    loading: 'Chargement…',
    empty:   'Aucune donnée',
    error:   'Erreur',
    emptyList: 'Liste vide',
    nothingToday: 'Rien de prévu aujourd\'hui',
    noRoutine: 'Aucune routine',
    noEvent: 'Aucun événement',
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
      biometrics:'MESURES',
      islam:     'VIGIE SPIRITUELLE',
      tacticalDep: 'DEPART TACTIQUE',
      activeMission: 'MISSION ACTIVE',
      noMission: 'AUCUNE MISSION CHANTIER DÉTECTÉE',
      macrosP: 'P: 0g',
      macrosG: 'G: 0g',
      macrosL: 'L: 0g',
      macrosCal: '0 kcal / 2000',
      weekRemaining: '7 jours restants',
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
        delivery: 'en cours',
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

  a11y: {
    open_analyse: "Ouvrir l'analyse",
    home:         'Retour au tableau de bord',
    open_islam:   'Ouvrir le module Islam',
  },

  planning: {
    title: 'Planning',
    addEvent: '+ Événement',
    addRoutine: '+ Routine',
    routine: 'Routine',
    event: 'Événement',
    time: 'Heure (HH:MM)',
    notify: 'Rappel',
    category: 'Catégorie',
    editRoutine: 'Modifier la routine',
    editPrompt: 'Cette modification concerne-t-elle uniquement cet événement, ou toutes les occurrences de cette routine ?',
    onlyThis: 'Uniquement cet événement',
    allOccurrences: 'Toutes les occurrences',
  },

  tasks: {
    title: 'Tâches',
    new: 'Nouvelle tâche',
    allCategories: 'Toutes catégories',
    goals: 'OBJECTIFS & FOCUS',
  },

  analyse: {
    title: 'Analyse',
    perf: 'Suivi de tes performances',
    active: 'Activités',
    rest: 'Repos',
    noSess: 'Aucune séance sur cette période',
    lastMsr: 'Dernières mesures',
    noMsr: 'Aucune mesure enregistrée',
    fatMass: 'Masse Grasse',
    totalToday: "Total aujourd'hui",
  },

  mensuration: {
    title: 'MENSURATIONS',
    weight: 'POIDS (KG)',
    bpm: 'BPM REPOS',
    fat: 'GRAS %',
    mapping: 'MAPPING ANATOMIQUE',
    touch: 'TOUCHEZ UNE ZONE POUR SAISIR',
    caliper: 'PINCE ADIPIQUE (WGER)',
    man: 'HOMME',
    woman: 'FEMME',
    age: 'ÂGE :',
    history: 'HISTORIQUE RÉCENT',
    circ: 'CIRCONFÉRENCE EN CM',
    noData: 'Aucune donnée anthropométrique',
    id: 'ID 0BD',
  },

  sport: {
    muscu: 'Musculation',
    createFirst: 'Créer ma première routine',
    newRoutine: 'Nouvelle Routine',
    addExoBelow: 'Ajoute des exercices ci-dessous pour composer ta séance.',
    addFromLib: 'Ajouter un exercice de la bibliothèque',
    lib: 'Bibliothèque',
    noExo: 'Aucun exercice trouvé',
    set: 'SÉRIE',
    weight: 'POIDS (kg)',
    reps: 'REPS',
    addSet: '+ AJOUTER UNE SÉRIE',
    abort: 'Abandonner la séance',
    history: 'Historique',
    noSess: 'Aucune séance enregistrée',
    source: 'Source: wger.de',
  },

  settings: {
    title: 'RÉGLAGES SYSTÈME',
    api: 'RELAIS DE CALCUL (ORS)',
    orsKey: 'CLÉ API OPENROUTESERVICE',
    keyStored: 'Clé stockée localement dans le coffre-fort.',
    jit: "FACTEUR D'ANTICIPATION (JIT)",
    catMat: 'MATRICE DES CATÉGORIES',
    deployCat: 'DÉPLOYER LA CATÉGORIE',
    vault: 'COFFRE-FORT & INTRAÇABILITÉ',
    shield: 'BOUCLIER DE SOUVERAINETÉ (ACTIF)',
    sandboxed: "Cette application fonctionne en isolation stricte (Sandboxed). Les journaux (logs) sont automatiquement purgés après 24h pour garantir une intraçabilité maximale.",
    moEngine: 'MO ENGINE',
    purgeCache: 'PURGER TOUT LE CACHE (GPS/ADRESSES)',
    lock: 'VERROUILLER LE SYSTÈME',
  },

  islamSystem: {
    core: 'AWAN SPIRITUAL CORE',
    vigie: 'VIGIE SPIRITUELLE',
    chrono: 'CHRONOLOGIE DES PRIÈRES',
    next: 'PROCHAINE',
    qibla: 'ORIENTATION QIBLA',
    magneto: 'BASÉ SUR LE MAGNÉTOMÈTRE LOCAL',
    align: "ALIGNER L'APPAREIL VERS LE NORD POUR CALCULER",
    langUnit: 'UNITÉ LINGUISTIQUE (ARABE)',
    fr: 'FRANÇAIS :',
    reveal: 'RÉVÉLER TRADUCTION',
    srcNotFound: "SOURCE '1.json' INTROUVABLE",
    localOnly: 'DONEES LOCALES UNIAQUEMENT - AUCUN CLOUD',
  },

  map: {
    netSec: 'NETWORK: SECURE',
    mission: 'MISSION CARTOGRAPHIE',
    pos: 'POSITION ACTUELLE',
    addPlan: 'AJOUTER AU PLAN',
    acq: 'ACQUISITION DE COORDONNÉES',
    plan: 'PLAN DE ROUTE OPÉRATIONNEL',
    totalTime: 'MINUTAGE TOTAL',
    km: 'KILOMÉTRAGE',
    offline: 'API OFFLINE: EST. LOCALE UNIQUEMENT',
    calcTrek: 'CALCULER ITINÉRAIRE TREK',
    refTrajet: 'REF: TRAJET POS',
  }

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
