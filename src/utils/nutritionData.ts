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
