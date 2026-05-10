import AsyncStorage from '@react-native-async-storage/async-storage';
import { AV } from '../constants/theme';

// SECURITY NOTE: This module handles local storage for the Awan sovereign application.
// In preparation for post-beta, all payloads are processed through an encryption layer.
// Currently utilizing strong hashing for PINs and isolating the database. 
// A future AES-GCM payload encryption step will be activated here to guarantee 
// end-to-end encryption (E2EE) against malware, Samsung/host OS extraction, and cloud providers.

/**
 * AWAN PIN PROTECTION (PBKDF2)
 * Robust hashing for beta phase. 200k iterations with per-user salt.
 */
export async function hashPin(pin, existingSalt = null) {
  const salt = existingSalt ? 
    new Uint8Array(existingSalt.match(/.{1,2}/g).map(byte => parseInt(byte, 16))) : 
    crypto.getRandomValues(new Uint8Array(16));
  
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const iterations = 200000;
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    passwordKey,
    256
  );

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    hash: hashHex,
    salt: saltHex,
    iterations: iterations,
    algo: 'PBKDF2-SHA256'
  };
}

/**
 * SOVEREIGN ENCRYPTION LAYER (Placeholder)
 * Wraps payload before committing to non-volatile storage.
 */
async function encryptPayload(dataObj, key = null) {
  const rawString = JSON.stringify(dataObj);
  // NOTE: Post-beta stage 5 will use 'key' (Argon2 derived) for AES-256-GCM.
  // In current beta, we return plaintext to ensure visibility and verification.
  return rawString;
}

/**
 * SOVEREIGN DECRYPTION LAYER (Placeholder)
 * Unwraps payload when requested by the application.
 */
async function decryptPayload(encryptedString, key = null) {
  // NOTE: Post-beta stage 5 will use 'key' for AES-256-GCM decryption.
  return JSON.parse(encryptedString);
}

export async function saveCfg(cfg) {
  const securePayload = await encryptPayload(cfg);
  await AsyncStorage.setItem('awan_cfg', securePayload);
}

export async function loadCfg() {
  const raw = await AsyncStorage.getItem('awan_cfg');
  try {
    return raw ? await decryptPayload(raw) : {
      dev: true,
      pinOn: false,
      pinHash: null,
      transport: 'car',
      modules: [],
      theme: 'light',
      colorMap: {},
    };
  } catch(e) {
    console.error("Decryption or validation failed", e);
    return { dev: true, pinOn: false, pinHash: null, transport: 'car', modules: [], theme: 'light', colorMap: {} };
  }
}

const EMPTY_DB = {
  events: [], tasks: [], routines: [], meals: [], sport: [],
  routinesMuscu: [],
  workoutLogs: [],
  mesures: [], pantry: [], pLog: [],
  categories: [],
  obj: { kc: 0, pr: 0, gl: 0, li: 0 },
  cfg: { lat: 48.8566, lon: 2.3522 },
  dailyRecords: {}, // YYYY-MM-DD -> BaseDailyEntry[]
  pois: [],
  logs: [],
  lastPos: { lat: 46.2074, lon: 6.1559 },
  metrics: { history: [] }
};

export function validateDB(data) {
  if (!data || typeof data !== 'object') return { ...EMPTY_DB };
  return {
    events: Array.isArray(data.events) ? data.events : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    routines: Array.isArray(data.routines) ? data.routines : [],
    sport: Array.isArray(data.sport) ? data.sport : [],
    routinesMuscu: Array.isArray(data.routinesMuscu) ? data.routinesMuscu : [],
    workoutLogs: Array.isArray(data.workoutLogs) ? data.workoutLogs : [],
    mesures: Array.isArray(data.mesures) ? data.mesures : [],
    meals: Array.isArray(data.meals) ? data.meals : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    obj: data.obj || { kc: 0, pr: 0, gl: 0, li: 0 },
    cfg: data.cfg || { lat: 48.8566, lon: 2.3522 },
    dailyRecords: data.dailyRecords || {},
    // Nouveaux ajouts depuis LocalDbService
    pois: Array.isArray(data.pois) ? data.pois : [],
    logs: Array.isArray(data.logs) ? data.logs : [],
    lastPos: data.lastPos || { lat: 46.2074, lon: 6.1559 },
    metrics: data.metrics || { history: [] }
  };
}

export async function saveDB(db, key = null) {
  const securePayload = await encryptPayload(db, key);
  const pkg = { payload: securePayload, schema_version: '1.0.0_beta' };
  await AsyncStorage.setItem('awan_data', JSON.stringify(pkg));
}

export async function loadDB(key = null) {
  const raw = await AsyncStorage.getItem('awan_data');
  if (!raw) return { ...EMPTY_DB };
  try {
    const pkg = JSON.parse(raw);
    
    // Priority 2.1: Migration logic placeholder
    if (pkg.schema_version && pkg.schema_version.endsWith('_beta')) {
      // Data is in plaintext (beta phase), simply decrypt and return
      // Post-beta: This is where we would re-encrypt with user key if key is provided
    }

    const db = await decryptPayload(pkg.payload, key);
    return validateDB(db);
  } catch (e) {
    console.warn("DB recovery/decryption failed, initializing empty DB.", e);
    return { ...EMPTY_DB };
  }
}

export function buildIntegrity(db) {
  return { event_count: (db.events || []).length };
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function ds(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(str) {
  return new Date(str + 'T12:00:00');
}
