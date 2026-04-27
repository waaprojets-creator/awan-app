import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { T } from '../constants/theme';
import { HexagonLogo, ICON_SIZE } from '../constants/icons';
import { L } from '../constants/labels';

/**
 * Header universel d'AWAN, présent sur toutes les screens (sauf LockScreen).
 *
 * Trois zones cliquables :
 *  - Gauche  AWAN  → écran Analyse & statistiques
 *  - Centre  ⬡     → Dashboard (home)
 *  - Droite  أوان  → écran Islam
 *
 * Quand on est déjà sur la destination, la zone passe en opacité réduite
 * (visuellement "inactive") et le tap est ignoré.
 */
export default function AppHeader() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();

  const isOn = (name) => route.name === name;

  const goAnalyse = () => { if (!isOn('Analyse'))   navigation.navigate('Analyse'); };
  const goDash    = () => { if (!isOn('Dashboard')) navigation.navigate('Dashboard'); };
  const goIslam   = () => { if (!isOn('Islam'))     navigation.navigate('Islam'); };

  return (
    <View style={[s.wrap, { paddingTop: insets.top + 8 }]}>
      {/* AWAN — gauche → Analyse */}
      <TouchableOpacity
        style={s.side}
        onPress={goAnalyse}
        activeOpacity={0.6}
        accessibilityLabel={L.a11y.open_analyse}
        disabled={isOn('Analyse')}
      >
        <Text style={[s.txLatin, isOn('Analyse') && s.txInactive]}>
          {L.header.latin}
        </Text>
      </TouchableOpacity>

      {/* Hexagone — centre → Dashboard */}
      <TouchableOpacity
        style={s.center}
        onPress={goDash}
        activeOpacity={0.6}
        accessibilityLabel={L.a11y.home}
        disabled={isOn('Dashboard')}
      >
        <HexagonLogo
          size={ICON_SIZE.header}
          variant="simple"
          opacity={isOn('Dashboard') ? 0.4 : 1}
        />
      </TouchableOpacity>

      {/* أوان — droite → Islam */}
      <TouchableOpacity
        style={s.side}
        onPress={goIslam}
        activeOpacity={0.6}
        accessibilityLabel={L.a11y.open_islam}
        disabled={isOn('Islam')}
      >
        <Text style={[s.txArabic, isOn('Islam') && s.txInactive]}>
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
    color: T.gold,
    letterSpacing: 4,
    fontWeight: '400',
    textAlign: 'left',
  },
  txArabic: {
    fontSize: 18,
    color: T.gold,
    fontWeight: '400',
    textAlign: 'right',
  },
  txInactive: {
    opacity: 0.35,
  },
});
