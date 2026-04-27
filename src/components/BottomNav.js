import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../constants/theme';
import {
  IconPlanning, IconTrajet, IconSante, IconReglages, ICON_SIZE,
} from '../constants/icons';
import { L } from '../constants/labels';

/**
 * Tab bar inférieure custom — immuable, présente sur toutes les screens
 * après déverrouillage.
 *
 * Convention couleur (identique au header) :
 *  - Inactif : gris clair (T.tx3)
 *  - Actif (onglet = écran actuel) : doré (T.gold)
 *
 * Sur Dashboard / Tasks / Analyse / Islam : aucun onglet n'est doré
 * (l'utilisateur n'est dans aucun module). Le repère visuel est alors
 * fourni par le header.
 *
 * Reçoit `currentRoute` et `onNavigate` en props depuis MainLayout pour
 * éviter d'utiliser useNavigation/useRoute hors du Navigator.
 */
const TABS = [
  { route: 'Planning', label: L.tabs.planning, icon: IconPlanning },
  { route: 'Trajet',   label: L.tabs.trajet,   icon: IconTrajet   },
  { route: 'Sante',    label: L.tabs.sante,    icon: IconSante    },
  { route: 'Reglages', label: L.tabs.reglages, icon: IconReglages },
];

export default function BottomNav({ currentRoute, onNavigate }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map(tab => {
        const Icon = tab.icon;
        const active = currentRoute === tab.route;
        const color = active ? T.gold : T.tx3;
        return (
          <TouchableOpacity
            key={tab.route}
            style={s.tab}
            onPress={() => onNavigate(tab.route)}
            activeOpacity={0.6}
            disabled={active}
            accessibilityLabel={tab.label}
          >
            <Icon size={ICON_SIZE.tab} color={color} />
            <Text style={[s.label, { color }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: T.bg2,
    borderTopWidth: 1,
    borderTopColor: T.bo,
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
