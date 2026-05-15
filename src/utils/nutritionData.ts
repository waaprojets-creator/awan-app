export interface FoodEntry {
  id: string;
  n: string;       // nom
  kcal: number;    // par 100g
  p: number;       // protéines
  c: number;       // glucides
  f: number;       // lipides
  halal: boolean;
  barcode?: string | undefined;
}

let foodsCache: FoodEntry[] | null = null;

export async function loadFoodDatabase(): Promise<FoodEntry[]> {
  if (foodsCache) return foodsCache;
  const res = await fetch('/data/foods.json');
  const data = (await res.json()) as FoodEntry[];
  foodsCache = data;
  return foodsCache;
}

export function getFoods(): FoodEntry[] {
  return foodsCache ?? [];
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
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]') as string[]; }
  catch { return []; }
}

export function recordRecentFood(id: string): void {
  const ids = [id, ...getRecentFoodIds().filter(x => x !== id)].slice(0, FAVORITES_MAX);
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids)); } catch { /* quota */ }
}

export function getRecentFoods(): FoodEntry[] {
  const ids = getRecentFoodIds();
  const all = getFoods();
  return ids.map(id => all.find(f => f.id === id)).filter((f): f is FoodEntry => f != null);
}
