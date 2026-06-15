import { getStorage } from '@/data/storage/storageService';
import { safeStorage } from '@/utils/safeStorage';

export interface FoodEntry {
  id: string;
  n: string;       // nom
  kcal: number;    // par 100g
  p: number;       // protéines
  c: number;       // glucides
  f: number;       // lipides
  fiberG?: number;
  halal: boolean;
  barcode?: string | undefined;
}

const CUSTOM_FOOD_PREFIX = 'nutrition.food.custom.';

let foodsCache: FoodEntry[] | null = null;
let customFoodsCache: FoodEntry[] = [];

export async function loadFoodDatabase(): Promise<FoodEntry[]> {
  if (foodsCache) return foodsCache;
  try {
    const res = await fetch('/data/foods.json');
    if (!res.ok) return [];
    const data = (await res.json()) as FoodEntry[];
    foodsCache = data;
    return foodsCache;
  } catch (e) {
    console.warn('[nutritionData] failed to load foods:', e);
    return [];
  }
}

export async function loadCustomFoods(): Promise<FoodEntry[]> {
  try {
    const storage = await getStorage();
    const keys = await storage.list(CUSTOM_FOOD_PREFIX);
    const entries: FoodEntry[] = [];
    for (const key of keys) {
      const food = await storage.get<FoodEntry>(key, (raw) => raw as FoodEntry);
      if (food) entries.push(food);
    }
    customFoodsCache = entries;
    return customFoodsCache;
  } catch (e) {
    console.warn('[nutritionData] failed to load custom foods:', e);
    return [];
  }
}

export async function saveCustomFood(food: FoodEntry): Promise<void> {
  const storage = await getStorage();
  await storage.set(`${CUSTOM_FOOD_PREFIX}${food.id}`, food);
  // Update in-memory cache
  customFoodsCache = [food, ...customFoodsCache.filter(f => f.id !== food.id)];
}

export function getFoods(): FoodEntry[] {
  return [...(foodsCache ?? []), ...customFoodsCache];
}

export function searchFoods(query: string): FoodEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return getFoods().slice(0, 50);
  return getFoods()
    .filter(f => f.n.toLowerCase().includes(q))
    .slice(0, 50);
}

export function getFoodByBarcode(barcode: string): FoodEntry | undefined {
  return getFoods().find(f => f.barcode === barcode);
}

const FAVORITES_KEY = 'awan.nutrition.recentFoods';
const FAVORITES_MAX = 10;

export function getRecentFoodIds(): string[] {
  try { return JSON.parse(safeStorage.get(FAVORITES_KEY) ?? '[]') as string[]; }
  catch { return []; }
}

export function recordRecentFood(id: string): void {
  const ids = [id, ...getRecentFoodIds().filter(x => x !== id)].slice(0, FAVORITES_MAX);
  try { safeStorage.set(FAVORITES_KEY, JSON.stringify(ids)); } catch { /* quota */ }
}

export function getRecentFoods(): FoodEntry[] {
  const ids = getRecentFoodIds();
  const all = getFoods();
  return ids.map(id => all.find(f => f.id === id)).filter((f): f is FoodEntry => f != null);
}
