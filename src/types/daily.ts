export type ModuleType = 'nutrition' | 'sport' | 'trajet' | 'islam' | 'mesure' | 'task' | 'sante' | 'mental' | 'mensuration';

export interface TokenValue {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
}

export interface BaseDailyEntry {
  id: string; // Unique ID (e.g. timestamp or nano id)
  timestamp: number; // For sorting within the day
  module: ModuleType;
  tokens: TokenValue[]; // The core "tokenized" data representation
  rawText?: string; // Optional raw text if entered via natural language
  [x: string]: any;
}

// Module specific types extending BaseDailyEntry if we need strongly typed metadata, 
// but sticking to the pure text/token approach as much as possible as requested:
export interface DailyRecord {
  dateId: string; // YYYY-MM-DD
  entries: BaseDailyEntry[];
  note?: string; 
}
