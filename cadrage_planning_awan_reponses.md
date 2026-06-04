# FORMULAIRE DE CADRAGE TECHNIQUE — MOTEUR DE PLANNING AWAN v5.0
**Réponses basées sur audit codebase — commit `c311efc` (main, 2026-06-04)**

---

## STRATE 1 : ARCHITECTURE DES DONNÉES & MODÈLE DE TEMPS

### Q1.1 — Logique de Récurrence (Sport & Nutrition)

- [x] **Modèle Virtuel — PARTIEL (pas de RRULE, mais pas de duplication physique non plus)**

**État actuel constaté :**

L'architecture existante est un **modèle hybride** :

- `ScheduleTask` (`src/data/schemas/planning/scheduleTask.ts`) = définition abstraite stockée **une seule fois** dans SQLite. Elle encode la récurrence via le champ `tags: ['recurring', 'every:7']` et des contraintes temporelles (`fixedStartMin`, `notBeforeMin`, `notAfterMin`, `durationMin`).
- `DaySchedule` (`src/data/schemas/planning/daySchedule.ts`) = résultat du scheduler pour **un jour donné**, écrit à la demande via `Planner.optimize(date)` (`src/modules/planning/api.ts:45`). Il contient uniquement une liste de `{taskId, startMin, endMin}`.

```typescript
// ScheduleTask — stockée une fois
{ id: "sport-session", title: "Muscu", durationMin: 75,
  fixedStartMin: 420, tags: ["recurring", "every:2"], ... }

// DaySchedule — générée par optimize(date)
{ date: "2026-06-04", slots: [{ taskId: "sport-session", startMin: 420, endMin: 495 }] }
```

**Il n'y a pas de RRULE iCal**, pas de génération automatique des 12 semaines à l'avance, et pas de duplication physique. Le scheduler est appelé à la demande pour chaque journée cible.

**Écart avec les deux options proposées :** Ce n'est ni un RRULE pur (pas de parsing RFC 5545), ni un modèle physique linéaire. C'est un scheduler jour-par-jour depuis des tâches-gabarits. Si une RRULE complète est souhaitée, elle nécessite un développement spécifique.

---

### Q1.2 — Indexation et Fuseaux Horaires

- [x] **Modèle Date Locale Simple — avec timestamp de génération**

**État actuel constaté :**

- `src/utils/date.ts` — `toDateString()` utilise **les composantes locales** (`getFullYear()`, `getMonth()`, `getDate()`), pas `toISOString()` (UTC). Corrigé délibérément pour éviter le bug de décalage de fuseau horaire.
- `DaySchedule.date` = `DateStringSchema` = `YYYY-MM-DD` local.
- `DaySchedule.generatedAt` = `TimestampSchema` = Unix ms (horodatage de génération, pas d'indexation métier).
- `ScheduleTask` ne contient **aucun timestamp** — uniquement des minutes-du-jour (0–1439).
- **Pas de colonne `timezone`** dans aucun schéma planning.

```typescript
// src/utils/date.ts — LOCAL, pas UTC
export const toDateString = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
```

**Implication :** Le modèle est robuste pour un usage mono-fuseau (un utilisateur sur son appareil). En cas de déplacement international, les dates locales s'adaptent automatiquement à l'horloge de l'appareil, ce qui est le comportement attendu pour un tracker personnel. Le modèle Pivot UTC n'apporterait de valeur que pour une app multi-utilisateurs ou avec synchronisation serveur — ni l'un ni l'autre n'est dans le scope AWAN.

---

## STRATE 2 : PERFORMANCE & FLUIDITÉ VISÉE (120 Hz)

### Q2.1 — Isolation des Traitants de Planning

- [x] **Calcul Synchrone — DETTE TECHNIQUE (pas de Web Worker)**

**État actuel constaté :**

```bash
grep -n "Worker" src/screens/PlanningScreen.tsx
# → (aucune sortie)
```

Les calculs sont tous synchrones dans le cycle React :

```typescript
// src/screens/PlanningScreen.tsx
const categories = useMemo(() => { ... }, [db]);          // L145
const monthlyCells = useMemo(() => { ... }, [selDate]);   // L245
```

`buildSchedule()` (`src/modules/planning/engine/greedy.ts`) est appelé dans `Planner.optimize()` de manière synchrone. Aucun Web Worker n'existe dans le projet (confirmé par audit précédent).

**Risque identifié :** Avec des plannings complexes (>50 tâches, contraintes de dépendances), `buildSchedule()` peut dépasser 8 ms et générer des drops de frames à 120 Hz. Seuil de danger : non atteint avec le seed actuel (<15 tâches), mais à anticiper pour une montée en charge.

---

### Q2.2 — Stratégie d'Affichage du Calendrier

- [x] **Pagination Standard — pas de virtualisation**

**État actuel constaté :**

```typescript
// src/screens/PlanningScreen.tsx
<ScrollView ...>  // L269 — vue journée
<ScrollView ...>  // L335 — vue hebdo
<ScrollView ...>  // L440 — vue mensuelle
```

La vue mensuelle utilise `monthlyCells = useMemo(...)` qui génère toutes les cellules du mois en mémoire. Pas de `FlatList` avec `windowSize`, `getItemLayout`, ou `removeClippedSubviews`. Le rendu est complet par bloc.

**Implication :** Pour un agenda standard (31 jours × N événements/jour), les `ScrollView` sont suffisants. Si la vue mensuelle affiche des miniatures détaillées avec beaucoup d'événements par jour, la virtualisation sera nécessaire pour maintenir 120 Hz. Dans l'état actuel, le risque est faible.

---

## STRATE 3 : ORCHESTRATION & SYMBIOSE APPLICATIVE (EVENTBUS)

### Q3.1 — Comportement Réactif du Système

**État actuel constaté :**

`Planner.optimize()` émet **uniquement** `planning.optimized` (L49). Aucun autre module ne réagit à cet événement dans le codebase.

| Action croisée | Statut | Preuve |
|---|---|---|
| **Mise à jour Coach Engine** | ❌ NON implémentée | `eventBus.on('planning.optimized', ...)` absent du Coach |
| **Ajustement des Quotas Nutrition** | ❌ NON implémentée | Aucun listener nutrition sur `planning.optimized` |
| **Historisation Anthropométrique** | ❌ NON implémentée | Aucun lien planning ↔ mesures |

À noter : depuis le sprint correctif (commit `566d4ae`), le sens inverse est câblé — les données métier déclenchent bien le Coach (`meal.logged` → Coach nutrition, etc.). Mais une modification du planning ne déclenche rien.

**Ce qui est nécessaire pour activer la symbiose :**
- `planning.optimized` → `Coach.run('sport', date)` si une séance est planifiée ce jour
- `planning.optimized` → recalcul des macros cibles si un repas planifié est modifié

---

### Q3.2 — Restauration des Événements Fantômes

- [x] **Corrigé — commit `566d4ae` (2026-06-04)**

`meal.logged`, `measurement.recorded` et `day.ended` sont désormais émis dans leurs stores respectifs (`useMealStore`, `useMeasurementStore`, `useWeightStore`, `useSleepStore`) et via le hook `useDayBoundary` pour la détection de minuit. Exigence satisfaite pour les modules existants.

**Restant à câbler côté planning** : si des repas ou séances sont créés/modifiés via l'écran Planning (et non via NutritionScreen/SportScreen), leurs événements `meal.logged` / `workout.completed` devront également y être émis.

---

## STRATE 4 : OBJECTIF FONCTIONNEL FINAL (L'EXPÉRIENCE USER)

### Q4.1 — Description de la Vue Planifiée (Dashboard Central)

**État actuel constaté dans `PlanningScreen.tsx` :**

**Entités fusionnées dans la timeline (L604–L625) :**
- Séances de sport (`workout` — depuis `useWorkoutStore`)
- Mesures anthropométriques (`measurement`)
- Événements libres (`event` — titre, heure, catégorie, couleur)

**Entités absentes de la timeline planning actuelle :**
- Repas / nutrition
- Prières (Islam)
- Eau / hydratation
- Sommeil
- Tâches du scheduler (`DaySchedule.slots`) — le scheduler existe mais son output n'est pas affiché dans la vue chronologique principale

**Logique d'interaction actuelle :**
- Clic → ouvre `EventModal` pour création/édition
- `uid()` généré client-side (offline-first confirmé, L424 et L863)
- Pas de geste swipe-to-validate implémenté

**Autonomie hors-ligne :**
- ✅ UUID généré client (`uid()` de `@/utils/id`)
- ✅ SQLite local (aucune dépendance réseau pour lecture/écriture)
- ✅ Fonctionnement complet sans réseau

---

## STRATE TECHNIQUE 5 : CONFIGURATION DU CO-PILOTAGE

### Q5.1 — Méthode de Validation des Jalons

**Recommandation technique basée sur l'état du code :**

Le moteur back (`Planner`, `DaySchedule`, `ScheduleTask`, `buildSchedule`) **existe déjà** avec schémas Zod, SQLite, EventBus partiellement câblé. Ce qui manque côté back :
- Réactions croisées `planning.optimized` → Coach/Nutrition
- Affichage des `DaySchedule.slots` dans la timeline

Le découpage strict **Jalon 1 Back → Jalon 2 Front** est techniquement approprié pour éviter de construire une UI sur un moteur encore instable. C'est la recommandation de l'architecture — mais la décision appartient à l'utilisateur.

---

## RÉSUMÉ EXÉCUTIF

| Question | Statut actuel | Verdict |
|---|---|---|
| Q1.1 Récurrence | Modèle hybride (gabarits + optimize par jour) | ⚠️ Virtuel partiel — pas de RRULE iCal |
| Q1.2 Fuseaux | Dates locales YYYY-MM-DD | ✅ Adapté usage mono-appareil |
| Q2.1 Isolation calculs | useMemo synchrone, pas de Worker | ⚠️ Dette acceptable < 50 tâches |
| Q2.2 Virtualisation | ScrollView plein, pas de FlatList windowed | ⚠️ Suffisant actuellement |
| Q3.1 Réactions croisées | Aucune réaction planning → autres modules | ❌ À implémenter |
| Q3.2 Événements fantômes | Corrigé commit 566d4ae | ✅ Résolu |
| Q4.1 Entités timeline | Sport + Mesures + Événements libres | ⚠️ Repas/Prières/Eau absents |
| Q5.1 Jalons | — | Recommandation Back puis Front |

---

*Réponses générées le 2026-06-04 par inspection directe du disque — commit `c311efc`, branch `main`.*
