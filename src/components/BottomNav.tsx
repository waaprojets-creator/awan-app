import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion } from 'motion/react';
import { IconPlanning, IconTrajet, IconSante, IconReglages, ICON_SIZE } from '../constants/icons';
import { FileText } from 'lucide-react';
import { L } from '../constants/labels';
import { Touch } from './ui/Touch';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAppStore } from '../data/store/appStore';
import { MoonMenu } from './MoonMenu';

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

const ICON_SZ = (ICON_SIZE as { tab: number }).tab ?? 20;

export default function BottomNav({ currentRoute, onNavigate }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const network = useNetworkStatus();
  const { isOfflineForced, toggleOffline } = useAppStore();

  const isEffectivelyOffline = isOfflineForced || !network.isOnline;
  const statusColor = isEffectivelyOffline
    ? 'var(--color-awan-tx-mute)'
    : 'var(--color-awan-status-ok)';

  return (
    <>
      <MoonMenu onNavigate={onNavigate} currentRoute={currentRoute} />
    <div
      className="flex flex-row border-t relative"
      style={{
        backgroundColor: 'var(--color-awan-bg)',
        borderTopColor: 'rgba(255,255,255,0.06)',
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      {/* Network status indicator dot */}
      <motion.div
        className="absolute top-2 right-4 w-2 h-2 rounded-full"
        style={{ backgroundColor: statusColor }}
        animate={{ opacity: isEffectivelyOffline ? 0.5 : 1 }}
        transition={{ duration: 0.3 }}
      />

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
            <Icon
              size={ICON_SZ}
              color={active ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)'}
            />

            {/* Cairo 600 — label tactique */}
            <span
              className="mt-1.5 uppercase tracking-[0.15em]"
              style={{
                fontFamily: 'Cairo, sans-serif',
                fontSize: '8px',
                fontWeight: active ? 700 : 600,
                color: active ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)',
                letterSpacing: '0.15em',
              }}
            >
              {tab.label}
            </span>
          </motion.div>
        );
      })}
    </div>
    </>
  );
}
