# 🧭 RÉPONSE CONSOLIDÉE — Audit anatomique & Formulaire de conversion native

**Projet :** AWAN — Stack **Expo bare SDK 52 / React Native 0.76.7**
**Date de réponse :** 2026-06-08 (jour du cutover J0)
**Documents traités :**
1. `formulaire_longueur_de_code.md` — *Dossier consolidé & formulaire d'évaluation (clôture J0)*
2. `geminicode…txt` — *Dossier d'audit technique AWAN, Phase 1 : diagnostic anatomique*
**Méthode :** analyse statique du commit courant + archéologie git (commit pré-cutover `1e2c74f`).

---

## 0. CONSTAT DÉCISIF (à lire en premier)

> **La conversion que ces deux formulaires cherchent à _planifier_ est déjà _réalisée_.**

Les deux documents posent des questions de **diagnostic pré-migration** (« 2159 classes Tailwind », « 1011 balises DIV », « résidus Framer Motion ?»). Or, au commit courant de la branche, **le DOM web n'existe plus** : tout est converti en primitives React Native.

| Signal mesuré (commit courant) | Valeur | Lecture |
|---|---|---|
| `<div>` dans `src/` | **0** | DOM web éradiqué |
| `<View>` dans `src/` | **1 103** | primitives RN |
| `className=` Tailwind actif | **0** | (1 seul résiduel = *passthrough* `react-native-web`, cf. §3-Doc1) |
| `StyleSheet.create` | **52** | styles natifs |
| `var(--…)` dans `.ts/.tsx` | **0 actif** (1 en commentaire) | tokens JS via `tokens.ts` |
| `@capacitor/*` | **0** | remplacé par modules Expo |
| `from 'motion'` / framer-motion actif | **0** | remplacé par Reanimated |
| `wouter` | **0** | remplacé par React Navigation |
| `leaflet` | **0** | TrajetScreen neutralisé |

**Conséquence méthodologique :** je réponds à chaque question en **double lecture** —
**(A)** l'état pré-cutover reconstruit depuis git (ce que l'architecte voulait cartographier), puis
**(B)** la résolution native effective aujourd'hui.

---

## 1. PÉRIMÈTRE DE VÉRIFICATION (honnêteté technique)

**✅ Vérifié par analyse statique** (ce conteneur, commit courant) : comptages de balises, classes, tokens, positionnement, SVG, animations, modales, tailles de fichiers, fichiers de tests.

**🕳️ Reconstruit depuis git** : baselines pré-migration au commit **`1e2c74f`** (« checklist de clôture J0 », dernier commit avant l'init Expo `65f249d`). Trajectoire de conversion : `65f249d` (J0.1 init Expo) → `117c376` (J0.2 var→tokens) → conversions DOM→RN écran par écran → `7a10077` (J0.6-J0.7 Reanimated + lucide).

**❌ NON vérifiable dans cet environnement** : les assertions « `tsc` → 0 erreur » et « vitest 1051/1051 vert » du Document 1 §1.1.
> `node_modules` est **absent** et l'installation échoue (`npm install` → **ECONNRESET**, réseau sortant restreint). `tsc` s'arrête sur une dépréciation de config (`moduleResolution=node10`), `vitest` ne résout pas `vitest/config`. **Ces deux assertions doivent être re-validées en local / CI** — voir §4 (proxy statique) et §6 (checklist G).

---

## 2. RÉPONSES — Document 2 : « Diagnostic anatomique » (Gemini)

### SECTION 1 — Anatomie des classes Tailwind & CSS

#### 1.1 Répartition des classes *(pré-cutover, `1e2c74f`)*
Base mesurée : **8 382 tokens de classe** statiques (395 uniques) sur **2 089** attributs `className="…"` + **128** dynamiques.

| Famille | Part estimée | Tokens phares mesurés |
|---|---|---|
| **Layout / Flexbox** | **≈ 51 %** | `flex` (537), `items-center` (398), `flex-row` (326), `justify-center` (172), `flex-1` (147), `gap-3` (106) |
| **Typographie** | **≈ 21 %** | `font-black` (350), `uppercase` (317), `font-mono` (255), `tracking-widest` (248), `text-awan-sm/md/xs` (sizes) |
| **Style atomique / couleur** | **≈ 14 %** | `border-white/5` (201), `border` (185), `bg-white/5` (172), `text-awan-tx-mute` (321), `bg-awan-surface` (58) |
| **Utilitaires AWAN custom + divers** | **≈ 14 %** | `awan-label` (110), `awan-glass`, `awan-card`, `awan-data-value`, `block` (235) |

> *Buckets recouvrants (`text-*` mêle taille et couleur) → ±3 %.* **Aujourd'hui : 100 % converti** en `StyleSheet` + fragments réutilisables `T.*` / `Fs` / `Fw` / `Ls` / `Sp` / `Clr` (`src/theme/tokens.ts`). La signature AWAN « `uppercase` + `tracking-widest` + `font-black` » est préservée via `T.label*`.

#### 1.2 Variants & dépendances dynamiques *(pré-cutover)*

- **Modificateurs d'état** : `hover:` **5**, `active:` **2**, `focus:` **0**, responsifs (`sm/md/lg:`) **0**. → **7 occurrences au total**, soit < 0,1 %. Conversion triviale : l'unique surface d'interaction (`active:`) est désormais portée par le composant `Touch` (feedback de pression Reanimated `withSpring`).
- **Valeurs arbitraires complexes** : **67** occurrences. Top : `tracking-[0.2em]` (10), `tracking-[0.3em]` (9), `h-[200px]` (7), `h-[88px]` (4), `w-[3px]` (3), `z-[200]` (1), `opacity-[0.03]` (2). → **toutes** remappées en constantes px (`Ls.*` pour le letter-spacing = ratio × fontSize, hauteurs/largeurs fixes en `StyleSheet`).
- **Classes dynamiques (template literals / ternaires)** : **128** attributs `className={…}` (≈ **5,8 %** du total). Fichiers les plus denses :

  | Fichier | `className={…}` dynamiques |
  |---|---|
  | `src/screens/SportScreen.tsx` | 23 |
  | `src/screens/SettingsScreen.tsx` | 18 |
  | `src/screens/PlanningScreen.tsx` | 17 |
  | `src/screens/NutritionScreen.tsx` | 14 |
  | `src/screens/AnalyseScreen.tsx` | 12 |
  | `src/modules/sport/components/RoutineGeneratorView.tsx` | 10 |

  → Aujourd'hui, ces conditions sont des **objets de style ternaires** (`style={{ backgroundColor: active ? theme.selected : theme.surface }}`), cf. extrait §3-Doc1 4.2.

### SECTION 2 — Topologie & gestion du DOM

#### 2.1 Analyse des balises `<div>` *(1 021 mesurées à `1e2c74f` ; le « 1011 » du dossier est l'ordre de grandeur exact)*

| Usage | Part estimée | Devenir natif |
|---|---|---|
| **Conteneurs de mise en page** (Flexbox) | **≈ 70 %** | `<View>` + `flexDirection` explicite |
| **Wrappers graphiques** (bord/rayon/fond, sans flex) | **≈ 25 %** | `<View>` stylé (`T.card` / `T.glass`) |
| **Séparateurs / calage** (`w-full h-4`) | **≈ 5 %** | `<View>` espaceur ou `gap` parent |

> Proxy : 771 / 2 089 attributs `className` portent un token de layout ; rapporté aux `<div>` seuls (les `<span>` ≈ 890 étant majoritairement du texte), ~75 % des `<div>` étaient des conteneurs. **Toutes** sont aujourd'hui des `<View>`.

#### 2.2 Défis de positionnement

| | Pré-cutover (`1e2c74f`) | Aujourd'hui (RN) |
|---|---|---|
| `fixed` | **3** (classes) | **0** — *inexistant en RN* (remonté en overlay/`Modal`) |
| `absolute` | **14** | `position:'absolute'` × **32** |
| `relative` | **14** | `position:'relative'` × **13** |
| `z-index` | 10 classes | `zIndex` × **12** |
| `overflow-hidden` | 22 | `overflow:'hidden'` × **17** |

- **Conflits z-index / overflow** : pas de superposition pathologique détectée ; les empilements passent par `<Modal>` (qui sort du flux) plutôt que par des `z-index` concurrents.
- **Éléments superposés (modales / headers / toasts)** :
  - **Toasts** → `ToastProvider` (Context) monté à la racine dans `MainLayout` (`src/components/ui/Toast.tsx`) — *pattern « portal-like » conforme à l'esprit §3.3 du Document 1*.
  - **Modales / popups** → primitive RN `<Modal>` (**21** usages, 11 fichiers : MoonMenu, DateSelectPopup, WidgetInfo, NutritionItem, et 7 écrans).
  - **Header** → `AppHeader` / `ScreenHeader` (composants dédiés).
  - *Aucun `Portal` tiers* (`@gorhom/portal` etc.) — cf. recommandation §5.

### SECTION 3 — Assets & transitions

#### 3.1 SVG
- **0 fichier `.svg` externe importé.** Tous les SVG sont **inline / en code** :
  - `react-native-svg` dans **18 écrans/composants** (BodySvg, BodyMeasureSvg, MoonMenu, 11 onglets Analyse, SportScreen, SanteScreen, SleepScreen…), `<Path>` × 11.
  - **`lucide-react-native`** (icônes vectorielles) dans **37 fichiers**.

#### 3.2 Animations & transitions
- **Résidus Framer Motion : aucun import actif.** L'unique mention « framer » est `src/components/motion.tsx`, un **adaptateur volontaire** traduisant l'ancienne surface API `motion.*` vers `react-native-reanimated` (il a permis de préserver les sites d'appel pendant la conversion J0.6).
- **Pile d'animation native** : `react-native-reanimated` dans **12 fichiers** — `useSharedValue` ×27, `useAnimatedStyle` ×18, `withTiming` ×14, `withSpring` ×10, `withRepeat` ×4, `interpolate` ×5, entrées déclaratives `FadeIn/FadeInDown/FadeOut/FadeInLeft/FadeOutUp`. (`Animated.*` ×36 = tous depuis Reanimated, pas l'`Animated` cœur RN.)
- **Animations fluides (120 Hz) critiques** :
  1. **`Touch`** (`components/ui/Touch.tsx`) — feedback de pression `withSpring({stiffness:500,damping:30,mass:0.5})` sur **tout** élément tactile (chemin chaud universel).
  2. **Transitions de navigation** (entrées `FadeIn*` des écrans).
  3. **MoonMenu** (menu radial, SVG + `Modal` animé).
  4. **Scroll des timelines** Analyse / Planning.

---

## 3. RÉPONSES — Document 1 : « Formulaire longueur de code » (clôture J0)

### Vérification des assertions §1.1 « État des lieux statique »

| Assertion du dossier | Mon constat | Verdict |
|---|---|---|
| Dette CSS : 1 seule occurrence `var(--`, en commentaire | **Exact** dans `.ts/.tsx` : 1 occurrence, `src/hooks/useTemporalMode.ts:11` (commentaire). *(NB : `src/index.css` contient légitimement des `var(--)` — c'est la feuille **cible web** `react-native-web`/PWA, non consommée par le natif.)* | ✅ |
| 0 trace active `@capacitor` / `wouter` / `motion` | **Exact** : 0/0/0 imports actifs (1 mention `framer` = adaptateur `motion.tsx`) | ✅ |
| `tsc` → 0 erreur | **Non re-vérifiable ici** (`node_modules` absent, réseau bloqué). Le `migration-tracker.md` documente la baseline « 0 erreur » au commit `4aae919` | ⚠️ à relancer en local |
| vitest 1051/1051 (+21 à répertorier) | **Non re-vérifiable ici** — voir proxy statique ci-dessous | ⚠️ à relancer en local |

**Proxy statique des tests** (sans exécution) : **36 fichiers** de test, **404** déclarations `it()/test()` littérales, **110** blocs `describe`, **713** `expect()`. **13** fichiers génèrent des cas en boucle (`forEach`/`for`), ce qui rend le total runtime **1051 plausible** mais non reproductible hors-ligne. Périmètre vitest : `tests/**/*.test.ts` + `src/**/*.test.ts` (+ 2 specs Playwright e2e séparés).

### SECTION 1 — Complexité des 2 159 (mes. 2 217) classes Tailwind
- **1.1 Proportion de classes dynamiques** : ≈ **5,8 %** → **☑ Entre 5 % et 20 %** (extrémité basse).
- **1.2 Modificateurs web présents** (pré-cutover) :
  - ☑ `hover:` (5) ☑ `active:` (2) ☐ `focus:` (0) ☐ responsifs `sm/md/lg:` (0) ☑ valeurs arbitraires (67)

### SECTION 2 — Topologie des 1 011 (mes. 1 021) balises DIV
- **2.1 Sur 50 div, wrappers graphiques purs (sans logique flex)** : estimation **≈ 12–15 / 50** (~25 %, cf. §2.1 Doc2).
- **2.2 Contraintes de positionnement** : `fixed` = **3** · `absolute` = **14** *(classes pré-cutover ; → `position:'absolute'` ×32 en RN, `fixed` n'existe pas en RN)*.

### SECTION 3 — Composants monolithes par volume (TSX les plus lourds)

| # | Fichier | Lignes |
|---|---|---|
| 1 | `src/screens/SportScreen.tsx` | **1 980** |
| 2 | `src/screens/NutritionScreen.tsx` | **1 237** |
| 3 | `src/screens/analyse/TempsTab.tsx` | **1 036** |
| *(limite)* | `src/screens/MensurationScreen.tsx` | 992 |
| *(limite)* | `src/screens/PlanningScreen.tsx` | 953 |

> ⚠️ Ces 3 fichiers > 1 000 lignes **ne sont pas encore découpés** selon le dossier §4 (Vue pure / hook / design / types / `components/`). Le module `screens/analyse/` est, lui, déjà éclaté en 16 onglets + `shared.tsx`. → cf. recommandation §5.

### SECTION 4 — Samples représentatifs

**4.1 `src/index.css` (déclarations `@theme` & `@layer`)** — *feuille cible web (RNW/PWA) ; la source de vérité native est `src/theme/tokens.ts`* :

```css
@theme {
  /* ALARM DEFAULTS — remplacés par useThemeSync au chargement (magenta/cyan = variable non couverte). */
  --color-awan-bg: #FF00FF;  --color-awan-surface: #FF00FF;  --color-awan-gold: #FF00FF;
  --color-awan-tx: #00FFFF;  --color-awan-tx-dim: #00FFFF;   --color-awan-tx-mute: #00FFFF;
  --color-awan-status-ok/warn/error/info/spirit: #FF00FF;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --font-sans: "Cairo", ui-sans-serif, system-ui, sans-serif;
  --fw-mute:300; --fw-body:400; --fw-label:600; --fw-value:700; --fw-display:900;
  --radius-awan-sm/md/lg/xl: 0px;            /* design AWAN = angles vifs partout */
  --text-awan-xxs:7px; --xs:8px; --sm:9px; --md:10px; --lg:11px; --data:22px;
}
@layer components {
  .awan-card  { border:1px solid var(--color-awan-border); border-radius:0;
                background-color: color-mix(in srgb, var(--color-awan-surface) 72%, transparent);
                backdrop-filter: blur(8px); }
  .awan-label-md { @apply text-awan-md uppercase tracking-widest font-black; } /* signature AWAN */
  .awan-glass  { @apply bg-white/5 backdrop-blur-xl border border-white/10; }
}
```

**4.2 JSX complexe d'un écran maître** — `SportScreen.tsx` (écran de récupération, l.551-591), illustrant `View/Text` + tableaux de styles + tokens + styles conditionnels + `.map()` + `Touch` (Reanimated) :

```tsx
<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 32 }}>
  <View style={{ width: '100%' }}>
    <Text style={[ss.sm, { textAlign: 'center', color: theme.mute, marginBottom: 24 }]}>SCORE DE RÉCUPÉRATION DU JOUR</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
      {[1,2,3,4,5,6,7,8,9,10].map(n => {
        const active = recoveryScore === n;
        return (
          <Touch key={n} onPress={() => setRecoveryScore(n)}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
                     backgroundColor: active ? theme.selected : theme.surface,
                     borderWidth: active ? 0 : 1, borderColor: 'rgba(128,128,128,0.25)' }}>
            <Text style={{ fontFamily: FontMono, fontSize: 14, fontWeight: Fw.value, color: active ? '#000' : theme.title }}>{n}</Text>
          </Touch>
        );
      })}
    </View>
  </View>
</View>
```

---

## 4. ANNEXE — Synthèse AVANT → APRÈS (preuve de conversion totale)

| Dimension | Pré-cutover (`1e2c74f`) | Commit courant | Remplacement |
|---|---|---|---|
| Balises `<div>` | 1 021 | **0** | `<View>` (1 103) |
| Attributs `className` Tailwind | 2 217 (8 382 tokens) | **0** | `StyleSheet` + `T.*`/`Fs`/`Ls`/`Sp` |
| `var(--…)` en `.ts/.tsx` | 723 occ. / 47 fichiers | **0** (1 commentaire) | `useTheme()` + `tokens.ts` |
| Valeurs arbitraires `…-[…]` | 67 | **0** | constantes px |
| `motion` / framer-motion | 22 fichiers | **0** actif | Reanimated (+ adaptateur `motion.tsx`) |
| `@capacitor/*` | 9 fichiers | **0** | expo-sqlite / notifications / file-system / secure-store |
| `wouter` | 2 fichiers | **0** | React Navigation |
| `leaflet` | 1 fichier | **0** | TrajetScreen neutralisé |
| `<svg>` inline | 104 | — | `react-native-svg` (18) + `lucide-react-native` (37) |

---

## 5. ÉCARTS & RECOMMANDATIONS (dette résiduelle)

1. **Monolithes > 1 000 lignes non découpés** (vs Document 1 §4) : `SportScreen` (1 980), `NutritionScreen` (1 237), `TempsTab` (1 036) — et en surveillance `MensurationScreen` (992), `PlanningScreen` (953). → Découper en `Vue / hook / styles / types / components/`, sur le modèle déjà appliqué à `screens/analyse/`.
2. **Littéraux inline résiduels** (vs règle CLAUDE.md « zéro valeur inline ») : ex. `borderColor:'rgba(128,128,128,0.25)'`, `color:'#000'`, `fontSize:14` dans `SportScreen` (extrait 4.2). → tokeniser (`Clr.*`, `Fs.*`).
3. **Modal vs Portal** (Document 1 §3.3) : les toasts respectent le pattern (Context racine `MainLayout`), mais les popups légers (`DateSelectPopup`, `WidgetInfo`) passent par `<Modal>` RN. → décider si l'on introduit un `Portal` unique dans `MainLayout` pour ces éléments légers, ou si `<Modal>` natif est jugé conforme.
4. **Checklist G de clôture non validable hors-ligne** : `tsc` 0 erreur, vitest vert, APK signé sur device réel, audit réseau « 0 requête sortante », `PRAGMA journal_mode=wal`. → à exécuter en **local / CI** (réseau npm absent dans ce conteneur).

---

*Réponse générée le 2026-06-08 — branche `claude/jolly-mayer-pvesxt`. Mesures statiques sur le commit courant ; baselines pré-migration reconstruites depuis `1e2c74f`. Aucune exécution `tsc`/`vitest` possible (réseau sortant restreint, `node_modules` absent).*
