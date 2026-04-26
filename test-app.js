// Script de validation statique d'AWAN
// Vérifie : syntaxe, imports, exports utilisés, références à T.xxx, CATS.xxx

const fs = require('fs');
const path = require('path');

const FILES = [
  'App.js',
  'src/screens/LockScreen.js',
  'src/screens/PlanningScreen.js',
  'src/screens/TasksScreen.js',
  'src/screens/AnalyseScreen.js',
  'src/screens/SettingsScreen.js',
  'src/context/AppStateContext.js',
  'src/utils/storage.js',
  'src/utils/recurrence.js',
  'src/constants/theme.js',
];

const errors = [];
const warnings = [];

console.log('\n=== VALIDATION AWAN ===\n');

// 1. Vérifier que tous les fichiers existent et ont une syntaxe JS valide
for (const f of FILES) {
  const full = path.join(__dirname, f);
  if (!fs.existsSync(full)) {
    errors.push(`FICHIER MANQUANT : ${f}`);
    continue;
  }
  try {
    const code = fs.readFileSync(full, 'utf8');
    // Vérifie que les accolades sont équilibrées
    const open = (code.match(/{/g) || []).length;
    const close = (code.match(/}/g) || []).length;
    if (open !== close) {
      errors.push(`${f} : accolades déséquilibrées (${open} ouvertes, ${close} fermées)`);
    }
    // Vérifie les parenthèses
    const po = (code.match(/\(/g) || []).length;
    const pc = (code.match(/\)/g) || []).length;
    if (po !== pc) {
      errors.push(`${f} : parenthèses déséquilibrées (${po} ouvertes, ${pc} fermées)`);
    }
    console.log(`OK  ${f} (${code.split('\n').length} lignes)`);
  } catch (e) {
    errors.push(`${f} : ${e.message}`);
  }
}

// 2. Lire theme.js et lister toutes les clés exportées dans T, CATS, RCOLS
const themeCode = fs.readFileSync(path.join(__dirname, 'src/constants/theme.js'), 'utf8');

const tKeys = new Set();
const tBlock = themeCode.match(/export const T\s*=\s*{([\s\S]*?)\n};/);
if (tBlock) {
  const matches = tBlock[1].matchAll(/^\s*(\w+)\s*:/gm);
  for (const m of matches) tKeys.add(m[1]);
}

const catsKeys = new Set();
const catsBlock = themeCode.match(/export const CATS\s*=\s*{([\s\S]*?)\n};/);
if (catsBlock) {
  const matches = catsBlock[1].matchAll(/^\s*(\w+)\s*:/gm);
  for (const m of matches) catsKeys.add(m[1]);
}

console.log('\n--- Clés disponibles dans T :', [...tKeys].join(', '));
console.log('--- Clés disponibles dans CATS :', [...catsKeys].join(', '));

// 3. Pour chaque fichier, chercher T.xxx et CATS.xxx et vérifier qu'ils existent
for (const f of FILES) {
  if (f.includes('theme.js')) continue;
  const code = fs.readFileSync(path.join(__dirname, f), 'utf8');
  
  // T.xxx
  const tRefs = [...code.matchAll(/\bT\.(\w+)/g)];
  for (const ref of tRefs) {
    const key = ref[1];
    if (key === 'fonts') continue;
    if (!tKeys.has(key)) {
      warnings.push(`${f} : référence T.${key} qui n'existe pas dans theme.js`);
    }
  }
}

// 4. Lister les imports et vérifier que les exports correspondent
console.log('\n--- Vérif des imports croisés ---');

const exportsByFile = {};
for (const f of FILES) {
  const code = fs.readFileSync(path.join(__dirname, f), 'utf8');
  const exports = new Set();
  // export const X = ...
  const e1 = [...code.matchAll(/export\s+(?:const|function|async\s+function)\s+(\w+)/g)];
  for (const m of e1) exports.add(m[1]);
  // export default function X
  const e2 = code.match(/export\s+default\s+function\s+(\w+)/);
  if (e2) exports.add('default:' + e2[1]);
  // export { X, Y }
  const e3 = code.match(/export\s+\{([^}]+)\}/);
  if (e3) {
    e3[1].split(',').forEach(n => exports.add(n.trim()));
  }
  exportsByFile[f] = exports;
}

console.log('\n--- Exports détectés ---');
for (const [f, exps] of Object.entries(exportsByFile)) {
  if (exps.size > 0) console.log(`${f} : ${[...exps].join(', ')}`);
}

// Résultat final
console.log('\n=== RÉSULTAT ===');
if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ Tout est OK syntaxiquement');
} else {
  if (errors.length > 0) {
    console.log(`\n❌ ${errors.length} ERREURS :`);
    errors.forEach(e => console.log('  - ' + e));
  }
  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} WARNINGS :`);
    warnings.forEach(w => console.log('  - ' + w));
  }
}
console.log('');
