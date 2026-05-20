// Constantes globales AWAN — source unique de vérité pour les valeurs métier

export const DEFAULT_KCAL_TARGET = 2000;
export const MS_PER_DAY = 86_400_000;

// Formule Epley 1RM (NSCA Essentials of Strength Training, 2008)
export const EPLEY_DIVISOR = 30;

// Mifflin-St Jeor (Journal of the American Dietetic Association, 1990)
export const MIFFLIN_W = 10;
export const MIFFLIN_H = 6.25;
export const MIFFLIN_A = 5;

// Recommandation protéines NSCA : 1.6–2.0 g/kg pour maintien masse musculaire
export const PROTEIN_RATIO_G_KG = 1.8;

// EFSA 2010 (doi:10.2903/j.efsa.2010.1462) — recommandation adultes
export const FIBER_TARGET_G_PER_DAY = 35;

// Media cache budget on native filesystem (mediaCacheService LRU eviction).
export const MEDIA_CACHE_MAX_BYTES = 200 * 1024 * 1024;

// Adhérence protéine 7j — seuils visuels (% du target)
export const ADHERENCE_OK_THRESHOLD = 80;
export const ADHERENCE_WARN_THRESHOLD = 60;
