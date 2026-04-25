import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { saveDB, loadDB, saveCfg, loadCfg } from '../utils/storage';

const AppStateContext = createContext();

const initialState = {
  db: null,
  cfg: null,
  ready: false,
  loading: false,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_INITIAL':
      return { ...state, db: action.db, cfg: action.cfg, ready: true, loading: false };
    case 'SET_ERROR':
      return { 
        ...state, 
        db: action.defaultDb, 
        cfg: action.defaultCfg, 
        ready: true, 
        loading: false 
      };
    case 'UPDATE_DB':
      return { ...state, db: action.db };
    case 'UPDATE_CFG':
      return { ...state, cfg: action.cfg };
    case 'SET_LOADING':
      return { ...state, loading: true };
    default:
      return state;
  }
}

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const initializeApp = useCallback(async () => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const [loadedDb, loadedCfg] = await Promise.all([loadDB(), loadCfg()]);
      dispatch({ type: 'SET_INITIAL', db: loadedDb, cfg: loadedCfg });
    } catch (e) {
      console.error('App initialization failed:', e);
      dispatch({
        type: 'SET_ERROR',
        defaultDb: { events: [], tasks: [], routines: [], meals: [], sport: [], mesures: [], pantry: [], pLog: [], obj: {}, cfg: {} },
        defaultCfg: { dev: true, pinOn: false, pinHash: null, modules: [] },
      });
    }
  }, []);

  const updateDb = useCallback(async (newDb) => {
    // CRITICAL: Persist BEFORE updating UI to prevent data loss
    try {
      await saveDB(newDb);
      dispatch({ type: 'UPDATE_DB', db: newDb });
    } catch (e) {
      console.error('Failed to save DB:', e);
      throw e;
    }
  }, []);

  const updateCfg = useCallback(async (newCfg) => {
    try {
      await saveCfg(newCfg);
      dispatch({ type: 'UPDATE_CFG', cfg: newCfg });
    } catch (e) {
      console.error('Failed to save config:', e);
      throw e;
    }
  }, []);

  const value = {
    ...state,
    initializeApp,
    updateDb,
    updateCfg,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}
