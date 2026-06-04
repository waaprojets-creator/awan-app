# SPÉCIFICATION TECHNIQUE CIBLE : ARCHITECTURE SOUVERAINE AWAN v5.0
**Document d'Architecture Système — Haute Densité, Local-First & Réactivité 120 Hz**

---

## 1. VISION & PRINCIPES DIRECTEURS

L'architecture v5.0 d'AWAN rompt définitivement avec le modèle hybride classique (Capacitor/WebView) et le modèle Cloud distribué synchrone (type Google). Pour absorber une **densité de vie entière (80+ micro-tâches/jour)** sans dégradation de batterie et maintenir un affichage fluide à 120 Hz, le système applique un principe de **scission absolue** entre le Cerveau Logique (déterministe, compilé, bas-niveau) et les Yeux Graphiques (coquille d'affichage bête).

### Les 4 Piliers Incompressibles :
1. **Souveraineté Locale Légère :** Aucune machine virtuelle lourde (WebView/Node) ne tourne en arrière-plan.
2. **Bitemporalité Biologique :** Le temps humain prime sur le temps machine.
3. **Évaluation Paresseuse (Lazy Evaluation) :** On ne calcule que ce que l'œil regarde.
4. **Exécution Directe en Mémoire Partagée :** Latence d'écriture < 5 ms sur action de notification.

---

## 2. CARTOGRAPHIE GLOBALE DE L'ARCHITECTURE

```
+-----------------------------------------------------------------------+
| STRATE 5 : COQUILLE D'AFFICHAGE                                       |
| React Native Shell (UI Threads) / SwiftUI / Jetpack Compose           |
+-----------------------------------+-----------------------------------+
                                    |
                     Liaison Synchrone (JSI / C-FFI)
                          < 1 microseconde
                                    |
                                    v
+-----------------------------------------------------------------------+
| STRATE 1 : LE NOYAU SOUVERAIN                                         |
| Binaire Natif RUST (Calculs, Scheduler, Solveur, Moteurs)             |
+---------+-------------------------+-------------------------+---------+
          |                         |                         |
     Accès Direct              Évaluation                 Mapping
          v                         v                         v
+-------------------+   +-------------------+   +-------------------+
| BASE DE DONNÉES   |   | STRATE 3 :        |   | STRATE 2 :        |
| SQLite Local      |   | GRAF DE DÉPENDANCE|   | MODÈLE TEMPOREL   |
| (Mode WAL)        |   | RÉACTIF (DAG)     |   | Bitemporel        |
+-------------------+   +-------------------+   +-------------------+
          ^                                               |
          |    Écriture ultra-rapide (3-5ms)              | Traduction GMT
          +-------------------------+--------------------+
                                    |
                        (Événement de Notification)
                                    |
+-----------------------------------+-----------------------------------+
| STRATE 4 : INFRASTRUCTURE D'ARRIÈRE-PLAN                              |
| OS Native Background Handlers (Headless BroadcastReceiver)            |
+-----------------------------------------------------------------------+
```

---

## 3. SPÉCIFICATION DES STRATES

### STRATE 1 : Le Cerveau Bas-Niveau (Shared Rust Core)
La logique métier est entièrement extraite de la couche UI et compilée sous forme de bibliothèque dynamique native (`.so` / `.dylib`) partagée.

* **Gestion Mémoire :** Zéro Garbage Collector. Pas de pauses de rendu graphiques.
* **Moteur de Récurrence (Interval Tree) :** L'importation de routines complexes (ex: Skincare, Routines capillaires conditionnelles) générées par LLM s'effectue via des chaînes normalisées `RRULE` (RFC 5545). Le noyau Rust compile ces règles dans un **Arbre d'Intervalles** (*Interval Tree*). La résolution de la présence d'une tâche à une minute précise s'effectue en temps logarithmique :

$$\mathcal{O}(\log n + k)$$

rendant le traitement instantané même avec des milliers de règles cumulées.

### STRATE 2 : Le Modèle de Temps Bitemporel
AWAN rejette le stockage universel UTC de Google pour préserver la vérité biologique de l'utilisateur.

1. **Le Temps Biologique Civil (Wall-Clock Time) :** Stocké sous forme de types Rust `NaiveDate` (`YYYY-MM-DD`) et `NaiveTime` (`HH:MM:SS`). Si l'utilisateur prend un vol Genève - Tokyo, son repas, son entraînement et ses prières restent programmés à leurs heures locales organiques (ex: Réveil à 07h00 du matin, heure de Tokyo). Les bilans historiques ne subissent aucun décalage de fuseau.
2. **Le Temps Système Absolu (Unix Timestamp UTC) :** Généré dynamiquement et uniquement *à la volée* pour communiquer avec les démons d'alarmes de l'OS du téléphone au moment où l'appareil bascule de fuseau.

### STRATE 3 : La Réactivité par Graphe de Dépendances Dirigé (DAG)
Pour éviter l'asphyxie par réactions en chaîne de l'ancien EventBus, l'architecture implémente un graphe de dépendances strict (de type *Signals*).

* **Isolants de Frontières :** Le graphe isole structurellement les sous-graphes. Une modification sur une micro-tâche "Passer le balai" ou "Sérum Visage" touche le nœud `Planning_Jour`, mais meurt à la frontière du sous-graphe `Nutrition` ou `Sommeil`.
* **Drapeaux d'Obsolescence (Dirty Flags) & Évaluation Paresseuse :** Le moteur du Coach (26 règles logiques de charge allostatique) ne tourne jamais en arrière-plan. Lors d'une modification de tâche, le nœud `Coach_Engine` lève simplement un indicateur `is_dirty = true` en base SQLite. Le calcul lourd n'est exécuté que si l'utilisateur ouvre explicitement l'écran du Coach.

### STRATE 4 : L'Infrastructure d'Arrière-Plan Léger (Headless FFI)
C'est le mécanisme clé permettant de gérer 80+ notifications de micro-gestion sans épuiser la batterie.

```
[Clic Utilisateur sur bouton "Fait"] (Notification à l'écran)
│
▼
[OS : Native Notification Intent] (Java Broadcast / Swift Extension)
│
▼ (Pas d'allumage de la WebView ni de l'interface React)
[Appel direct C-FFI vers le binaire Rust]
│
▼
[Rust : Transaction SQLite WAL] ───► Mises à jour des index (3ms)
│
▼
[Mise à jour des alarmes suivantes] ───► Extinction du processus
```

Ce cycle complet consomme moins de 5ms de CPU, évitant que l'OS ne classe AWAN comme application énergivore.

### STRATE 5 : La Coquille d'Affichage (UI Shell) 120 Hz
L'interface (React Native ou Native) ne contient aucun état calculé, aucun tri, aucun filtre.

* **Liaison Synchrone via JSI (JavaScript Interface) :** Le thread JavaScript appelle directement et de manière synchrone les fonctions C++ exposées par le noyau Rust sans passer par un bridge asynchrone JSON.
* **Zéro Latence de Scroll :** Lors du défilement de la timeline unifiée, la liste virtualisée appelle de manière synchrone :

```typescript
const dayData = global.AwanCore.getTimelineForDay("2026-06-04");
```

Le binaire Rust retourne instantanément le pointeur mémoire des structures de données pré-triées. L'affichage maintient un rafraîchissement à 120 Hz constant, indépendant du nombre total de micro-tâches stockées.

---

## 4. SCHÉMAS DE DONNÉES DU NOYAU (RUST STUB)
Les structures de données ci-dessous décrivent le contrat d'interface rigide géré par le Noyau Rust.

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum TimeCategory {
    Production, // Deep Work, Sport, Apprentissage
    Friction,   // Tâches ménagères, Administratif, Déplacements
    Slack,      // Repos choisi, Famille, Temps libre
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum TaskStatus {
    Pending,
    Completed,
    Delayed,
}

// Définition abstraite d'une routine issue de l'import LLM
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TaskTemplate {
    pub id: String,
    pub title: String,
    pub category: TimeCategory,
    pub duration_min: u32,
    pub rrule: String,             // Exemple: "FREQ=DAILY;BYHOUR=8;BYMINUTE=15"
    pub value_of_holy_hour: f64,   // VHN (Valeur de l'Heure Nette pour arbitrage)
}

// Instanciation réelle dans la chronologie de l'utilisateur
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DayScheduleTask {
    pub task_id: String,
    pub target_date: String,       // Format YYYY-MM-DD (Naive)
    pub start_min: u32,            // Minutes écoulées depuis minuit (0 - 1439)
    pub status: TaskStatus,
    pub completed_at_utc: Option<i64>,
}
```

---

## 5. STRATÉGIE DE PERSISTANCE & REQUÊTES CRITIQUES
La base de données SQLite locale doit être impérativement configurée avec les pragmas suivants lors de l'initialisation du Noyau Rust pour autoriser les lectures simultanées de l'UI pendant les écritures de l'arrière-plan :

```sql
-- Initialisation de la connexion SQLite par le Noyau
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

### Index Strict pour le Rendu 120 Hz :
L'accès à la timeline par jour est accéléré via un index composite couvrant la date civile locale :

```sql
CREATE INDEX IF NOT EXISTS idx_day_schedule_date_time
ON day_schedule_tasks (target_date, start_min);
```

---

## 6. FLUX NOMINAUX D'EXÉCUTION (TRACE TECHNIQUE)

### Scénario A : Ingestion d'une routine générée par LLM
1. L'utilisateur colle le payload JSON (Ex: Routine Skincare hautement récurrente).
2. L'UI passe la chaîne brute au Core Rust via `AwanCore.importRoutine(jsonString)`.
3. Rust valide la conformité du schéma via `serde_json` (vitesse de parsing : ~200 microsecondes).
4. Rust écrit le template en base de données et met à jour l'Arbre d'Intervalles en mémoire.
5. Le Core Rust calcule les alarmes physiques de l'OS pour les prochaines 48 heures et appelle l'API native pour les enregistrer.

### Scénario B : L'utilisateur clique sur "Reporter" de 15 min depuis sa montre/notification
1. L'OS intercepte l'action et exécute le gestionnaire natif d'arrière-plan sans réveiller l'interface.
2. Le gestionnaire natif transmet les identifiants au noyau Rust.
3. Rust exécute une requête SQL immédiate :

```sql
UPDATE day_schedule_tasks
SET start_min = start_min + 15, status = 'delayed'
WHERE task_id = ? AND target_date = ?;
```

4. Rust recalcule immédiatement la collision temporelle sur la journée en cours via son scheduler local, décale les micro-tâches dépendantes de basse priorité (Friction) sans toucher aux blocs sanctuarisés (Sport/Prières/Deep Work).
5. Rust met à jour le trigger de l'alarme auprès de l'OS pour la notification suivante.
6. Fin d'exécution (Consommation mémoire insignifiante, pas d'impact UI).
