import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AV } from '../constants/theme';

export async function hashPin(pin) {
  const normalized = pin.toLowerCase() + '_awan_v1';
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    normalized
  );
}

export async function storeKey(key) {
  await SecureStore.setItemAsync('awan_key', key);
}
export async function retrieveKey() {
  return await SecureStore.getItemAsync('awan_key');
}
export async function deleteKey() {
  await SecureStore.deleteItemAsync('awan_key');
}

export async function saveCfg(cfg) {
  await AsyncStorage.setItem('awan_cfg', JSON.stringify(cfg));
}
export async function loadCfg() {
  const raw = await AsyncStorage.getItem('awan_cfg');
  return raw ? JSON.parse(raw) : {
    dev: true,
    pinOn: false,
    pinHash: null,
    transport: 'car',
    modules: [],
  };
}

const EMPTY_DB = {
  events: [],
  tasks: [],
  routines: [],
  meals: [],
  sport: [],
  mesures: [],
  pantry: [],
  pLog: [],
  obj: { kc: 0, pr: 0, gl: 0, li: 0 },
  cfg: { lat: 48.8566, lon: 2.3522 },
};

export async function saveDB(db) {
  const pkg = {
    awan_format: 'backup',
    awan_version: AV,
    platform: 'apk',
    encrypted: false,
    created_at: new Date().toISOString(),
    integrity: buildIntegrity(db),
    payload: JSON.stringify(db),
  };
  await AsyncStorage.setItem('awan_data', JSON.stringify(pkg));
}

export async function loadDB() {
  const raw = await AsyncStorage.getItem('awan_data');
  if (!raw) return { ...EMPTY_DB };
  try {
    const pkg = JSON.parse(raw);
    const loaded = JSON.parse(pkg.payload);
    return { ...EMPTY_DB, ...loaded };
  } catch (e) {
    return { ...EMPTY_DB };
  }
}

export function buildIntegrity(db) {
  const dates = db.events.map(e => e.date).sort();
  return {
    event_count: db.events.length,
    task_count: db.tasks.length,
    routine_count: db.routines.length,
    meal_count: db.meals.length,
    sport_count: db.sport.length,
    pantry_count: db.pantry.length,
    from: dates[0] || null,
    to: dates[dates.length - 1] || null,
  };
}

export function parseAwanFile(content) {
  const pkg = JSON.parse(content);
  if (!pkg.awan_format || !pkg.awan_version) {
    throw new Error('Format non reconnu');
  }
  return pkg;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
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
