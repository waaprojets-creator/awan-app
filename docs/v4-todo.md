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
  - La répartition des segments révèle la distribution anatomique de la lipolyse
- **Double axe Y** obligatoire quand poids (kg) et plis (mm) cohabitent — unités incompatibles
- Barres plis en **alpha réduit** (translucide) : la ligne poids domine visuellement
- **Droite de régression** superposée aux points plis en vue moyen/long terme
- **R²** affiché comme badge de confiance sur la régression

---

### Implémentation à faire

- [ ] Service `compositionService.ts` : calcul MA_7, agrégation semaine/mois, régression linéaire sur plis, vélocité lipolyse, R²
- [ ] Composant graphique W1 dans `MensurationScreen` ou `AnalyseScreen` onglet SCAN
- [ ] Sélecteur d'échelle (court / moyen / long) avec recomputation du grain au changement
- [ ] Gestion de l'absence de données plis < 4 semaines (message "données insuffisantes")
- [ ] Connexion avec W5 (adaptation métabolique) : si vélocité lipolyse décroît sur long terme → signal Coach
