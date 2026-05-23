# AWAN v4 — TODO

---

## W1 — Composition corporelle : hiérarchie temporelle & grain

### Origine
Spécification issue de l'analyse des widgets Python (widget_1.py).
Référence clinique : suivi N=1, protocole ISAK caliper, lissage MA_7.

---

### Règle des échelles

| Échelle | Fenêtre | Grain | Agrégation |
|---|---|---|---|
| **Court** | 7 → 31 jours | 1 point = 1 jour | Poids brut + MA_7 superposée |
| **Moyen** | 4 → 52 semaines | 1 point = 1 semaine | Moyenne hebdomadaire des jours |
| **Long** | > 52 semaines | 1 point = 1 mois | Moyenne mensuelle des semaines |

La transition entre échelles **recompute le grain** — ce n'est pas un zoom, c'est une agrégation. Le graphique change de nature à chaque passage de frontière.

---

### Court terme (7–31j, grain jour)

**Données affichées :**
- Poids brut quotidien (points ou ligne fine)
- MA_7 (moyenne mobile 7 jours) superposée en ligne principale — valide à partir de j7 uniquement
- Plis cutanés : **barres empilées** ponctuelles les jours de mesure uniquement (1×/semaine max), jamais interpolées
  - Chaque segment = 1 site ISAK individuel en mm (triceps, sous-scapulaire, biceps, supra-iliaque, abdominal, cuisse, mollet…)
  - Hauteur totale de la barre = `somme_plis` (agrégat de tous les sites)
  - Chaque site a sa propre couleur → lecture simultanée de la tendance globale ET de la répartition anatomique

**Contrainte :** En dessous de 7 jours, la MA_7 est incalculable — afficher le poids brut seul sans lissage.

**Question métier :** "La tendance de cette semaine est-elle correcte ?"

---

### Moyen terme (4–52 semaines, grain semaine)

**Données affichées :**
- 1 point poids = moyenne des 7 jours de la semaine (= valeur MA_7 de fin de semaine)
- 1 point plis = barre empilée ISAK de la semaine (protocole hebdomadaire respecté)
- Droite de régression linéaire sur la **somme totale** des plis → **vélocité de lipolyse** (mm/semaine)
- Régressions individuelles par site possibles → révèle quel dépôt lipidique fond en priorité
- R² de la régression affiché comme indicateur de confiance

**Contrainte :** Minimum 4 semaines pour que la pente soit statistiquement significative. En dessous, afficher "données insuffisantes" sur la régression.

**Question métier :** "Est-ce que je perds vraiment de la graisse, et à quelle vitesse ?"

---

### Long terme (> 52 semaines, grain mois)

**Données affichées :**
- 1 point poids = moyenne mensuelle des semaines
- 1 point plis = moyenne ou dernière mesure du mois
- Vélocité de lipolyse comparée mois par mois (évolution de la pente entre cycles)
- Détection d'adaptation métabolique : ralentissement de la vélocité à calories constantes → signal W5

**Question métier :** "Est-ce que ma stratégie tient dans la durée ou le métabolisme s'adapte-t-il ?"

---

### Règles graphiques

- **Ligne** pour les données continues lissées (poids MA_7, poids hebdo, poids mensuel)
- **Barres empilées** pour les plis ISAK — jamais reliées par une ligne, jamais interpolées
  - 1 segment par site ISAK, couleur distincte par site
  - Hauteur totale = somme des plis (agrégat lisible d'un coup d'œil)

- **Comportement des séparations par échelle :**
  - `court` (grain jour) : séparations entre segments **visibles** — lecture anatomique directe, chaque site identifiable
  - `moyen` (grain semaine) : segments **fusionnés** (barre monolithique), mais lignes pointillées horizontales reliant le niveau de chaque site d'une colonne à l'autre → suivi de trajectoire par site sans surcharge
  - `long` (grain mois) : même logique que moyen — barre monolithique + lignes pointillées inter-colonnes

- **Double axe Y** obligatoire quand poids (kg) et plis (mm) cohabitent — unités incompatibles
- Barres plis en **alpha réduit** (translucide) : la ligne poids domine visuellement
- **Droite de régression** superposée aux points plis en vue moyen/long terme
- **R²** affiché comme badge de confiance sur la régression

---

---

## W2 — Performance mécanique : hiérarchie temporelle & grain

### Origine
Spécification issue de l'analyse des widgets Python (widget_2.py).
Référence clinique : Brzycki 1RM, chaînes cinétiques Push/Pull/Legs, SMA_7 ± 2.5 kg.

---

### Règle des échelles

| Échelle | Fenêtre | Grain | Tonnage | 1RM |
|---|---|---|---|---|
| **Court** | 7 → 31 jours | 1 point = 1 séance | Barres empilées par chaîne (Push/Pull/Legs) | 1RM par chaîne affiché |
| **Moyen** | 4 → 52 semaines | 1 point = 1 semaine | Barre unique (tonnage total semaine) | Moyenne hebdo par chaîne → courbe pointillée |
| **Long** | > 52 semaines | 1 point = 1 mois | Barre unique (tonnage total mois) | Moyenne mensuelle par chaîne → courbe pointillée |

---

### Calcul 1RM — limite fiabilité

**Formule Brzycki :** `weight / (1.0278 − 0.0278 × reps)`

**Limite à 12 reps :** Sets avec `reps > 12` sont **ignorés** du calcul 1RM.
- À 12 reps : erreur ≈ ±5-8% — acceptable pour suivi de tendance
- Au-delà de 12 : erreur > 10% — signal devient du bruit
- Les sets > 12 reps contribuent au tonnage mais pas au 1RM estimé

---

### Court terme (7–31j, grain séance)

**Données affichées :**
- Tonnage : barres empilées par chaîne cinétique (Push / Pull / Legs) — 1 barre par séance, 3 segments
- 1RM par chaîne : affiché en indicateur discret (badge ou ligne horizontale) par séance
- Session budget : tonnage total toutes chaînes (KPI dominant, affiché en gros)
- Jours de repos : pas de barre (absence de donnée, pas de zéro)

**Question métier :** "Quelle est la répartition de mon travail par chaîne cette semaine ?"

---

### Moyen terme (4–52 semaines, grain semaine)

**Données affichées :**
- Tonnage : barre unique par semaine (chaînes fusionnées, breakdown disparu)
- 1RM par chaîne : **courbe en pointillé** superposée — moyenne hebdomadaire des sets ≤ 12 reps de la chaîne
- 3 courbes pointillées (Push / Pull / Legs) sur axe Y secondaire
- Zone de tolérance SMA_7 ± 2.5 kg visible comme bande autour de chaque courbe

**Question métier :** "Ma force progresse-t-elle semaine après semaine ?"

---

### Long terme (> 52 semaines, grain mois)

**Données affichées :**
- Tonnage : barre unique par mois
- 1RM par chaîne : **courbe en pointillé** — moyenne mensuelle des sets ≤ 12 reps
- Tendance de progression de force sur la durée (adaptation structurelle long terme)

**Question métier :** "Quelle est ma trajectoire de force sur l'année ?"

---

### Règles graphiques

- **Barres empilées** en court terme : Push / Pull / Legs avec couleur distincte par chaîne
- **Barre unique** en moyen/long terme : tonnage agrégé, chaînes fusionnées
- **1RM toujours visible** à toutes les échelles — par chaîne en court terme, en moyenne agrégée en moyen/long
- **Courbe en pointillé** pour le 1RM en moyen/long terme (axe Y secondaire) — scientifiquement justifié car c'est une estimation, pas une mesure directe
- **Zone SMA_7 ± 2.5 kg** autour de chaque courbe 1RM → bande de tolérance biologique
- **Session budget** (tonnage total) = KPI dominant, affiché en premier plan

---

### Implémentation à faire

- [ ] Filtre `reps <= 12` avant calcul Brzycki dans `workoutAnalysisService.ts`
- [ ] Calcul 1RM moyen par chaîne par séance, par semaine, par mois
- [ ] Agrégation tonnage : par chaîne (court) → total (moyen/long)
- [ ] Composant graphique W2 dans `SportScreen` onglet STATS
- [ ] Courbe pointillée 1RM sur axe Y secondaire en vue moyen/long
- [ ] Bande SMA_7 ± 2.5 kg autour de chaque courbe 1RM


---

---

## W3 — Physiologie / Récupération : hiérarchie temporelle & grain

### Origine
Spécification issue de l'analyse des widgets Python (widget_3.py).
Référence clinique : RMSSD (proxy SNC), ACWR Gabbett (ratio 7j/28j), seuil alerte 1.5.

---

### Règle des échelles

| Échelle | Fenêtre | Grain | Lecture |
|---|---|---|---|
| **Court** | 7 → 31 jours | 1 point = 1 jour | Jauge SNC + courbes 4 signaux |
| **Moyen** | 4 → 52 semaines | 1 point = 1 semaine | Courbe ACWR + tendance signaux hebdo |
| **Long** | > 52 semaines | 1 point = 1 mois | Tendance RMSSD mensuelle — adaptation nerveuse |

Même bornes temporelles que W2. Grain = jour (données quotidiennes) en court terme — contrairement à W2 (grain séance).

---

### Signaux source

5 signaux quotidiens :
- **RMSSD** (ms) — variabilité cardiaque, proxy état SNC
- **BPM repos** (bpm) — fréquence cardiaque au réveil, signal de charge nerveuse
- **Température corporelle** (°C) — prise au réveil (thermomètre sublingual/auriculaire) — signal précoce de surmenage ou infection
- **Sleep** (h) — durée de sommeil
- **Fatigue** (score subjectif) — ressenti auto-rapporté

---

### Court terme (7–31j, grain jour)

**Données affichées :**
- Courbe RMSSD quotidien (signal principal, axe Y gauche)
- Courbe BPM repos (axe Y secondaire ou superposé, inversé : BPM haut = mauvais)
- Courbe Sleep et Fatigue (axe Y tertiaire ou section dédiée)
- Jauge état SNC aujourd'hui (`tail(1)`) : snapshot du jour en lecture immédiate

**Règle de lecture :**
- RMSSD ↗ + BPM ↘ = récupération optimale
- RMSSD ↘ + BPM ↗ = dette nerveuse détectée

**Question métier :** "Mon système nerveux est-il prêt à encaisser la charge aujourd'hui ?"

---

### Moyen terme (4–52 semaines, grain semaine)

**Données affichées :**
- Courbe ACWR = `moyenne_mobile_7j_tonnage / moyenne_mobile_28j_tonnage` (calcul croisé avec W2)
  - Zone verte : 0.8 – 1.3 (charge optimale)
  - Zone orange : 1.3 – 1.5 (vigilance)
  - Zone rouge : > 1.5 → **alerte blessure (Gabbett)**
- RMSSD moyen hebdomadaire (tendance SNC sur la période)

**Contrainte :** ACWR nécessite au minimum 28 jours de données tonnage. En dessous → "données insuffisantes".

**Question métier :** "Est-ce que j'accumule trop vite par rapport à mon habitude ?"

---

### Long terme (> 52 semaines, grain mois)

**Données affichées :**
- RMSSD moyen mensuel → courbe de tendance d'adaptation nerveuse long terme
- Détection adaptation positive : RMSSD base qui remonte sur 3+ mois = amélioration SNC structurelle
- Corrélation avec W2 tonnage mensuel → lecture charge/récupération sur l'année

**Question métier :** "Mon système nerveux s'adapte-t-il à la charge sur la durée ?"

---

### Logique décision — `check_readiness`

Croisement mécanique (W2) × nerveux (W3) :
- `rmssd_3j_moy < rmssd_30j_moy` → dette nerveuse
- `tonnage_3j_moy > tonnage_30j_moy` → surcharge mécanique
- Les deux vrais → **WARNING : Deload recommandé**
- Sinon → **READY : Progression autorisée**

Signal affiché comme badge sur l'écran de démarrage de séance (Sport → PreWorkout).

---

### Règles graphiques

- **RMSSD** : courbe continue (ligne principale, axe Y gauche)
- **BPM repos** : courbe continue (axe Y secondaire, échelle inversée visuellement)
- **Sleep** et **Fatigue** : courbes secondaires ou section distincte (risque de surcharge visuelle si tout superposé)
- **ACWR** : courbe avec **bande de zones colorées** (vert/orange/rouge) en arrière-plan — jamais hardcode, via `cfg.colorMap`
- **Jauge SNC** : composant ponctuel (aujourd'hui uniquement), pas de série temporelle

---

### Implémentation à faire

- [ ] Schéma `RecoveryEntryV1` (rmssd, bpm_repos, temp_celsius, sleep, fatigue, date)
- [ ] Service `recoveryService.ts` : CRUD + calcul ACWR croisé avec `workoutService`
- [ ] Calcul `check_readiness()` dans `workoutAnalysisService.ts`
- [ ] Composant W3 dans `SportScreen` onglet STATS (ou onglet dédié RÉCUP)
- [ ] Courbe ACWR avec zones colorées (cfg.colorMap)
- [ ] Badge readiness dans `PreWorkout`


---

---

## W4 — Sécurité Biomécanique : Jauge ACWR (Gabbett 2016)

### Origine
Spécification issue de l'analyse des widgets Python (widget_4.py).
Référence clinique : ACWR Gabbett 2016, 4 zones de sécurité biomécanique.

---

### Logique

**Pas de hiérarchie temporelle classique.** W4 est un widget de sécurité à deux niveaux :
1. **Jauge aujourd'hui** — valeur ACWR courante + zone + recommandation actionnable
2. **Courbe 28–60 jours** — trajectoire de l'ACWR pour lire la dynamique (montée vs descente)

L'ACWR est un ratio glissant, pas une tendance d'adaptation — l'agréger en semaines ou mois perd le signal de sécurité. Pas de vue long terme.

---

### Calcul

```
daily_tonnage = tonnage W2 regroupé par jour (jours sans séance = 0)
acute  = daily_tonnage.rolling(7).mean()   — charge aiguë (fatigue immédiate)
chronic = daily_tonnage.rolling(28).mean() — charge chronique (capacité de base)
ACWR = acute / chronic
```

Nécessite **minimum 28 jours** de données tonnage pour que `chronic` soit calculable. En dessous → afficher "données insuffisantes (28j min requis)".

---

### 4 Zones de Gabbett (seuils stricts)

| ACWR | Zone | Recommandation |
|---|---|---|
| < 0.8 | **SOUS-ENTRAÎNEMENT** | Volume trop faible — augmentation sécurisée possible |
| 0.8 – 1.3 | **FITNESS** | Progression optimale — continuer |
| 1.3 – 1.5 | **ALERTE** | Surcharge — maintenir le volume, NE PAS augmenter |
| > 1.5 | **BLESSURE CRITIQUE** | Deload obligatoire − 20 à 30% du volume |

---

### Affichage — Niveau 1 : Jauge aujourd'hui

- Valeur ACWR arrondie à 2 décimales (ex. `1.42`)
- Zone colorée via `cfg.colorMap` (jamais hardcodé) :
  - Sous-entraînement → `var(--color-awan-tx-mute)`
  - Fitness → `var(--color-awan-status-ok)`
  - Alerte → `var(--color-awan-status-warn)`
  - Blessure critique → `var(--color-awan-status-error)`
- Texte recommandation en dessous (court, actionnable)
- **Badge intégré dans `PreWorkout`** — visible avant chaque démarrage de séance

---

### Affichage — Niveau 2 : Courbe 28–60 jours

- Courbe ACWR quotidienne sur la fenêtre 28–60 jours
- 4 bandes de zones en arrière-plan (fill horizontal) — mêmes couleurs que la jauge
- Ligne horizontale pointillée à 0.8, 1.3 et 1.5 (seuils de transition)
- Pas d'axe Y secondaire — l'ACWR est l'unique signal de ce graphique
- La courbe révèle la trajectoire : montée vers 1.5 = danger croissant / descente = récupération

---

### Règles graphiques

- Zone FITNESS = couleur dominante en arrière-plan (neutre, rassurante)
- Zone BLESSURE CRITIQUE = bande rouge visible même sans atteindre le seuil — effet d'avertissement préventif
- Aucun dégradé complexe — bandes aplates, lisibles au premier coup d'œil
- La jauge (niveau 1) prime sur la courbe (niveau 2) — hiérarchie visuelle claire

---

### Implémentation à faire

- [ ] Calcul ACWR dans `workoutAnalysisService.ts` (réutilise tonnage W2 existant)
- [ ] Composant `AcwrGauge` dans `SportScreen` onglet STATS
- [ ] Badge ACWR compact dans `PreWorkout` (zone + valeur, pas la courbe complète)
- [ ] Courbe 28–60 jours avec bandes zones (cfg.colorMap)
- [ ] Garde "données insuffisantes" si < 28j de tonnage disponibles


---

---

## W5 — Analyse Métabolique : Régression Calories/Poids (Trexler 2014)

### Origine
Spécification issue de l'analyse des widgets Python (widget_5.py).
Référence clinique : Trexler E.T. et al. (2014), *Metabolic adaptation to weight loss*, JISSN.

---

### Logique

**Pas de hiérarchie temporelle classique.** W5 est un moteur d'analyse à deux niveaux :
1. **Badge état** — DIÈTE ACTIVE ou PLATEAU MÉTABOLIQUE + pente de régression
2. **Scatter plot calories vs poids (MA_7)** — nuage de points + droite de régression + R² en badge

---

### Signaux source

2 signaux quotidiens croisés :
- **Calories** (kcal/jour) — apport calorique journalier (depuis W Nutrition)
- **Poids** (kg) — poids quotidien (depuis W1 Composition Corporelle)
- Les deux lissés en **MA_7** avant régression — élimine le bruit de la rétention d'eau

---

### Calcul

```
cal_7j  = calories.rolling(7).mean()
poids_7j = poids.rolling(7).mean()
régression linéaire : poids_7j = f(cal_7j)
→ slope, R²
```

**Fenêtre recommandée :** 28j minimum (régression sous 28j = non significative). Idéal : 56j (8 semaines).

**Garde :** si < 28 jours de données croisées disponibles → afficher "données insuffisantes (28j min requis)".

---

### Interprétation clinique (Trexler 2014)

| Condition | Statut | Action |
|---|---|---|
| `slope < 0.0005` | **PLATEAU MÉTABOLIQUE** | NEAT a chuté — Refeed ou pause diète |
| `slope ≥ 0.0005` | **DIÈTE ACTIVE** | Corrélation cohérente — continuer |

**R²** affiché comme badge de confiance : R² > 0.5 = signal fiable, R² < 0.3 = données trop bruitées.

---

### Affichage — Niveau 1 : Badge état

- Statut textuel : **DIÈTE ACTIVE** ou **PLATEAU MÉTABOLIQUE**
- Pente arrondie affichée (ex. `slope: 0.0003`)
- Couleur via `cfg.colorMap` :
  - DIÈTE ACTIVE → `var(--color-awan-status-ok)`
  - PLATEAU → `var(--color-awan-status-warn)`
- Affiché dans `AnalyseScreen` onglet CORPS (ou onglet dédié MÉTABO)

---

### Affichage — Niveau 2 : Scatter plot régression

- Axe X : calories MA_7 (kcal)
- Axe Y : poids MA_7 (kg)
- 1 point = 1 jour (sur la fenêtre 28–56j)
- Droite de régression superposée (couleur dominante)
- Badge **R²** en coin supérieur (ex. `R² 0.71`)
- Si pente plate visuellement → signal visuel immédiat du plateau

---

### Lien avec W1

W5 est le signal long terme de W1 :
- W1 long terme détecte "ralentissement de la vélocité à calories constantes"
- W5 quantifie ce ralentissement via la régression et le R²
- Les deux partagent `poids_7j` comme signal commun

---

### Règles graphiques

- Scatter plot sobre : points petits, semi-transparents (`alpha` réduit)
- Droite de régression = ligne principale, couleur `var(--color-awan-gold)` si ACTIVE, `var(--color-awan-status-warn)` si PLATEAU
- Aucune interpolation entre les points — ce sont des mesures, pas une courbe
- R² badge positionné hors du nuage pour ne pas masquer les données

---

### Implémentation à faire

- [ ] Service `metabolicAnalysisService.ts` : MA_7 calories + poids, régression linéaire, seuil slope
- [ ] Croisement données `MealService` (calories) × `MeasurementService` (poids) par date
- [ ] Composant `MetabolicBadge` (badge niveau 1) dans `AnalyseScreen`
- [ ] Composant `MetabolicScatterPlot` (scatter + régression) dans `AnalyseScreen`
- [ ] Garde 28j minimum avec message "données insuffisantes"
- [ ] R² badge de confiance affiché sur le scatter


---

---

## W6 — Orthométrie : Sparklines de Vélocité (Protocol ISAK)

### Origine
Spécification issue du document de conception SAPP (w6.md).
Référence clinique : Protocole ISAK — triple mesure, écart max 0.5 cm, moyenne retenue.

---

### Logique

**Pas de hiérarchie temporelle.** Les mensurations sont trop espacées (hebdo/mensuel) pour découper en court/moyen/long. La sparkline couvre **toute la durée disponible depuis la baseline** — c'est la trajectoire complète qui a de la valeur.

Le Δ vs baseline et le ▲/▼ final répondent aux questions court et moyen terme. La sparkline complète répond au long terme.

---

### Protocole de saisie

- **Moment :** Dimanche matin, à jeun, après passage aux toilettes
- **Technique :** Triple mesure par site. Si écart entre mesures > 0.5 cm → recommencer
- **Valeur retenue :** Moyenne des 3 mesures (pas le min, pas le max)

**Fréquence par site :**

| Fréquence | Sites |
|---|---|
| **Hebdomadaire** | Tour de taille, Bras (bicep L + R, avant-bras L + R) |
| **Mensuelle** | Cou, Épaules, Poitrine, Fesses, Cuisses (L + R), Mollets (L + R), Poignet, Cheville |

---

### Organisation visuelle — 2 axes

**Axe Métabolique** (indicateurs de masse grasse — doivent descendre) :
- Tour de taille, Ventre, Fesses

**Axe Musculaire** (indicateurs d'hypertrophie — doivent monter) :
- Bras (bicep), Cuisses, Mollets

---

### Visualisation : Sparklines de vélocité

Chaque site a sa propre sparkline :
- **Ligne** reliant tous les points de mesure disponibles (pas d'interpolation entre les dates — sauts visibles si mesure manquante)
- **Dernier point** : triangle ▲ (hausse) ou ▼ (baisse) indiquant la direction de la dernière mesure vs l'avant-dernière
- **Badge Δ** : `+X.X cm` ou `-X.X cm` vs valeur de départ (baseline = première mesure enregistrée)
- **Couleur sémantique** (via `cfg.colorMap`, jamais hardcodé) :
  - Axe Métabolique : Δ négatif = `var(--color-awan-status-ok)` (bon signe), Δ positif = `var(--color-awan-status-warn)`
  - Axe Musculaire : Δ positif = `var(--color-awan-status-ok)`, Δ négatif = `var(--color-awan-status-warn)`

---

### Matrice de décision (orchestrateur)

Croisement des signaux W1 + W2 + W3 + W6 :

| Condition | Interprétation | Action |
|---|---|---|
| Poids↓ + Tour de taille↓ | Perte de gras efficace | Continuer |
| Poids stable + Bras↑ | Hypertrophie réussie (recomposition) | Continuer |
| BPM↑ + RMSSD↓ + Tour de taille↑ | Surcharge systémique | Deload obligatoire |

Cette matrice est le signal Coach multi-widget — elle nécessite des données de W1, W3 et W6 simultanément.

---

### Règles graphiques

- Sparklines compactes (hauteur réduite, lisibles en grille)
- Les 2 axes (Métabolique / Musculaire) séparés visuellement par un séparateur léger
- Aucune interpolation — les sauts de dates sont visibles (la donnée est rare, c'est voulu)
- ▲/▼ positionné sur le dernier point de la sparkline
- Badge Δ aligné à droite de chaque sparkline
- Si une mensuration n'a qu'un seul point → afficher le point seul + "baseline" sans Δ

---

### Implémentation à faire

- [ ] Schéma `MeasurementV1` : vérifier champs existants, documenter clés L/R (`arm_left`, `arm_right`, etc.)
- [ ] `MensurationScreen.tsx` : saisie triple mesure avec moyenne auto + alerte si écart > 0.5 cm
- [ ] Composant `SparklineVelocity` : ligne + ▲▼ + badge Δ (réutilise primitives existantes)
- [ ] Organisation en 2 axes (Métabolique / Musculaire) dans `MensurationScreen` ou `AnalyseScreen`
- [ ] Règle Coach multi-widget : matrice de décision W1+W3+W6 dans `coachAdvice.ts`
- [ ] Service `symmetryService.ts` : L/R pour bras, cuisses, mollets (diff > 5% → alerte)
