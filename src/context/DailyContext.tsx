// @ts-nocheck — shim legacy. Supprimé lors de la réécriture des écrans.
import React, { createContext, useContext } from 'react';

const DailyContext = createContext(null);

export function DailyProvider({ children }) {
  return <DailyContext.Provider value={null}>{children}</DailyContext.Provider>;
}

export function useDaily() {
  return {
    entries: [],
    getEntriesByDate: () => [],
    addEntry: () => {},
    removeEntry: () => {},
  };
}
