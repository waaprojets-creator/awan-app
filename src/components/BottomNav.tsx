import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion } from 'motion/react';
import { useTheme } from '../hooks/useTheme';
import {
  IconPlanning, IconTrajet, IconSante, IconReglages, ICON_SIZE,
} from '../constants/icons';
import { FileText } from 'lucide-react';
import { L } from '../constants/labels';
import { Touch } from './ui/Touch';

const TABS = [
  { route: 'Planning', label: L.tabs.planning, icon: IconPlanning },
  { route: 'Journal',  label: 'Journal',       icon: ({ size, color }) => <FileText size={size} color={color} /> },
  { route: 'Trajet',   label: L.tabs.trajet,   icon: IconTrajet   },
  { route: 'Sante',    label: L.tabs.sante,    icon: IconSante    },
  { route: 'Reglages', label: L.tabs.reglages, icon: IconReglages },
];

export default function BottomNav({ currentRoute, onNavigate }: any) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <div 
      className="flex flex-row bg-awan-bg border-t border-white/5 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12), backdropFilter: 'blur(20px)' }}
    >
      {TABS.map(tab => {
        const Icon = tab.icon;
        const active = currentRoute === tab.route || (tab.route === 'Reglages' && currentRoute === 'Settings');
        
        return (
          <Touch
            key={tab.route}
            className="flex-1 flex flex-col items-center justify-center py-2 relative"
            onPress={() => onNavigate(tab.route)}
          >
            <motion.div
              animate={{ 
                scale: active ? 1.1 : 1,
                opacity: active ? 1 : 0.4
              }}
              className="mb-1"
            >
              <Icon size={20} color={active ? theme.title : theme.text} />
            </motion.div>
            
            <span 
              className={`text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${active ? 'text-awan-gold' : 'text-awan-tx-mute'}`}
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
