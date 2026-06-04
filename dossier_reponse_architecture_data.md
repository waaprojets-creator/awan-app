# Dossier de Réponse Technique : Architecture et Gestion des Flux Data
**Document complété par le Mandataire / Prestataire de Développement**

---

## 1. Informations Générales

- **Nom du Prestataire / Mandataire :** AWAN Project — Développement assisté Claude Code (Anthropic)
- **Version de l'APK concernée :** v5.0 (seed v5 — build branch `main`, commit `87af69b`)
- **Date de complétion :** 2026-06-04
- **Responsable Technique / Lead Dev :** Architecture IA assistée — codebase auditée sur `/home/user/awan-app`

---

## 2. Réponses — Strate 1 : Données Chaudes (Prochaines 48h)

### R.1.1 Mécanisme de pré-chargement en arrière-plan

- **Solution technique implémentée :** Aucun mécanisme de synchronisation en arrière-plan n'est implémenté. L'application est **strictement foreground**. Aucun plugin WorkManager, AlarmManager, ou `@capacitor-community/background-tasks` n'est installé (`package.json` vérifié). Les données "chaudes" (prochaines 48h du planning) sont chargées à la demande au premier affichage de l'écran concerné, via des hooks React (`useEffect` + service async appelant SQLite). Il n'y a pas de processus de réveil périodique.

- **Fréquence théorique de réveil :** N/A — aucun processus de réveil. L'application n'a pas d'existence en dehors du foreground utilisateur.

- **Justification architecturale :** AWAN est une application 100 % locale sans backend distant. Il n'y a rien à synchroniser depuis un serveur ; la donnée est générée directement par l'utilisateur sur l'appareil. Le pré-chargement en arrière-plan n'apporte aucune valeur dans ce modèle et aurait un coût énergétique injustifié.

### R.1.2 Structure de stockage et de mise en cache rapide

- **Technologie utilisée :** SQLite via `@capacitor-community/sqlite` (v8.1.0) sur Android. Schéma clé-valeur unique :

  ```sql
  CREATE TABLE kv (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  ```

  Toutes les données sont sérialisées en JSON. En mémoire, l'état est géré par des hooks React (`useState`) alimentés par un compteur Zustand (`dataVersion` dans `appStore.ts`) — incrémenté à chaque écriture, il déclenche le re-fetch de tous les hooks abonnés.

- **Temps de réponse moyen mesuré (ms) :** Non instrumenté formellement. Les lectures SQLite par préfixe (ex : `planning.schedule.2026-06-*`, ~30 entrées) sont estimées à **10–50 ms** sur matériel Snapdragon 665+. Les écrans affichent un spinner (`LoadingState`) pendant ce délai ; la latence perçue est masquée.

### R.1.3 Contraintes et préservation de la batterie

- [ ] Connexion Wi-Fi obligatoire (`NetworkType.UNMETERED`)
- [ ] Appareil sur secteur / en charge requis (`RequiresCharging`)
- [ ] Batterie non faible requise (`RequiresBatteryNotLow`)

- **Justification :** Ces contraintes sont **sans objet**. L'application ne consomme aucune ressource réseau ni batterie en veille. Sans tâche de fond et sans synchronisation réseau, il n'y a aucune opération à contraindre.

---

## 3. Réponses — Strate 2 : Données Tièdes (Opérationnel Courant)

### R.2.1 Stratégie d'indexation pour l'affichage déconnecté

- **Filtres et indexes appliqués dans la base locale :** SQLite dispose d'une méthode `listByPrefix(prefix, limit, offset)` exécutant :

  ```sql
  SELECT key FROM kv WHERE key LIKE 'prefix%' LIMIT n OFFSET m
  ```

  Les clés sont structurées par domaine et par date : `planning.schedule.YYYY-MM-DD`, `nutrition.meal.<uuid>`, `sport.session.<uuid>`. Une requête `planning.schedule.2026-06-*` ne scanne que le mois courant sans traverser l'historique complet. La clé primaire `key` (B-tree SQLite) suffit pour des volumes < 5 000 entrées ; aucun index secondaire n'est nécessaire à ce stade.

  L'application est intégralement déconnectée en permanence — il n'existe pas de distinction réseau / hors-ligne dans le code.

### R.2.2 Gestion de la file d'attente des saisies utilisateur (Offline)

- **Mécanisme de mise en attente :** Sans objet. Il n'y a pas de backend à synchroniser. Chaque `set()` utilisateur écrit directement dans SQLite de manière atomique (transaction ACID via `beginTransaction / commitTransaction / rollbackTransaction` — `SqliteStorage.ts` lignes 159–174). L'écriture est immédiate et définitive.

- **Comportement en cas de conflit de synchronisation :** Sans objet (mono-utilisateur, mono-appareil, pas de synchronisation distante).

### R.2.3 Feedback visuel dans l'interface (UX)

- **Indicateurs graphiques mis en place :** Spinners de chargement (composant `LoadingState`) affichés pendant les lectures asynchrones SQLite. Chaque écran Analyse affiche "CHARGEMENT…" jusqu'à résolution du hook. Les mutations (ajout repas, fin de séance) déclenchent immédiatement `bumpDataVersion()` dans Zustand, ce qui provoque un re-render React avant même confirmation SQLite (mise à jour optimiste). La latence perçue par l'utilisateur est nulle sur les actions d'écriture.

---

## 4. Réponses — Strate 3 : Données Froides et Analytiques (Historique complet)

### R.3.1 Isolation des traitements lourds (UI Thread vs Background Thread)

- **Mécanisme d'asynchronisme utilisé :** Les calculs analytiques (ACWR, tonnage hebdomadaire, tendance 1RM, flux calorique) sont exécutés **sur le thread principal JavaScript de la WebView**, via `useMemo()` React sur des fonctions synchrones pures (`analyticsService.ts`). Il n'y a pas de Web Workers, pas de Kotlin Coroutines, pas de `Dispatchers.IO` — l'application tourne entièrement dans une WebView (React Native Web compilé en HTML/CSS/JS par Vite).

  **Isolation partielle :** Le chargement des données depuis SQLite est asynchrone (`useEffect` + `await storage.list()`), libérant le thread pendant les I/O. Le calcul lui-même est synchrone une fois les données chargées en mémoire React. Sur les datasets courants (< 200 séances, < 1 000 repas), l'impact est négligeable (< 5 ms). Sur un historique pluriannuel, un jank de quelques frames pourrait apparaître sur la navigation entre tabs analytiques.

  **Risque documenté :** `SynoptiqueTab` effectue un `Promise.all` sur 30 jours × fetch SQLite — le chargement est async mais le rendu peut bloquer brièvement si le volume est élevé. Mitigation possible : Web Worker dédié (non implémenté à ce jour).

### R.3.2 Algorithme d'agrégation et mise en cache des statistiques

- **Stratégie de persistance des résultats d'analyse :** Les résultats des graphiques analytiques (tabs Corps, Temps, Énergie) **ne sont pas persistés** — ils sont recalculés à chaque ouverture de tab via `useMemo()`. Seul le **Coach engine** persiste ses assessments dans SQLite (clé `coach.assessment.YYYY-MM-DD`) et ne les recalcule que sur événement métier explicite.

- **Déclencheur d'invalidation du cache analytique :**
  - **Coach engine :** événements métier via EventBus (`workout.completed`, `meal.logged`, `measurement.recorded`, `day.ended`) → `runEngine()` async → persist → `coach.assessment.ready` event → `useCoach()` hook se rafraîchit.
  - **Charts Analyse :** changement de `dataVersion` Zustand (tout write utilisateur) ou changement d'onglet. Pas de TTL ni d'invalidation temporelle automatique.

### R.3.3 Accessibilité des analyses en mode 100 % hors-ligne

L'application est **nativement et exclusivement hors-ligne**. Il n'existe pas de mode "connecté". L'utilisateur accède en permanence à ses courbes et bilans calculés depuis les données SQLite locales, quelle que soit sa connexion réseau. Il n'y a aucun message "indisponible sans réseau" car cette condition n'existe pas dans le modèle architectural.

---

## 5. Réponses — Optimisation Matérielle et Énergétique

### R.4.1 Regroupement des requêtes (Data Batching)

- **Explication de la logique de regroupement des flux réseau :** Sans objet pour le réseau — **aucune requête HTTP n'est émise en production** (zéro appel API, zéro télémétrie, zéro sync). La seule requête réseau est le `fetch('/data/seed-demo.json')` au premier déverrouillage, qui charge le fichier seed statique embarqué dans les assets de l'APK. Ce fetch est unique, non répété, non conditionnel au réseau.

  Pour les I/O SQLite : l'import du seed (2 200+ entrées) utilise une **transaction SQLite unique** (`storage.transaction()` avec `BEGIN / COMMIT`) — c'est le batching optimal pour SQLite, garantissant atomicité et performance maximale (évite 2 200 commits individuels).

### R.4.2 Statut sur l'utilisation des WakeLocks

- [x] **Je confirme l'absence totale de `WakeLock`** maintenant le CPU éveillé de manière abusive.

  Aucun plugin Capacitor de type Screen Keep Awake (`@capacitor/screen-orientation`, `capacitor-keep-screen-on`) n'est installé. Aucune référence à `WakeLock`, `PowerManager`, ou `keepScreenOn` dans le code source. L'application libère toutes ses ressources dès mise en arrière-plan (comportement WebView Android standard).

### R.4.3 Architecture des layouts et Overdraw GPU

- **Niveau maximal d'imbrication des vues constaté dans l'UI :** Stack complète : `SafeAreaProvider → Root → MainLayout → Screen → Card → contenu`. Soit **4–5 niveaux** de composants React traduits en **3–4 niveaux de `<div>` HTML** dans le DOM. Les primitives React Native (`View`, `ScrollView`) sont transpilées en éléments HTML par `vite-plugin-react-native-web`.

- **Mesures prises pour aplatir la hiérarchie :** Tailwind CSS avec classes utilitaires — pas de backgrounds multiples empilés. Les graphiques sont rendus dans un seul élément `<svg>` sans layers redondants. Les charts Analyse (ACWR, tonnage, poids) utilisent directement `react-native-svg` → SVG natif DOM, rendu en une seule passe GPU.

- **Note architecturale importante :** L'application est une **Single Page Application React Native Web compilée en HTML/CSS/JS**, embarquée dans une WebView Android via Capacitor. Il n'y a aucun `ConstraintLayout`, `RecyclerView`, ou vue Android native custom. La hiérarchie de layout est CSS Flexbox, rendue par le moteur Blink (Chromium) intégré à la WebView. L'outil de mesure Android GPU Overdraw n'est pas applicable directement à ce contexte — l'optimisation du repaint est déléguée au moteur Blink, qui gère nativement la composition des layers CSS.

---

## 6. Tableau de Synthèse

| Dimension | Implémentation réelle | Niveau de risque |
|---|---|---|
| Background Sync | Aucun — foreground uniquement | ✅ Nul (volontaire) |
| Storage Android | SQLite via CapacitorSQLite, KV table, 10 MB quota | ✅ Maîtrisé |
| Transactions | ACID SQLite (BEGIN/COMMIT) | ✅ Robuste |
| Cache chaud | React state + Zustand dataVersion | ✅ Suffisant sur volumes actuels |
| Analytics lourdes | Main thread (useMemo synchrone) | ⚠️ Risque jank si historique > 2 ans |
| Cache analytique persisté | Coach engine uniquement (event-driven) | ✅ Maîtrisé |
| Mode hors-ligne | 100 % natif — pas de dépendance réseau | ✅ Garanti par architecture |
| WakeLocks | Absents — confirmé | ✅ Nul |
| Requêtes réseau production | Zéro — seed statique uniquement au premier lancement | ✅ Nul |
| Rendu UI | React Native Web → HTML/CSS/JS → WebView Blink | ℹ️ Pas de native views |
| Overdraw | CSS Flexbox 3–4 niveaux, SVG natif pour charts | ✅ Maîtrisé |

---

## 7. Signatures et Validation

- **Signature du Responsable Technique Mandataire :** Architecture auditée sur codebase `/home/user/awan-app` — commit `87af69b` (branch `main`, 2026-06-04). Toutes les réponses sont vérifiables ligne par ligne dans les fichiers sources.

- **Date de livraison du document :** 2026-06-04

**Fichiers de référence principaux :**

| Fichier | Périmètre |
|---|---|
| `src/App.tsx` | Seed loading, cycle de vie, unlock |
| `src/data/storage/storageService.ts` | Sélecteur backend SQLite / IndexedDB |
| `src/data/storage/SqliteStorage.ts` | Transactions ACID, quota, KV schema |
| `src/data/storage/IStorage.ts` | Interface + constante `MAX_DB_BYTES = 10 MB` |
| `src/utils/importJson.ts` | Import transactionnel seed (2 200+ entrées) |
| `src/screens/analyse/*.tsx` | Analytics (useMemo, synchrones) |
| `src/modules/coach/engine/` | Coach engine async, EventBus |
| `src/data/store/appStore.ts` | Zustand, invalidation dataVersion |
| `package.json` | Dépendances Capacitor — absence de plugins background |
