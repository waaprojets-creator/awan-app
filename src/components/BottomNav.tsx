import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion } from 'motion/react';
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
  { route: 'Journal',  label: 'JOURNAL', icon: ({ size, color }) => <FileText size={size} color={color} /> },
  { route: 'Trajet',   label: (L as { tabs: { trajet: string } }).tabs.trajet,   icon: IconTrajet as TabDef['icon'] },
  { route: 'Sante',    label: (L as { tabs: { sante: string } }).tabs.sante,    icon: IconSante as TabDef['icon'] },
  { route: 'Reglages', label: (L as { tabs: { reglages: string } }).tabs.reglages, icon: IconReglages as TabDef['icon'] },
];

const GOLD  = '#D4AF37';
const MUTE  = '#6C665E';
const ICON_SZ = (ICON_SIZE as { tab: number }).tab ?? 20;

export default function BottomNav({ currentRoute, onNavigate }: BottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <div
      className="flex flex-row border-t"
      style={{
        backgroundColor: '#0A0A0A',
        borderTopColor: '#1A1A1A',
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active =
          currentRoute === tab.route ||
          (tab.route === 'Reglages' && currentRoute === 'Settings');

        return (
          <motion.div
            key={tab.route}
            className="flex-1 flex flex-col items-center justify-center pt-3 relative cursor-pointer select-none"
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={() => onNavigate(tab.route)}
          >
            {/* Indicateur actif — ligne 2px top */}
            {active && (
              <motion.div
                layoutId="tb-nav-indicator"
                className="absolute top-0 left-4 right-4 h-[2px]"
                style={{ backgroundColor: GOLD }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}

            <Icon size={ICON_SZ} color={active ? GOLD : MUTE} />

            {/* Cairo 600 — label tactique */}
            <span
              className="mt-1.5 uppercase tracking-[0.15em]"
              style={{
                fontFamily: 'Cairo, sans-serif',
                fontSize: '8px',
                fontWeight: active ? 700 : 600,
                color: active ? GOLD : MUTE,
                letterSpacing: '0.15em',
              }}
            >
              {tab.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
