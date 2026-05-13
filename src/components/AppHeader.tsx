import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion } from 'motion/react';
import { useTheme } from '../hooks/useTheme';
import { HexagonLogo, ICON_SIZE } from '../constants/icons';
import { L } from '../constants/labels';
import { Touch } from './ui/Touch';

interface AppHeaderProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export default function AppHeader({ currentRoute, onNavigate }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const isOn = (name: string) => currentRoute === name;
  const colorFor = (name: string) => (isOn(name) ? theme.selected : theme.text);

  return (
    <div
      className="flex flex-row items-center justify-between px-6 pb-2 border-b border-white/5"
      style={{ paddingTop: insets.top + 8, backgroundColor: theme.bg }}
    >
      <div className="flex-1">
        <Touch
          onPress={() => onNavigate('Analyse')}
          disabled={isOn('Analyse')}
          className="flex flex-col items-start"
        >
          <motion.span
            animate={{ color: colorFor('Analyse') }}
            className="text-sm font-bold tracking-[0.25em] font-mono uppercase"
          >
            {(L as { header: { latin: string } }).header.latin}
          </motion.span>
          <div
            className={`h-0.5 w-4 mt-1 transition-all duration-300 ${
              isOn('Analyse') ? 'bg-awan-gold w-8' : 'bg-transparent'
            }`}
          />
        </Touch>
      </div>

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
          >
            <HexagonLogo
              size={(ICON_SIZE as { header: number }).header}
              variant="simple"
              color={colorFor('Dashboard')}
            />
          </motion.div>
        </Touch>
      </div>

      <div className="flex-1 flex justify-end">
        <Touch
          onPress={() => onNavigate('Islam')}
          disabled={isOn('Islam')}
          className="flex flex-col items-end"
        >
          <motion.span
            animate={{ color: colorFor('Islam') }}
            className="text-xl font-bold font-sans"
          >
            {(L as { header: { arabic: string } }).header.arabic}
          </motion.span>
          <div
            className={`h-0.5 w-4 mt-1 transition-all duration-300 ${
              isOn('Islam') ? 'bg-awan-gold w-8' : 'bg-transparent'
            }`}
          />
        </Touch>
      </div>
    </div>
  );
}
