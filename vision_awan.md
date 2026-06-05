# AWAN — Vision & Ambitions
**Document de référence — 2026-06-04**

---

## La Devise

> **L'avenir s'esquisse en encrant aujourd'hui dans les lignes du passé.**

AWAN n'est pas un tracker. C'est un **système de capitalisation de soi** : chaque jour tracé devient une donnée, chaque donnée devient un signal, chaque signal oriente les décisions de demain. L'application existe pour qu'une seule chose devienne impossible : se raconter des histoires sur sa propre vie.

---

## L'Équation Fondamentale

Chaque semaine d'éveil compte **112 heures**. Ces heures se répartissent entre trois catégories :

```
T_éveil (112h) = T_production + T_friction + T_slack
```

| Catégorie | Définition | Cible |
|---|---|---|
| **T_production** | Travail à haute valeur, Deep Work, séances sport, apprentissage | Maximiser |
| **T_friction** | Déplacements, tâches administratives, attentes, tout ce qui ne produit rien | < 15h/semaine |
| **T_slack** | Repos choisi, famille, loisirs actifs — non passif | 20–30h/semaine |

**L'objectif terminal d'AWAN :** faire tendre T_friction vers zéro pour maximiser T_slack sans jamais sacrifier T_production.

**C_et (Complétude des intentions) :** ratio entre ce qui est planifié et ce qui est réellement accompli. Cible > 86,6%. Alerte si < 70%.

---

## Les 11 Dimensions du Système

AWAN surveille l'être humain comme un système complet, pas comme une collection de métriques isolées. Les dimensions sont classées par ordre de priorité d'implémentation.

### 1. Somatique — L'infrastructure biologique ✅
*Priorité absolue. Sans corps fonctionnel, tout le reste s'effondre.*

- **Nutrition** : 578 aliments, macros au gramme, 5 repas trackés/jour, score nutritionnel
- **Sport** : 873 exercices, séries au détail (poids × répétitions × RIR × RPE), tonnage, ACWR, périodisation
- **Sommeil** : durée, latence, réveils, score de récupération
- **Composition corporelle** : poids quotidien, mensurations (tour de taille, hanches, bras, cuisses), WHtR

*Gap actuel : HRV/VFC absente — le signal de récupération le plus objectif.*

### 2. Axiologique — Le filtre des décisions ✅
*La cohérence spirituelle islamique comme boussole, pas comme contrainte.*

- Suivi des 5 prières quotidiennes, qualité, ponctualité
- Journal spirituel
- Aucune décision d'envergure ne devrait contredire ce filtre

### 3. Temporelle — La matière première ❌ À construire
*Le temps est la seule ressource non-renouvelable. C'est l'objet du module Planning.*

- Tracker T_friction, T_production, T_slack, C_et chaque semaine
- Chaque tâche planifiée porte une `timeCategory` : `production | friction | slack | somatique`
- Le planning génère un bilan hebdomadaire : combien d'heures dans chaque catégorie ?
- **Règle d'arbitrage :** si Valeur Horaire Nette ÷ Coût de délégation > 1 → déléguer sans exception

### 4. Coach Systémique — Le diagnostic global ⚠️ Partiel
*26 règles par domaine existent. Zéro règle cross-dimensionnelle.*

Le Coach idéal ne dit pas "tu manques de protéines". Il dit :
> "Cette semaine : 4h de T_friction évitables, -15% de performance musculaire, adhérence nutrition 62%, dette de sommeil de 6h. Cause probable : charge allostatique trop élevée. Proposition : deload cette semaine + déléguer [tâche X]."

C'est un **coordinateur de système**, pas un agrégateur de métriques.

### 5. Sommeil Profond — La récupération glymphatique ⚠️ Superficiel
*Le score actuel (durée seule) est insuffisant.*

- Latence d'endormissement
- Nombre de réveils nocturnes
- Profondeur auto-estimée (0–10)
- Corrélation avec performance cognitive et physique du lendemain

### 6. Économétrique — La valeur du temps ❌ À construire
*Chaque heure a un prix. Le méconnaître est la plus grande source de friction.*

- **VHN (Valeur Horaire Nette)** : revenus nets ÷ heures productives réelles
- **Runway financier** : combien de mois d'autonomie disponibles
- **Calculateur de délégation** : si VHN > coût de délégation → automatiquement recommandé

### 7. Cognitive — La capacité de travail profond ❌ À construire
*Le Deep Work est le multiplicateur de tout le reste.*

- Blocs Deep Work sanctuarisés dans le planning (inviolables)
- Tracking du T_production réel vs nominal
- Optionnel : N-Back pour entraînement de la mémoire de travail

### 8. Conative — La force de l'intention ⚠️ Embryonnaire
*L'écart entre vouloir et faire est mesurable.*

- C_et (complétude) par domaine : sport, nutrition, planning
- Ego depletion : après combien de décisions la qualité des choix baisse-t-elle ?
- Latence à l'effort : combien de temps entre l'intention et l'action ?

*Actuellement : journal humeur 1–5 seulement.*

### 9. Environnementale — La charge sensorielle ❌ À construire
*L'environnement façonne le comportement autant que la volonté.*

- Audit semestriel : bruit, lumière, température, ergonomie, écrans
- Corrélations avec sommeil et performance

### 10. Sociométrique — Le capital relationnel ❌ À construire
*Les relations sont un actif qui se déprécie sans entretien.*

- Distribution de Dunbar : combien de relations dans chaque cercle (5 / 15 / 50 / 150) ?
- Capital de liens faibles (Granovetter / Chetty) : les opportunités viennent des liens distants
- Audit mensuel automatique

### 11. Transmission — L'héritage humain ❌ À construire
*Ce qui sera laissé derrière compte autant que ce qui est vécu.*

- Temps de présence qualitative avec les enfants (non-écran, non-distrait)
- Journal de transmission : valeurs, histoires, compétences transmises
- Capital humain documenté pour la génération suivante

---

## Le Module Planning — Cœur du Système

Le planning n'est pas un agenda. C'est **le moteur de l'équation T_friction → 0**.

### Ce qu'il fait aujourd'hui
- Tâches-gabarits réutilisables avec contraintes horaires (`fixedStartMin`, `notBeforeMin`, `notAfterMin`)
- Scheduler glouton qui génère un `DaySchedule` optimisé à la demande
- Champ `timeCategory` présent dans le schéma V3 (non encore exploité)

### Ce qu'il doit faire demain
1. **Catégoriser automatiquement** chaque bloc planifié (production / friction / slack / somatique)
2. **Calculer le bilan hebdomadaire** : heures par catégorie, C_et, ratio friction
3. **Alerter le Coach** quand T_friction > 15h ou C_et < 70%
4. **Proposer la délégation** quand VHN > coût de la tâche
5. **Sanctuariser** les blocs somatiques (sport, sommeil) et axiologiques (prières) contre toute friction
6. **Fusionner** dans la timeline : séances, repas, prières, eau, Deep Work, événements

---

## Ce Qu'AWAN N'Est Pas

- Pas un réseau social — aucune donnée ne quitte l'appareil
- Pas un coach IA — les conseils sont des règles logiques auditées (sources DOI/PMC)
- Pas une application de bien-être générique — c'est un outil de haute précision pour une seule personne

**Tout est local. Tout est privé. Tout est chiffrable.**

---

## État d'Avancement Résumé

| Module | État | Priorité |
|---|---|---|
| Nutrition | ✅ Opérationnel | — |
| Sport | ✅ Opérationnel | — |
| Islam (prières) | ✅ Opérationnel | — |
| Sommeil | ⚠️ Score superficiel | 5 |
| Coach (règles domaine) | ⚠️ 26 règles, 0 cross-domaine | 4 |
| Planning (moteur) | ⚠️ Scheduler existant, timeCategory non exploitée | 3 |
| Photos corporelles | ❌ Absent | Backlog v5 |
| Dimension Temporelle (T_friction tracking) | ❌ Absent | **3 — Priorité immédiate** |
| Dimension Économétrique (VHN) | ❌ Absent | 6 |
| Dimension Cognitive (Deep Work) | ❌ Absent | 7 |
| Dimension Conative | ❌ Embryonnaire | 8 |
| Dimensions 9–11 | ❌ Absent | Long terme |

---

*Document généré le 2026-06-04 — synthèse de CLAUDE.md, des questionnaires de cadrage v5.0 et de l'audit codebase commit `c311efc`.*
