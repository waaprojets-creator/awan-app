import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { ds } from '../../utils/storage';
import type { WorkoutSessionLatest } from '../../data/schemas/sport/routine';
import type { MeasurementLatest } from '../../data/schemas/anthropo/measurement';
import type { WeightEntryLatest } from '../../data/schemas/body/weightEntry';
import { Card } from '../../components/ui/Card';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';

interface CorrelationTabProps {
  sessions: WorkoutSessionLatest[];
  history: MeasurementLatest[];
  weightEntries: WeightEntryLatest[];
  todayKcal: number;
}

export function CorrelationTab({ sessions, history, weightEntries, todayKcal }: CorrelationTabProps) {
  const theme = useTheme();
  const last30 = React.useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    const str = ds(d);
    const hasWorkout = sessions.some(s => (s.date ?? ds(new Date(s.startTime ?? 0))) === str);
    const wEntry = weightEntries.find(w => w.date === str);
    return { str, hasWorkout, weight: wEntry?.weightKg ?? null };
  }), [sessions, weightEntries]);

  const weightPoints = last30.filter(d => d.weight !== null);
  const workoutDays = last30.filter(d => d.hasWorkout).length;
  const avgWeight = weightPoints.length > 0
    ? weightPoints.reduce((s, d) => s + (d.weight ?? 0), 0) / weightPoints.length
    : null;

  const sortedW = [...weightEntries].sort((a, b) => b.date.localeCompare(a.date));
  const latestW = sortedW[0]; const oldestW = sortedW.at(-1);
  const weightDelta = (latestW && oldestW && latestW !== oldestW)
    ? latestW.weightKg - oldestW.weightKg : null;

  const sessionsPerWeek = (workoutDays / 30) * 7;

  const weightDeltaColor = weightDelta == null ? theme.mute
    : weightDelta < 0 ? theme.statusOk
    : weightDelta > 0 ? theme.statusWarn
    : theme.title;

  return (
    <View style={{ gap: 24 }}>
      <Text style={[s.headerLabel, { color: theme.mute }]}>
        CORRÉLATIONS INTER-MODULES · 30 JOURS
      </Text>

      <Card variant="flat">
        <Text style={[s.sectionLabel, { color: theme.selected, marginBottom: 16 }]}>SPORT × POIDS</Text>
        <View style={s.barsContainer}>
          {last30.map((d, i) => (
            <View key={i} style={s.barColumn}>
              {d.weight && avgWeight ? (
                <View style={{
                  width: '100%',
                  height: Math.max(4, Math.min(48, (d.weight / avgWeight) * 32)),
                  backgroundColor: d.hasWorkout ? theme.selected : 'rgba(255,255,255,0.12)',
                }} />
              ) : (
                <View style={{ width: '100%', height: 4, backgroundColor: d.hasWorkout ? theme.selected : 'transparent' }} />
              )}
            </View>
          ))}
        </View>
        <View style={[s.row, { gap: 16, marginTop: 12 }]}>
          <View style={s.row}>
            <View style={[s.legendDot, { backgroundColor: theme.selected }]} />
            <Text style={[s.labelXs, { color: theme.mute, marginLeft: 6 }]}>Séance</Text>
          </View>
          <View style={s.row}>
            <View style={[s.legendDot, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
            <Text style={[s.labelXs, { color: theme.mute, marginLeft: 6 }]}>Repos</Text>
          </View>
        </View>
      </Card>

      <View style={s.grid2}>
        <Card variant="flat" style={{ flex: 1 }}>
          <Text style={[s.sectionLabel, { color: theme.mute, marginBottom: 8 }]}>FRÉQUENCE</Text>
          <Text style={[s.bigNum, { color: theme.selected }]}>{sessionsPerWeek.toFixed(1)}</Text>
          <Text style={[s.labelXs, { color: theme.mute, marginTop: 4 }]}>séances/sem · 30j</Text>
        </Card>
        <Card variant="flat" style={{ flex: 1 }}>
          <Text style={[s.sectionLabel, { color: theme.mute, marginBottom: 8 }]}>POIDS · DELTA</Text>
          <Text style={[s.bigNum, { color: weightDeltaColor }]}>
            {weightDelta != null ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)}` : '—'}
          </Text>
          <Text style={[s.labelXs, { color: theme.mute, marginTop: 4 }]}>kg · total historique</Text>
        </Card>
        <Card variant="flat" style={{ flex: 1 }}>
          <Text style={[s.sectionLabel, { color: theme.mute, marginBottom: 8 }]}>JOURS SPORT</Text>
          <Text style={[s.bigNum, { color: theme.title }]}>
            {workoutDays}<Text style={{ fontSize: Fs.sm, opacity: 0.5 }}>/30</Text>
          </Text>
          <Text style={[s.labelXs, { color: theme.mute, marginTop: 4 }]}>jours actifs</Text>
        </Card>
        <Card variant="flat" style={{ flex: 1 }}>
          <Text style={[s.sectionLabel, { color: theme.mute, marginBottom: 8 }]}>KCAL JOUR</Text>
          <Text style={[s.bigNum, { color: theme.title }]}>{todayKcal || '—'}</Text>
          <Text style={[s.labelXs, { color: theme.mute, marginTop: 4 }]}>aujourd'hui</Text>
        </Card>
      </View>

      <Card variant="flat" style={{ borderColor: `${theme.selected}33`, backgroundColor: `${theme.selected}0D` }}>
        <Text style={[s.sectionLabel, { color: theme.selected, marginBottom: 12 }]}>INSIGHTS</Text>
        <View style={{ gap: 8 }}>
          {sessionsPerWeek < 2 && (
            <Text style={[s.bodyText, { color: theme.text }]}>· Fréquence en dessous des recommandations OMS (150 min/sem)</Text>
          )}
          {sessionsPerWeek >= 4 && (
            <Text style={[s.bodyText, { color: theme.statusOk }]}>· Excellente fréquence d'entraînement</Text>
          )}
          {weightDelta != null && weightDelta < -2 && sessionsPerWeek > 2 && (
            <Text style={[s.bodyText, { color: theme.statusWarn }]}>· Perte de poids rapide avec entraînement intensif — vérifier l'apport protéique</Text>
          )}
          {weightDelta != null && weightDelta > 2 && sessionsPerWeek < 2 && (
            <Text style={[s.bodyText, { color: theme.statusWarn }]}>· Prise de masse sans entraînement suffisant — augmenter la fréquence</Text>
          )}
          {sessionsPerWeek >= 2 && weightDelta != null && Math.abs(weightDelta) <= 1 && (
            <Text style={[s.bodyText, { color: theme.statusOk }]}>· Équilibre sport/poids stable — maintien de la composition corporelle</Text>
          )}
          {workoutDays === 0 && weightPoints.length === 0 && (
            <Text style={[s.bodyText, { color: theme.mute }]}>· Pas de données suffisantes — continuez à enregistrer vos séances et mesures</Text>
          )}
        </View>
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  barsContainer: { flexDirection: 'row', gap: 2, height: 64, alignItems: 'flex-end', marginBottom: 8 },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  legendDot: { width: 12, height: 12 },
  headerLabel: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, letterSpacing: Ls.body_033, textTransform: 'uppercase' },
  sectionLabel: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, letterSpacing: Ls.body_033, textTransform: 'uppercase' },
  labelXs: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  bigNum: { fontFamily: FontMono, fontSize: 30, fontWeight: Fw.display, letterSpacing: Ls.tight },
  bodyText: { fontFamily: FontMono, fontSize: Fs.md },
});
