// @ts-nocheck — shim legacy. Supprimé lors de la réécriture des écrans.
import React, { createContext } from 'react';

const DailyContext = createContext(null);

export function DailyProvider({ children }) {
  return <DailyContext.Provider value={null}>{children}</DailyContext.Provider>;
}

export function useDaily(): any {
  return {
    entries: [],
    getEntriesByDate: (_date?: string) => [],
    addEntry: (_entry?: any) => {},
    removeEntry: (_id?: string) => {},
    moveEntry: (_id?: string, _date?: string) => {},
  };
}
