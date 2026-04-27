import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../constants/theme';
import { HexagonLogo, ICON_SIZE } from '../constants/icons';
import { L } from '../constants/labels';

/**
 * Header universel d'AWAN, immuable au-dessus de toutes les screens
 * (sauf LockScreen).
 *
 * Trois zones cliquables :
 *  - Gauche  AWAN  → écran Analyse & statistiques
 *  - Centre  ⬡     → Dashboard (home)
 *  - Droite  أوان  → écran Islam
 *
 * Convention couleur :
 *  - Inactif : gris clair (T.tx3)
 *  - Actif (zone = écran actuel) : doré (T.gold)
 *
 * Reçoit `currentRoute` et `onNavigate` en props depuis MainLayout
 * pour éviter d'utiliser useNavigation/useRoute hors du Navigator.
 */
export default function AppHeader({ currentRoute, onNavigate }) {
  const insets = useSafeAreaInsets();

  const isOn = (name) => currentRoute === name;

  const colorFor = (name) => isOn(name) ? T.gold : T.tx3;

  return (
    <View style={[s.wrap, { paddingTop: insets.top + 8 }]}>
      {/* AWAN — gauche → Analyse */}
      <TouchableOpacity
        style={s.side}
        onPress={() => onNavigate('Analyse')}
        activeOpacity={0.6}
        accessibilityLabel={L.a11y.open_analyse}
        disabled={isOn('Analyse')}
      >
        <Text style={[s.txLatin, { color: colorFor('Analyse') }]}>
          {L.header.latin}
        </Text>
      </TouchableOpacity>

      {/* Hexagone — centre → Dashboard */}
      <TouchableOpacity
        style={s.center}
        onPress={() => onNavigate('Dashboard')}
        activeOpacity={0.6}
        accessibilityLabel={L.a11y.home}
        disabled={isOn('Dashboard')}
      >
        <HexagonLogo
          size={ICON_SIZE.header}
          variant="simple"
          color={colorFor('Dashboard')}
        />
      </TouchableOpacity>

      {/* أوان — droite → Islam */}
      <TouchableOpacity
        style={s.side}
        onPress={() => onNavigate('Islam')}
        activeOpacity={0.6}
        accessibilityLabel={L.a11y.open_islam}
        disabled={isOn('Islam')}
      >
        <Text style={[s.txArabic, { color: colorFor('Islam') }]}>
          {L.header.arabic}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: T.bg,
    borderBottomWidth: 1,
    borderBottomColor: T.bo,
  },
  side: {
    flex: 1,
    paddingVertical: 6,
  },
  center: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txLatin: {
    fontSize: 16,
    letterSpacing: 4,
    fontWeight: '400',
    textAlign: 'left',
  },
  txArabic: {
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'right',
  },
});
