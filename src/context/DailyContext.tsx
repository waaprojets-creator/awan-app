import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { useAppState } from './AppStateContext';
import { BaseDailyEntry } from '../types/daily';

// The state stores tokens grouped by day ID (YYYY-MM-DD)
interface DailyState {
  records: Record<string, BaseDailyEntry[]>;
}

type Action = 
  | { type: 'SET_DAILY_RECORDS'; records: Record<string, BaseDailyEntry[]> }
  | { type: 'ADD_ENTRY'; dateId: string; entry: BaseDailyEntry }
  | { type: 'UPDATE_ENTRY'; dateId: string; entry: BaseDailyEntry }
  | { type: 'REMOVE_ENTRY'; dateId: string; entryId: string }
  | { type: 'MOVE_ENTRY'; dateId: string; activeId: string; overId: string }; // For Dnd

const initialState: DailyState = { records: {} };

const DailyContext = createContext<{
  state: DailyState;
  addEntry: (dateId: string, entry: BaseDailyEntry) => void;
  updateEntry: (dateId: string, entry: BaseDailyEntry) => void;
  removeEntry: (dateId: string, entryId: string) => void;
  moveEntry: (dateId: string, activeId: string, overId: string) => void;
  getEntriesByDate: (dateId: string) => BaseDailyEntry[];
} | null>(null);

function dailyReducer(state: DailyState, action: Action): DailyState {
  switch (action.type) {
    case 'SET_DAILY_RECORDS':
      return { ...state, records: action.records };
    case 'ADD_ENTRY': {
      const current = state.records[action.dateId] || [];
      return {
        ...state,
        records: { ...state.records, [action.dateId]: [...current, action.entry] },
      };
    }
    case 'UPDATE_ENTRY': {
      const current = state.records[action.dateId] || [];
      return {
        ...state,
        records: {
          ...state.records,
          [action.dateId]: current.map((e) => (e.id === action.entry.id ? action.entry : e)),
        },
      };
    }
    case 'REMOVE_ENTRY': {
      const current = state.records[action.dateId] || [];
      return {
        ...state,
        records: { ...state.records, [action.dateId]: current.filter((e) => e.id !== action.entryId) },
      };
    }
    case 'MOVE_ENTRY': {
      const current = state.records[action.dateId] || [];
      const oldIndex = current.findIndex(e => e.id === action.activeId);
      const newIndex = current.findIndex(e => e.id === action.overId);
      if (oldIndex === -1 || newIndex === -1) return state;
      
      const newEntries = [...current];
      const [moved] = newEntries.splice(oldIndex, 1);
      newEntries.splice(newIndex, 0, moved);
      
      return {
        ...state,
        records: { ...state.records, [action.dateId]: newEntries }
      };
    }
    default:
      return state;
  }
}

export function DailyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(dailyReducer, initialState);
  const { db, updateDb } = useAppState();

  // Load from DB when available
  React.useEffect(() => {
    if (db && db.dailyRecords) {
      dispatch({ type: 'SET_DAILY_RECORDS', records: db.dailyRecords });
    }
  }, [db]);

  // Persist to DB on change (debounce in real app, simplistic approach here)
  const persist = useCallback((newState: DailyState) => {
    if (db) {
      updateDb({ ...db, dailyRecords: newState.records });
    }
  }, [db, updateDb]);

  const addEntry = useCallback((dateId: string, entry: BaseDailyEntry) => {
    dispatch({ type: 'ADD_ENTRY', dateId, entry });
    if (db) updateDb({ ...db, dailyRecords: { ...state.records, [dateId]: [...(state.records[dateId] || []), entry] }});
  }, [db, state.records, updateDb]);

  const updateEntry = useCallback((dateId: string, entry: BaseDailyEntry) => {
    dispatch({ type: 'UPDATE_ENTRY', dateId, entry });
    if (db) {
      const current = state.records[dateId] || [];
      updateDb({ 
        ...db, 
        dailyRecords: { 
          ...state.records, 
          [dateId]: current.map(e => e.id === entry.id ? entry : e) 
        }
      });
    }
  }, [db, state.records, updateDb]);

  const removeEntry = useCallback((dateId: string, entryId: string) => {
    dispatch({ type: 'REMOVE_ENTRY', dateId, entryId });
    if (db) {
      const current = state.records[dateId] || [];
      updateDb({ 
        ...db, 
        dailyRecords: { 
          ...state.records, 
          [dateId]: current.filter(e => e.id !== entryId) 
        }
      });
    }
  }, [db, state.records, updateDb]);

  const moveEntry = useCallback((dateId: string, activeId: string, overId: string) => {
    dispatch({ type: 'MOVE_ENTRY', dateId, activeId, overId });
    if (db) {
      const current = state.records[dateId] || [];
      const oldIndex = current.findIndex(e => e.id === activeId);
      const newIndex = current.findIndex(e => e.id === overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newEntries = [...current];
        const [moved] = newEntries.splice(oldIndex, 1);
        newEntries.splice(newIndex, 0, moved);
        updateDb({ ...db, dailyRecords: { ...state.records, [dateId]: newEntries }});
      }
    }
  }, [db, state.records, updateDb]);

  const getEntriesByDate = useCallback((dateId: string) => {
    return state.records[dateId] || [];
  }, [state.records]);

  const value = useMemo(() => ({
    state, addEntry, updateEntry, removeEntry, moveEntry, getEntriesByDate
  }), [state, addEntry, updateEntry, removeEntry, moveEntry, getEntriesByDate]);

  return <DailyContext.Provider value={value}>{children}</DailyContext.Provider>;
}

export function useDaily() {
  const context = useContext(DailyContext);
  if (!context) throw new Error('useDaily must be used within DailyProvider');
  return context;
}
