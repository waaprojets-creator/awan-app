import React, { createContext, useContext, useState, useCallback } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';
import { motion, AnimatePresence } from '@/components/motion';

type ToastType = 'success' | 'error' | 'info';

interface ToastMsg { id: number; message: string; type: ToastType; }

const Ctx = createContext<{ toast: (msg: string, type?: ToastType) => void }>({ toast: () => {} });

export function useToast() { return useContext(Ctx); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  }, []);

  const COLOR: Record<ToastType, string> = {
    success: theme.statusOk,
    error:   theme.danger,
    info:    theme.selected,
  };

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', pointerEvents: 'none' }}>
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              style={{
                backgroundColor: theme.surface,
                borderLeft: `3px solid ${COLOR[t.type]}`,
                color: COLOR[t.type],
                fontFamily: FontMono,
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.2em',
                padding: '8px 16px',
                textTransform: 'uppercase',
                border: `1px solid ${COLOR[t.type]}`,
                borderRadius: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
