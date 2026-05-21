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

1. Merger la branche feature courante dans `main`
2. Pusher `main` vers le remote
3. Exécuter `npm run build && npx cap sync android`
4. Informer l'utilisateur de lancer `./gradlew assembleDebug` en local (Android SDK non disponible dans cet environnement)

```bash
git checkout main
git merge <feature-branch> --no-edit
git push https://waaprojets-creator:<PAT>@github.com/waaprojets-creator/awan-app.git main
npm run build && npx cap sync android
# → Dire à l'user : cd android && ./gradlew assembleDebug
```

> Note : Le dossier `android/` est gitignored. L'utilisateur doit d'abord exécuter `npx cap add android` s'il n'existe pas, puis `npx cap sync android`, puis `./gradlew assembleDebug`.

## Branche de développement

Développer sur `claude/account-access-questions-dV31p` (ou toute branche désignée), merger dans `main` avant chaque build.

## Règles anti-dérive Coach

1. Chaque rule JSON Coach DOIT avoir un champ `"source"` avec URL DOI ou PMC (ex: `"source": "https://doi.org/10.xxxx/xxxxx"`) — même si Zod le strip au runtime, il sert de documentation auditée.
2. Chaque seuil de règle Coach doit être justifié en commentaire dans `coachAdvice.ts`.
3. Tout nouveau composant DOIT étendre un existant (`InstrumentCard`, `Card`, `Touch`, `Heading`, `ScreenHeader`, `StaggerList/StaggerItem`) — aucune primitive inventée.
4. Zéro valeur inline (couleurs, polices, espacements) — uniquement variables CSS (`var(--color-awan-*)`, `var(--font-*)`) et constantes SP.
5. Avant d'écrire une règle Coach, lire le schéma Zod de sa source de signal — vérifier le nom exact du champ (ex: `p` ≠ `proteinG`, `f` ≠ `fatG`, `whtr` ≠ `waist_height_ratio`).
6. Tests obligatoires pour : toute règle Coach, le générateur de routine, tout nouveau service. Le test doit couvrir trigger=true ET trigger=false.
7. Capture d'écran requise pour tout changement UI avant merge du sprint.
