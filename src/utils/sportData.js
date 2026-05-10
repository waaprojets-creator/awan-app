/**
 * BIBLIOGRAPHIE DES EXERCICES :
 * Les données et images sont issues du projet Open Source wger (https://wger.de)
 * Licence: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
 */

import wgerData from './wgerExercises.json';

export const MUSCLES = {
  pecs: { l: 'Pectoraux', c: '#f44336' },
  dos: { l: 'Dos', c: '#4CAF50' },
  jambes: { l: 'Jambes', c: '#2196F3' },
  epaules: { l: 'Épaules', c: '#9C27B0' },
  bras: { l: 'Bras', c: '#FF9800' },
  abdos: { l: 'Abdos', c: '#00BCD4' },
  cardio: { l: 'Cardio', c: '#E91E63' },
  divers: { l: 'Divers', c: '#795548' }
};

export const EXERCISES = wgerData.map(ex => ({
  id: ex.id || ex.uuid,
  n: ex.n,
  m: ex.m || 'divers',
  icon: ex.icon || '🏋️',
  eq: ex.eq || 'Aucun',
  d: ex.d || '',
  img: ex.img
}));

export const EX_MAP = EXERCISES.reduce((acc, ex) => {
  acc[ex.id] = ex;
  return acc;
}, {});
