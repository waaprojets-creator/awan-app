# AWAN — Règles permanentes Claude Code

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
