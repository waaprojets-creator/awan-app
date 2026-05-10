import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion } from 'motion/react';
import { useTheme } from '../hooks/useTheme';
import { IconPlanning, IconTrajet, IconSante, IconReglages, ICON_SIZE } from '../constants/icons';
import { FileText } from 'lucide-react';
import { L } from '../constants/labels';
import { Touch } from './ui/Touch';

interface BottomNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

interface TabDef {
  route: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
}

const TABS: TabDef[] = [
  { route: 'Planning', label: (L as { tabs: { planning: string } }).tabs.planning, icon: IconPlanning as TabDef['icon'] },
  { route: 'Journal',  label: 'Journal', icon: ({ size, color }) => <FileText size={size} color={color} /> },
  { route: 'Trajet',   label: (L as { tabs: { trajet: string } }).tabs.trajet,   icon: IconTrajet as TabDef['icon'] },
  { route: 'Sante',    label: (L as { tabs: { sante: string } }).tabs.sante,    icon: IconSante as TabDef['icon'] },
  { route: 'Reglages', label: (L as { tabs: { reglages: string } }).tabs.reglages, icon: IconReglages as TabDef['icon'] },
];

export default function BottomNav({ currentRoute, onNavigate }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <div
      className="flex flex-row bg-awan-bg border-t border-white/5 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12), backdropFilter: 'blur(20px)' }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active =
          currentRoute === tab.route ||
          (tab.route === 'Reglages' && currentRoute === 'Settings');

        return (
          <Touch
            key={tab.route}
            className="flex-1 flex flex-col items-center justify-center py-2 relative"
            onPress={() => onNavigate(tab.route)}
          >
            <motion.div
              animate={{ scale: active ? 1.1 : 1, opacity: active ? 1 : 0.4 }}
              className="mb-1"
            >
              <Icon
                size={(ICON_SIZE as { tab: number }).tab ?? 20}
                color={active ? theme.title : theme.text}
              />
            </motion.div>

            <span
              className={`text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                active ? 'text-awan-gold' : 'text-awan-tx-mute'
              }`}
            >
              {tab.label}
            </span>

            {active && (
              <motion.div
                layoutId="nav-glow"
                className="absolute inset-0 bg-awan-gold/5 blur-xl -z-10 rounded-full"
              />
            )}
            {active && (
              <motion.div
                layoutId="nav-line"
                className="absolute -top-[13px] h-0.5 w-6 bg-awan-gold rounded-full shadow-[0_0_8px_rgba(212,175,55,0.8)]"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </Touch>
        );
      })}
    </div>
  );
}
