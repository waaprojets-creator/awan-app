import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion } from 'motion/react';
import { HexagonLogo, ICON_SIZE } from '../constants/icons';
import { L } from '../constants/labels';
import { Touch } from './ui/Touch';
import { useTheme } from '../hooks/useTheme';
import { FontSans } from '../constants/typography';

interface AppHeaderProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

const LABEL_STYLE_BASE = {
  fontFamily: FontSans,
  fontWeight: 900,
  letterSpacing: '0.33em',
  textTransform: 'uppercase' as const,
  transition: 'color 0.2s',
} as const;

export default function AppHeader({ currentRoute, onNavigate }: AppHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isOn = (name: string) => currentRoute === name;

  return (
    <div
      className="flex flex-row items-center justify-between px-6 pb-2 border-b border-white/5"
      style={{
        paddingTop: insets.top + 8,
        backgroundColor: theme.bg,
      }}
    >
      {/* AWAN latin → Analyse */}
      <div className="flex-1">
        <Touch
          onPress={() => onNavigate('Analyse')}
          disabled={isOn('Analyse')}
          className="flex flex-col items-start"
        >
          <span
            style={{
              ...LABEL_STYLE_BASE,
              fontSize: '13px',
              color: isOn('Analyse') ? theme.selected : theme.title,
            }}
          >
            {(L as { header: { latin: string } }).header.latin}
          </span>
        </Touch>
      </div>

      {/* Logo hexagone → Dashboard */}
      <div className="flex justify-center items-center px-4">
        <Touch
          onPress={() => onNavigate('Dashboard')}
          scale={0.9}
          disabled={isOn('Dashboard')}
        >
          <motion.div
            animate={{ rotate: isOn('Dashboard') ? 0 : -30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <HexagonLogo
              size={(ICON_SIZE as { header: number }).header}
              variant="simple"
              color={isOn('Dashboard') ? theme.selected : theme.mute}
            />
          </motion.div>
        </Touch>
      </div>

      {/* AWAN arabe → Islam */}
      <div className="flex-1 flex justify-end">
        <Touch
          onPress={() => onNavigate('Islam')}
          disabled={isOn('Islam')}
          className="flex flex-col items-end"
        >
          <span
            style={{
              ...LABEL_STYLE_BASE,
              fontSize: '14px',
              color: isOn('Islam') ? theme.selected : theme.title,
            }}
          >
            {(L as { header: { arabic: string } }).header.arabic}
          </span>
        </Touch>
      </div>
    </div>
  );
}
