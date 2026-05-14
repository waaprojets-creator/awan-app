export interface DailyEntry {
  id: string;
  date: string;
  module: string;
  [key: string]: unknown;
}

export type ModuleType = 'nutrition' | 'sport' | 'islam' | 'mental' | 'planning' | 'journal' | string;
