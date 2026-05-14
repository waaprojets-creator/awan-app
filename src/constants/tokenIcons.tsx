import React from 'react';
import {
  Dumbbell, Utensils, Scale, Repeat, Clock, Hash, Star,
  Map, Moon, Ruler, Flag, Plus, Brain, Flame, Radio,
  FileText, Zap, Clipboard, Dna, Activity, Droplets,
} from 'lucide-react';

// Token icon keys (strings stored in entry.tokens[].icon)
export const TOKEN_ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  dumbbell:  Dumbbell,
  utensils:  Utensils,
  scale:     Scale,
  repeat:    Repeat,
  clock:     Clock,
  hash:      Hash,
  star:      Star,
  map:       Map,
  moon:      Moon,
  ruler:     Ruler,
  flag:      Flag,
  plus:      Plus,
  brain:     Brain,
  flame:     Flame,
  radio:     Radio,
  file:      FileText,
  zap:       Zap,
  clipboard: Clipboard,
  dna:       Dna,
  activity:  Activity,
  drop:      Droplets,
};

// Module → icon key mapping (used in JournalScreen, DailyCanvas)
export const MODULE_ICON_KEY: Record<string, string> = {
  nutrition:   'utensils',
  sport:       'dumbbell',
  trajet:      'map',
  islam:       'star',
  mesure:      'ruler',
  task:        'flag',
  sante:       'activity',
  mental:      'brain',
  mensuration: 'scale',
};

interface TokenIconProps {
  iconKey?: string;
  size?: number;
  color?: string;
}

export function TokenIcon({ iconKey = 'file', size = 16, color = 'var(--color-awan-gold)' }: TokenIconProps) {
  const Icon = TOKEN_ICON_MAP[iconKey] ?? FileText;
  return <Icon size={size} color={color} strokeWidth={1.5} />;
}
