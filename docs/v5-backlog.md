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
