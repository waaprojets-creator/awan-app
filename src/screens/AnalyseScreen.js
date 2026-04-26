import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../constants/theme';
import { ds } from '../utils/storage';
import { eventsForDate } from '../utils/recurrence';
import { useAppState } from '../context/AppStateContext';

const PERIODS = [
  { key: '7', label: '7 jours', days: 7 },
  { key: '30', label: '30 jours', days: 30 },
  { key: '90', label: '90 jours', days: 90 },
  { key: '365', label: '1 an', days: 365 },
];

export default function AnalyseScreen() {
  const insets = useSafeAreaInsets();
  const { db } = useAppState();

  const stats = useMemo(() => {
    if (!db) return null;
    const today = new Date();
    const result = {};

    for (const period of PERIODS) {
      let evCount = 0;
      let rtCount = 0;
      for (let i = 0; i < period.days; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = ds(d);
        const events = eventsForDate(db, dateStr);
        evCount += events.filter(e => !e.isRt).length;
        rtCount += events.filter(e => e.isRt).length;
      }
      result[period.key] = { events: evCount, routines: rtCount };
    }

    return result;
  }, [db]);

  const totals = useMemo(() => {
    if (!db) return { events: 0, tasks: 0, routines: 0, tasksDone: 0 };
    return {
      events: (db.events || []).length,
      tasks: (db.tasks || []).length,
      tasksDone: (db.tasks || []).filter(t => t.done).length,
      routines: (db.routines || []).length,
    };
  }, [db]);

  if (!db) {
    return (
      <View style={[s.container, { paddingTop: insets.top + 40 }]}>
        <Text style={s.headerTitle}>Analyse</Text>
        <Text style={s.empty}>Chargement…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.header}>
        <Text style={s.headerTitle}>Analyse</Text>
        <Text style={s.headerSub}>Vue d'ensemble de ton activité</Text>
      </View>

      <Text style={s.sectionTitle}>Totaux</Text>
      <View style={s.row}>
        <View style={s.card}>
          <Text style={s.cardN}>{totals.events}</Text>
          <Text style={s.cardL}>Événements</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardN}>{totals.routines}</Text>
          <Text style={s.cardL}>Routines</Text>
        </View>
      </View>
      <View style={s.row}>
        <View style={s.card}>
          <Text style={s.cardN}>{totals.tasks}</Text>
          <Text style={s.cardL}>Tâches</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardN}>{totals.tasksDone}</Text>
          <Text style={s.cardL}>Faites</Text>
        </View>
      </View>

      <Text style={s.sectionTitle}>Activité par période (passée)</Text>
      {PERIODS.map(period => {
        const stat = stats?.[period.key] || { events: 0, routines: 0 };
        return (
          <View key={period.key} style={s.periodRow}>
            <Text style={s.periodLabel}>{period.label}</Text>
            <View style={s.periodStats}>
              <View style={s.miniStat}>
                <Text style={s.miniN}>{stat.events}</Text>
                <Text style={s.miniL}>évén.</Text>
              </View>
              <View style={s.miniStat}>
                <Text style={s.miniN}>{stat.routines}</Text>
                <Text style={s.miniL}>routines</Text>
              </View>
              <View style={s.miniStat}>
                <Text style={s.miniN}>{stat.events + stat.routines}</Text>
                <Text style={s.miniL}>total</Text>
              </View>
            </View>
          </View>
        );
      })}

      <View style={s.note}>
        <Text style={s.noteTx}>
          📊 Les graphiques détaillés et l'analyse décennale arriveront dans les prochains sprints.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: T.bo, marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: T.tx },
  headerSub: { fontSize: 12, color: T.tx2, marginTop: 4 },

  sectionTitle: {
    fontSize: 12, color: T.tx2, fontWeight: '700', textTransform: 'uppercase',
    paddingHorizontal: 20, marginTop: 16, marginBottom: 10, letterSpacing: 1,
  },
  row: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 10 },
  card: {
    flex: 1, backgroundColor: T.bg2, borderWidth: 1, borderColor: T.bo,
    borderRadius: 12, padding: 16, alignItems: 'center',
  },
  cardN: { fontSize: 28, fontWeight: '700', color: T.tx },
  cardL: { fontSize: 11, color: T.tx2, marginTop: 4, textTransform: 'uppercase' },

  periodRow: {
    marginHorizontal: 16, marginBottom: 10, padding: 14,
    backgroundColor: T.bg2, borderWidth: 1, borderColor: T.bo, borderRadius: 12,
  },
  periodLabel: { fontSize: 13, color: T.tx, fontWeight: '700', marginBottom: 10 },
  periodStats: { flexDirection: 'row', gap: 12 },
  miniStat: { flex: 1, alignItems: 'center', paddingVertical: 6, backgroundColor: T.bg3, borderRadius: 8 },
  miniN: { fontSize: 18, fontWeight: '700', color: T.gold },
  miniL: { fontSize: 9, color: T.tx2, marginTop: 2, textTransform: 'uppercase' },

  note: {
    margin: 16, padding: 14, backgroundColor: T.bg3,
    borderRadius: 10, borderWidth: 1, borderColor: T.bo,
  },
  noteTx: { fontSize: 12, color: T.tx2, lineHeight: 18 },

  empty: { padding: 40, textAlign: 'center', color: T.tx3 },
});
