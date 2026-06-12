# AWAN v5 — Backlog

Items reportés explicitement de v4 vers v5.

## Sources de données

- **Météo** — intégrer comme source pour corrélations cross-domaines (impact sur humeur, sommeil, performance, hydratation, adhérence séance). API offline-first à définir.

## Anthropométrie

- **Photos anthropométriques** — suivi visuel comparatif (face/profil/dos) avec timeline. Stockage local, jamais transmis.

## Nutrition

- **Code-barres** — scan produit pour ajout rapide au log repas, lookup catalogue local d'abord puis fallback OpenFoodFacts offline-cache.

## Sécurité

- **Chiffrement** — chiffrement at-rest de la base IndexedDB (clé dérivée du déverrouillage biométrique ou code PIN). Aucune donnée lisible si le device est compromis.
- **Biométrie** — déverrouillage app par empreinte / Face ID via Capacitor BiometricAuth. Fallback PIN à 6 chiffres. Verrouillage automatique après inactivité configurable.

## Analyse — précision des données (approximations résiduelles)

- **Durée de prière réelle** — TempsTab (`islamH`) calcule actuellement 15 min fixes par prière accomplie (`donePrayers × 0.25`). Ajouter un champ `durationMin?: number` dans `PrayerLogV2` (ou V3) pour stocker le temps réel passé. Brancher dans `computeDayLayers` et `computeDaySlots`.

- **Durée de repas réelle** — TempsTab (`nutritionH`) calcule 30 min fixes par repas (`meals.length × 0.5`). Ajouter un champ `durationMin?: number` dans `MealEntryV3`. Brancher dans `computeDayLayers` et `computeDaySlots`.

- **Trajets / GPS** — `trajetH = 0` dans TempsTab, calqué sur un futur silo `transport.trip.{date}.{ms}` alimenté par un tracker GPS passif (V5). Prévoir le schéma Zod en même temps que le silo.

- **Corrélations Wx1** — CorrelationTab reçoit une prop `history: MeasurementLatest[]` (anthropo.measurement) déclarée mais inutilisée. À exploiter pour des corrélations sport × composition corporelle (delta BF%, FFMI) quand le périmètre de Wx1 sera élargi.



- **Câbler l'`energyModel` dans le moteur greedy** — `energyModel.ts` (modèle chronobiologique evidence-based : pics 06–09h / 17–19h, creux post-déjeuner 11h30–15h ; sources Blatter & Cajochen 2007, Monk 2005) n'est aujourd'hui utilisé que pour **afficher** un diagnostic dans `PlanningScreen` (alignement tâches/pics). Il n'est **pas** branché dans `findBestSlot` (`engine/greedy.ts`), qui fait un simple earliest-fit. Brancher le score d'énergie dans le placement → deep work auto-placé sur le pic du matin, tâches à faible charge dans le creux de 14h. Remplace avantageusement les anciennes contraintes manuelles `notBeforeMin`/`notAfterMin` (supprimées en ScheduleTask V4) par une optimisation automatique et scientifique. Maille avec la priorité T_slack : placer la production cognitive dans les fenêtres de capacité maximale.
