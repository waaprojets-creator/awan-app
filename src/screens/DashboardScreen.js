import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { T } from '../constants/theme';
import { IconWip } from '../constants/icons';
import { L, DATE_FORMAT_BANNER } from '../constants/labels';
import AppHeader from '../components/AppHeader';
import { useAppState } from '../context/AppStateContext';
import { ds } from '../utils/storage';

/**
 * Écran d'accueil après déverrouillage. Agrégateur en lecture seule
 * de widgets pointant vers les modules détaillés.
 *
 * État actuel : squelette navigable.
 *  - Widget Tâches : fonctionnel (compteur aujourd'hui + retards)
 *  - Autres widgets : placeholders cliquables qui pointent vers les modules
 */
export default function DashboardScreen() {
  const navigation = useNavigation();
  const { db } = useAppState();

  if (!db) {
    return (
      <View style={s.container}>
        <AppHeader />
        <View style={s.loading}>
          <Text style={s.loadingTx}>{L.state.loading}</Text>
        </View>
      </View>
    );
  }

  const todayStr = ds(new Date());
  const allTasks = db.tasks || [];
  const tasksToday = allTasks.filter(t => !t.done && t.date === todayStr).length;
  const tasksLate  = allTasks.filter(t => !t.done && t.date < todayStr).length;
  const tasksTotal = tasksToday + tasksLate;

  const tasksSubtitle = tasksTotal === 0
    ? L.dash.tasks.none
    : [
        tasksLate  > 0 ? L.dash.tasks.late(tasksLate)   : null,
        tasksToday > 0 ? L.dash.tasks.today(tasksToday) : null,
      ].filter(Boolean).join(' · ');

  return (
    <View style={s.container}>
      <AppHeader />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.dateBanner}>
          {new Date().toLocaleDateString('fr-FR', DATE_FORMAT_BANNER).toUpperCase()}
        </Text>

        <Widget
          title={L.dash.widgets.planning}
          onPress={() => navigation.navigate('Tabs', { screen: 'PlanningTab' })}
          status="wip"
        />

        <Widget
          title={L.dash.widgets.tasks}
          onPress={() => navigation.navigate('Tasks')}
          subtitle={tasksSubtitle}
          highlight={tasksLate > 0}
        />

        <Widget
          title={L.dash.widgets.sport}
          onPress={() => navigation.navigate('Tabs', { screen: 'SanteTab' })}
          status="wip"
          subtitle={L.state.sprint2}
        />

        <Widget
          title={L.dash.widgets.courses}
          onPress={() => navigation.navigate('Tabs', { screen: 'SanteTab' })}
          status="wip"
          subtitle={L.state.sprint2}
        />

        <Widget
          title={L.dash.widgets.macros}
          onPress={() => navigation.navigate('Tabs', { screen: 'SanteTab' })}
          status="wip"
          subtitle={L.state.sprint2}
        />

        <Widget
          title={L.dash.widgets.analyse}
          onPress={() => navigation.navigate('Analyse')}
          status="wip"
        />
      </ScrollView>
    </View>
  );
}

function Widget({ title, subtitle, onPress, status, highlight }) {
  return (
    <TouchableOpacity
      style={[s.widget, highlight && s.widgetHighlight]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={s.widgetHead}>
        <Text style={s.widgetTitle}>{title}</Text>
        {status === 'wip' && (
          <View style={s.wipRow}>
            <IconWip size={12} color={T.tx3} />
            <Text style={s.widgetWip}>{L.state.wip.toUpperCase()}</Text>
          </View>
        )}
      </View>
      {subtitle && (
        <Text style={[s.widgetSub, highlight && s.widgetSubHighlight]}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { padding: 16, paddingBottom: 100 },

  dateBanner: {
    fontSize: 11,
    color: T.tx2,
    letterSpacing: 2,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 16,
  },

  widget: {
    backgroundColor: T.bg2,
    borderWidth: 1,
    borderColor: T.bo,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    minHeight: 80,
  },
  widgetHighlight: {
    borderColor: T.gold,
    borderWidth: 1.5,
  },
  widgetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  widgetTitle: {
    fontSize: 11,
    color: T.gold,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  wipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  widgetWip: {
    fontSize: 9,
    color: T.tx3,
    letterSpacing: 1,
  },
  widgetSub: {
    fontSize: 14,
    color: T.tx,
    marginTop: 8,
  },
  widgetSubHighlight: {
    color: T.gold,
    fontWeight: '600',
  },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingTx: { color: T.tx3 },
});
