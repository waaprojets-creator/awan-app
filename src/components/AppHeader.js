import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Polygon, Circle } from 'react-native-svg';
import { T } from '../constants/theme';

/**
 * Header universel d'AWAN, présent sur toutes les screens (sauf LockScreen).
 *
 * Trois zones cliquables :
 *  - Gauche  "AWAN"  → écran Analyse & statistiques
 *  - Centre  ⬡       → Dashboard (home)
 *  - Droite  أوان    → écran Islam
 *
 * Quand on est déjà sur la destination, la zone est désactivée visuellement
 * (opacité réduite, pas de tap actif).
 */
export default function AppHeader() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();

  const isOn = (name) => route.name === name;

  const goAnalyse = () => { if (!isOn('Analyse')) navigation.navigate('Analyse'); };
  const goDash    = () => { if (!isOn('Dashboard')) navigation.navigate('Dashboard'); };
  const goIslam   = () => { if (!isOn('Islam')) navigation.navigate('Islam'); };

  return (
    <View style={[s.wrap, { paddingTop: insets.top + 8 }]}>
      {/* AWAN — gauche → Analyse */}
      <TouchableOpacity
        style={s.side}
        onPress={goAnalyse}
        activeOpacity={0.6}
        accessibilityLabel="Ouvrir l'analyse"
      >
        <Text style={[s.txLatin, isOn('Analyse') && s.txInactive]}>AWAN</Text>
      </TouchableOpacity>

      {/* Hexagone — centre → Dashboard */}
      <TouchableOpacity
        style={s.center}
        onPress={goDash}
        activeOpacity={0.6}
        accessibilityLabel="Retour au tableau de bord"
        disabled={isOn('Dashboard')}
      >
        <Svg width={32} height={32} viewBox="0 0 66 66">
          <Polygon
            points="33,3 59,18 59,48 33,63 7,48 7,18"
            stroke={T.gold}
            strokeWidth="1.6"
            fill="none"
            opacity={isOn('Dashboard') ? 0.4 : 1}
          />
          <Circle
            cx="33"
            cy="33"
            r="3.5"
            fill={T.gold}
            opacity={isOn('Dashboard') ? 0.4 : 1}
          />
        </Svg>
      </TouchableOpacity>

      {/* أوان — droite → Islam */}
      <TouchableOpacity
        style={s.side}
        onPress={goIslam}
        activeOpacity={0.6}
        accessibilityLabel="Ouvrir le module Islam"
      >
        <Text style={[s.txArabic, isOn('Islam') && s.txInactive]}>أوان</Text>
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
