import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { T } from '../constants/theme';
import { HexagonLogo, IconWip, ICON_SIZE } from '../constants/icons';
import { L } from '../constants/labels';
import AppHeader from '../components/AppHeader';

/**
 * Module Trajet — placeholder. Sera implémenté en Sprint 2/3.
 */
export default function TrajetScreen() {
  return (
    <View style={s.container}>
      <AppHeader />
      <View style={s.body}>
        <HexagonLogo size={ICON_SIZE.big} variant="outline" opacity={0.6} />

        <Text style={s.title}>{L.trajet.title}</Text>

        <View style={s.wipRow}>
          <IconWip size={14} color={T.tx2} />
          <Text style={s.wip}>{L.state.wip}</Text>
        </View>

        <Text style={s.desc}>
          {L.trajet.desc}{'\n'}{L.trajet.delivery}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 14,
    color: T.gold,
    letterSpacing: 4,
    fontWeight: '700',
    marginTop: 24,
  },
  wipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  wip: {
    fontSize: 13,
    color: T.tx2,
    letterSpacing: 1,
  },
  desc: {
    fontSize: 12,
    color: T.tx3,
    textAlign: 'center',
    marginTop: 28,
    lineHeight: 18,
  },
});
