import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Plus, X, CheckSquare, Utensils, PenLine, Dumbbell } from 'lucide-react-native';
import { Touch } from './Touch';
import { useTheme } from '../../hooks/useTheme';
import { FontSans, FontMono } from '../../constants/typography';
import { Fs, Fw, Ls, Sp, Clr } from '../../theme/tokens';

const ACTIONS = [
  { id: 'task',      label: 'Tâche',  icon: CheckSquare, color: '#D4AF37', route: 'Tasks' },
  { id: 'nutrition', label: 'Repas',  icon: Utensils,    color: '#8C7E6E', route: 'Nutrition' },
  { id: 'sport',     label: 'Sport',  icon: Dumbbell,    color: '#F0EDE8', route: 'Sport' },
  { id: 'journal',   label: 'Pensée', icon: PenLine,     color: '#D4AF37', route: 'Journal' },
];

interface QuickActionsProps {
  onNavigate: (route: string) => void;
}

export function QuickActions({ onNavigate }: QuickActionsProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (route: string) => {
    setIsOpen(false);
    onNavigate(route);
  };

  return (
    // Position absolue dans le wrapper MainLayout
    <View style={s.wrapper}>
      {isOpen && (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)} style={s.menu}>
          {ACTIONS.map((action) => (
            <Touch key={action.id} onPress={() => handleAction(action.route)} style={[s.menuItem, { backgroundColor: theme.surface, borderColor: Clr.white10 }]}>
              <Text style={[s.menuLabel, { color: theme.title }]}>{action.label}</Text>
              <View style={[s.menuIcon, { backgroundColor: `${action.color}20` }]}>
                <action.icon size={20} color={action.color} />
              </View>
            </Touch>
          ))}
        </Animated.View>
      )}

      <Touch
        onPress={() => setIsOpen(v => !v)}
        style={[s.fab, { backgroundColor: isOpen ? theme.surface : theme.selected, borderColor: Clr.white10 }]}
      >
        {isOpen ? <X size={28} color="#D4AF37" /> : <Plus size={28} color="white" />}
      </Touch>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 96,
    right: 24,
    zIndex: 50,
    alignItems: 'flex-end',
    gap: 12,
  },
  menu: { flexDirection: 'column', alignItems: 'flex-end', gap: 12, marginBottom: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    paddingHorizontal: Sp[4],
    paddingVertical: Sp[2],
    borderRadius: 9999,
  },
  menuLabel: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.xs_02 },
  menuIcon: { width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
