import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';
import { Moon } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { IslamService } from '../../services/islamService';
import { BarChart, GuardCard, LoadingState } from './shared';

function todayIso(): string { return new Date().toISOString().slice(0, 10); }
function subDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function isoWeek(date: string): string {
  const d = new Date(date);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const start = new Date(jan4);
  start.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const diff = d.getTime() - start.getTime();
  const week = Math.floor(diff / (7 * 86400000)) + 1;
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function IslamTab() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [prayerData, setPrayerData] = useState<Array<{ date: string; fardScore: number }>>([]);
  const [weeklyAyahs, setWeeklyAyahs] = useState<Array<{ week: string; ayahs: number }>>([]);

  useEffect(() => {
    const today = todayIso();
    const from30 = subDaysIso(29);
    const from56 = subDaysIso(55);

    Promise.all([
      IslamService.getPrayerLogsByDateRange(from30, today),
      IslamService.getQuranSessionsByDateRange(from56, today),
    ]).then(([logs, sessions]) => {
      const dayMap: Record<string, number> = {};
      for (const l of logs) dayMap[l.date] = l.fardScore ?? 0;
      const days30: Array<{ date: string; fardScore: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const d = subDaysIso(i);
        days30.push({ date: d, fardScore: dayMap[d] ?? 0 });
      }
      setPrayerData(days30);

      const weekMap: Record<string, number> = {};
      for (const s of sessions) {
        const wk = isoWeek(s.date);
        weekMap[wk] = (weekMap[wk] ?? 0) + s.ayahsRead;
      }
      const sortedWeeks = Object.keys(weekMap).sort().slice(-8);
      setWeeklyAyahs(sortedWeeks.map(w => ({ week: w, ayahs: weekMap[w] ?? 0 })));
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState label="CHARGEMENT ISLAM..." />;

  let streak = 0;
  for (let i = 0; i < prayerData.length; i++) {
    const d = subDaysIso(i);
    const entry = prayerData.find(p => p.date === d);
    if (!entry || entry.fardScore < 1) break;
    streak++;
  }

  const avgAdherence = prayerData.length > 0
    ? Math.round(prayerData.reduce((s, d) => s + d.fardScore, 0) / prayerData.length * 100)
    : 0;

  return (
    <View style={{ gap: 24 }}>
      <Card>
        <View style={s.rowBetween}>
          <Heading level={4} mono style={{ marginBottom: 0 }}>ADHÉRENCE PRIÈRES 30J</Heading>
          <View style={[s.badge, {
            backgroundColor: avgAdherence >= 80 ? 'rgba(78,205,196,0.15)' : 'rgba(255,255,255,0.05)',
            borderColor: avgAdherence >= 80 ? theme.statusOk : 'rgba(255,255,255,0.1)',
          }]}>
            <Text style={[s.badgeText, { color: avgAdherence >= 80 ? theme.statusOk : theme.mute }]}>
              {avgAdherence}%
            </Text>
          </View>
        </View>
        {prayerData.every(d => d.fardScore === 0) ? (
          <GuardCard message="Aucune prière enregistrée — saisie dans Islam → Chrono Prières" />
        ) : (
          <BarChart data={prayerData} dataKey="fardScore" color={theme.selected} />
        )}
      </Card>

      <Card>
        <Heading level={4} mono style={{ marginBottom: 16 }}>SÉQUENCE FARD</Heading>
        {streak === 0 ? (
          <GuardCard message="Aucune séquence — compte à partir de ta prochaine prière complète" />
        ) : (
          <View style={s.streakRow}>
            <Moon size={32} color={theme.selected} />
            <View>
              <Text style={[s.streakNum, { color: theme.selected }]}>{streak}</Text>
              <Text style={[s.streakLabel, { color: theme.mute }]}>
                JOUR{streak > 1 ? 'S' : ''} CONSÉCUTIF{streak > 1 ? 'S' : ''}
              </Text>
            </View>
          </View>
        )}
      </Card>

      <Card>
        <Heading level={4} mono style={{ marginBottom: 16 }}>VERSETS / SEMAINE</Heading>
        {weeklyAyahs.length === 0 ? (
          <GuardCard message="Aucune session Coran — saisie dans Islam → Wird" />
        ) : (
          <>
            <BarChart data={weeklyAyahs} dataKey="ayahs" color={theme.statusOk} />
            <View style={s.weekLabels}>
              {weeklyAyahs.slice(-4).map(w => (
                <Text key={w.week} style={[s.weekLabel, { color: theme.mute }]}>
                  {w.week.split('-')[1]}
                </Text>
              ))}
            </View>
          </>
        )}
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  badgeText: { fontFamily: FontMono, fontSize: Fs.body, fontWeight: Fw.value, letterSpacing: Ls.body_005 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingVertical: 16 },
  streakNum: { fontFamily: FontMono, fontSize: 48, fontWeight: Fw.value, lineHeight: 52 },
  streakLabel: { fontFamily: FontMono, fontSize: Fs.lg, letterSpacing: Ls.md_02, marginTop: 4 },
  weekLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  weekLabel: { fontFamily: FontMono, fontSize: 8, letterSpacing: Ls.body_005 },
});
