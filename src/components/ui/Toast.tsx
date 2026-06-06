import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls, Sp } from '../../theme/tokens';

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
      {/* Toasts positionnés en absolu dans le wrapper root de MainLayout */}
      <View style={s.container} pointerEvents="none">
        {toasts.map(t => (
          <Animated.View
            key={t.id}
            entering={FadeInDown.duration(220)}
            exiting={FadeOutUp.duration(180)}
            style={[
              s.toast,
              {
                backgroundColor: theme.surface,
                borderColor: COLOR[t.type],
              },
            ]}
          >
            <Text style={[s.toastText, { color: COLOR[t.type] }]}>
              {t.message}
            </Text>
          </Animated.View>
        ))}
      </View>
    </Ctx.Provider>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 6,
    zIndex: 9999,
  },
  toast: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: Sp[4],
    paddingVertical: Sp[2],
  },
  toastText: {
    fontFamily: FontMono,
    fontSize: Fs.md,
    fontWeight: Fw.value,
    letterSpacing: Ls.md_02,
    textTransform: 'uppercase',
  },
});
