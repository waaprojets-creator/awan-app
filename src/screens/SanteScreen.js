import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { T } from '../constants/theme';
import { IconWip } from '../constants/icons';
import { L } from '../constants/labels';
import AppHeader from '../components/AppHeader';

/**
 * Module Santé — agrégateur des sous-modules Sport, Nutrition, Mesures.
 * Squelette navigable. Les sous-modules réels arrivent en Sprint 2.
 */
export default function SanteScreen() {
  return (
    <View style={s.container}>
      <AppHeader />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.headTitle}>{L.sante.title}</Text>
        <Text style={s.headSub}>{L.sante.sub}</Text>

        <Section data={L.sante.sections.sport} />
        <Section data={L.sante.sections.nutrition} />
        <Section data={L.sante.sections.mesures} />
      </ScrollView>
    </View>
  );
}

function Section({ data }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>{data.title}</Text>
        <View style={s.wipRow}>
          <IconWip size={12} color={T.tx3} />
          <Text style={s.sectionWip}>{data.delivery}</Text>
        </View>
      </View>
      <Text style={s.sectionDesc}>{data.desc}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { padding: 20, paddingBottom: 100 },

  headTitle: {
    fontSize: 14,
    color: T.gold,
    letterSpacing: 4,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  headSub: {
    fontSize: 11,
    color: T.tx3,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },

  section: {
    backgroundColor: T.bg2,
    borderWidth: 1,
    borderColor: T.bo,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    color: T.gold,
    letterSpacing: 2,
    fontWeight: '700',
  },
  wipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionWip: {
    fontSize: 10,
    color: T.tx3,
    letterSpacing: 1,
  },
  sectionDesc: {
    fontSize: 12,
    color: T.tx2,
    lineHeight: 17,
  },
});
