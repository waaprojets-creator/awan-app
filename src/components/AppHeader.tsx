import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion } from 'motion/react';
import { HexagonLogo, ICON_SIZE } from '../constants/icons';
import { L } from '../constants/labels';
import { Touch } from './ui/Touch';

interface AppHeaderProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export default function AppHeader({ currentRoute, onNavigate }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const isOn = (name: string) => currentRoute === name;

  return (
    <div
      className="flex flex-row items-center justify-between px-6 pb-2 border-b border-white/5"
      style={{
        paddingTop: insets.top + 8,
        backgroundColor: 'var(--color-awan-bg)',
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
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 900,
              letterSpacing: '0.29em',
              color: isOn('Analyse') ? 'var(--color-awan-gold)' : 'var(--color-awan-tx)',
              textTransform: 'uppercase',
              transition: 'color 0.2s',
            }}
          >
            {(L as { header: { latin: string } }).header.latin}
          </span>
        </Touch>
      </div>

      {/* Logo hexagone → Dashboard — rotation uniquement, pas de scale */}
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
              color={isOn('Dashboard') ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)'}
            />
          </motion.div>
        </Touch>
      </div>

      {/* AWAN arabe → Islam — style identique au latin */}
      <div className="flex-1 flex justify-end">
        <Touch
          onPress={() => onNavigate('Islam')}
          disabled={isOn('Islam')}
          className="flex flex-col items-end"
        >
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              fontWeight: 900,
              letterSpacing: '0.29em',
              color: isOn('Islam') ? 'var(--color-awan-gold)' : 'var(--color-awan-tx)',
              transition: 'color 0.2s',
            }}
          >
            {(L as { header: { arabic: string } }).header.arabic}
          </span>
        </Touch>
      </div>
    </div>
  );
}
