# AWAN — Règles permanentes Claude Code

## Genèse — devise immuable

> **L'avenir s'esquisse en encrant aujourd'hui dans les lignes du passé.**

Cette devise est la raison d'être d'AWAN. Toute décision produit/design/code doit s'y rattacher : compter chaque jour (sport, nutrition, sommeil, mesures, prières, journal, planning), analyser le passé (Analyse, Coach, bilans hebdo/cycle), améliorer demain (forecast Coach, auto-progression, deload prédit, planning prospectif).

## Règles absolues

- **Jamais de build APK sans aval explicite de l'utilisateur.**
- **Jamais de nouvelle dette technique** — pas d'implémentation partielle.
- **Toujours respecter le design system AWAN** — variables CSS `var(--color-awan-*)`, `var(--font-sans)`, `var(--font-mono)`, pas de valeurs hardcodées.
- **Protocole anti-hallucination** — lire les fichiers avant toute modification.
- **Utiliser le modèle le plus efficient** (100% réussite, minimum de tokens).

## Protocole Build APK

Quand l'utilisateur demande de builder l'APK (toute formulation : "build AWAN", "fais le build", "lance le build", etc.) :

1. **Régénérer le seed** avec `npx ts-node scripts/generate-seed.ts` — `TODAY` est automatiquement le jour du build
2. Merger la branche feature courante dans `main`
3. Pusher `main` vers le remote
4. Exécuter `npm run build && npx cap sync android`
5. Informer l'utilisateur de lancer `./gradlew assembleDebug` en local (Android SDK non disponible dans cet environnement)

```bash
npx ts-node scripts/generate-seed.ts          # seed calé sur aujourd'hui
git add public/data/seed-demo.json && git commit -m "chore(seed): régénération au $(date +%Y-%m-%d)"
git checkout main
git merge <feature-branch> --no-edit
git push https://waaprojets-creator:<PAT>@github.com/waaprojets-creator/awan-app.git main
npm run build && npx cap sync android
# → Dire à l'user : cd android && ./gradlew assembleDebug
```

> Note : Le dossier `android/` est gitignored. L'utilisateur doit d'abord exécuter `npx cap add android` s'il n'existe pas, puis `npx cap sync android`, puis `./gradlew assembleDebug`.

## Branche de développement

Développer sur `claude/account-access-questions-dV31p` (ou toute branche désignée), merger dans `main` avant chaque build.

## Vision systémique — Objectifs par ordre de priorité

> À relire en début de session pour ne pas dériver de l'objectif terminal.

**Équation fondamentale :** Maximiser $T_{\text{slack}}$ sous contrainte $T_{\text{friction}} → 0$
Avec : $T_{\text{éveil}}$ (112h/sem) = $T_{\text{production}}$ + $T_{\text{friction}}$ + $T_{\text{slack}}$

| Priorité | Dimension | Objectif | État AWAN |
|---|---|---|---|
| 1 | **Somatique** | Maximiser le Healthspan (infrastructure biologique) — sommeil, nutrition, sport, composition corporelle | ✅ Bien couvert. Gap : HRV/VFC manquante |
| 2 | **Axiologique** | Cohérence spirituelle islamique comme filtre de toute décision d'envergure | ✅ Module Islam complet |
| 3 | **Temporelle** | Tracker $T_{\text{friction}}$, $T_{\text{production}}$, $T_{\text{slack}}$, $C_{et}$ hebdomadaire | ❌ Non implémenté |
| 4 | **Coach systémique** | Le Coach doit diagnostiquer le système entier, pas des domaines isolés — règles cross-dimensionnelles (charge allostatique, dérive axiologique) | ⚠️ Partiel (26 règles domaine, 0 règle système) |
| 5 | **Sommeil profond** | Qualité glymphatique (latence, réveils, profondeur auto-estimée) au-delà du score basique | ⚠️ Score grossier actuel |
| 6 | **Économétrique** | VHN (Valeur Horaire Nette) + Runway financier + calculateur arbitrage délégation ($VHN/C_{\text{délég}} > 1$) | ❌ Non implémenté |
| 7 | **Cognitive** | Blocs Deep Work sanctuarisés, tracking $T_{\text{production}}$ réel vs nominal, N-Back optionnel | ❌ Non implémenté |
| 8 | **Conative** | Taux de complétude des intentions, ego depletion, latence à l'effort | ⚠️ Journal humeur 1-5 seulement |
| 9 | **Environnementale** | Audit semestriel de la charge sensorielle et ergonomie | ❌ Non implémenté |
| 10 | **Sociométrique** | Audit mensuel distribution Dunbar, capital de liens faibles (Granovetter/Chetty) | ❌ Non implémenté |
| 11 | **Transmission** | Temps de présence qualitative descendance, journal de transmission capital humain | ❌ Non implémenté |

**Règle d'arbitrage permanente :** Si $VHN / C_{\text{délég}} > 1$ → déléguer sans exception.
**Cible $C_{et}$ :** > 86,6% (alerte si < 70%).
**Cible $T_{\text{friction}}$ :** < 15h/semaine.
**Cible $T_{\text{slack}}$ :** 20–30h/semaine non passif.

---

## Règles anti-dérive Coach

1. Chaque rule JSON Coach DOIT avoir un champ `"source"` avec URL DOI ou PMC (ex: `"source": "https://doi.org/10.xxxx/xxxxx"`) — même si Zod le strip au runtime, il sert de documentation auditée.
2. Chaque seuil de règle Coach doit être justifié en commentaire dans `coachAdvice.ts`.
3. Tout nouveau composant DOIT étendre un existant (`InstrumentCard`, `Card`, `Touch`, `Heading`, `ScreenHeader`, `StaggerList/StaggerItem`) — aucune primitive inventée.
4. Zéro valeur inline (couleurs, polices, espacements) — uniquement variables CSS (`var(--color-awan-*)`, `var(--font-*)`) et constantes SP.
5. Avant d'écrire une règle Coach, lire le schéma Zod de sa source de signal — vérifier le nom exact du champ (ex: `p` ≠ `proteinG`, `f` ≠ `fatG`, `whtr` ≠ `waist_height_ratio`).
6. Tests obligatoires pour : toute règle Coach, le générateur de routine, tout nouveau service. Le test doit couvrir trigger=true ET trigger=false.
7. Capture d'écran requise pour tout changement UI avant merge du sprint.
