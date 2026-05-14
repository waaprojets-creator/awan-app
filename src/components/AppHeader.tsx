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
      {/* Left — AWAN latin, navigue vers Analyse */}
      <div className="flex-1">
        <Touch
          onPress={() => onNavigate('Analyse')}
          disabled={isOn('Analyse')}
          className="flex flex-col items-start"
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.25em',
              color: isOn('Analyse') ? 'var(--color-awan-gold)' : 'var(--color-awan-tx)',
              textTransform: 'uppercase',
              transition: 'color 0.2s',
            }}
          >
            {(L as { header: { latin: string } }).header.latin}
          </span>
          <div
            style={{
              height: '2px',
              width: isOn('Analyse') ? '32px' : '16px',
              backgroundColor: isOn('Analyse') ? 'var(--color-awan-gold)' : 'transparent',
              marginTop: '4px',
              transition: 'all 0.3s',
            }}
          />
        </Touch>
      </div>

      {/* Center — Logo hexagonal, navigue vers Dashboard */}
      <div className="flex justify-center items-center px-4">
        <Touch
          onPress={() => onNavigate('Dashboard')}
          scale={0.9}
          disabled={isOn('Dashboard')}
        >
          <motion.div
            animate={{
              rotate: isOn('Dashboard') ? 0 : -30,
              scale: isOn('Dashboard') ? 1.1 : 1,
            }}
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

      {/* Right — texte arabe, navigue vers Islam */}
      <div className="flex-1 flex justify-end">
        <Touch
          onPress={() => onNavigate('Islam')}
          disabled={isOn('Islam')}
          className="flex flex-col items-end"
        >
          <span
            style={{
              fontFamily: 'Cairo, sans-serif',
              fontSize: '18px',
              fontWeight: 700,
              color: isOn('Islam') ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)',
              transition: 'color 0.2s',
            }}
          >
            {(L as { header: { arabic: string } }).header.arabic}
          </span>
          <div
            style={{
              height: '2px',
              width: isOn('Islam') ? '32px' : '16px',
              backgroundColor: isOn('Islam') ? 'var(--color-awan-gold)' : 'transparent',
              marginTop: '4px',
              transition: 'all 0.3s',
            }}
          />
        </Touch>
      </div>
    </div>
  );
}
