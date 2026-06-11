import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet, TextInput as RNTextInput } from 'react-native';
import Svg, { Line, Text as SvgText, Polyline, Circle } from 'react-native-svg';
import { Moon, Trash2 } from 'lucide-react-native';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';
import { Card } from '../components/ui/Card';
import { useSleepStore } from '../hooks/useSleepStore';
import { ds, uid } from '../utils/storage';
import type { NavProps } from '../types/nav';
import type { SleepEntryLatest } from '../data/schemas/sleep/sleepEntry';
import { useTheme, type AwanTheme } from '../hooks/useTheme';
import { FontMono, FontSans } from '../constants/typography';
import { Fs, Fw, T, Clr } from '../theme/tokens';

const SvgLine_ = Line as any;
const SvgText_ = SvgText as any;
const SvgPolyline_ = Polyline as any;
const SvgCircle_ = Circle as any;

const OMS_THRESHOLD_H = 7;

const QUALITY_LABELS: Record<number, string> = {
  1: 'Très mauvais', 2: 'Mauvais', 3: 'Moyen', 4: 'Bon', 5: 'Excellent',
};

type ThemeColors = Pick<AwanTheme, 'danger' | 'statusWarn' | 'statusOk'>;

function qualityColor(q: number, t: ThemeColors): string {
  if (q <= 2) return t.danger;
  if (q === 3) return t.statusWarn;
  return t.statusOk;
}

function durationColor(h: number, t: ThemeColors): string {
  if (h < 6) return t.danger;
  if (h < OMS_THRESHOLD_H) return t.statusWarn;
  return t.statusOk;
}

function formatDuration(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return mins > 0 ? `${hours}h${String(mins).padStart(2, '0')}` : `${hours}h`;
}

function WeekChart({ entries }: { entries: SleepEntryLatest[] }) {
  const theme = useTheme();
  const W = 280; const H = 80; const PAD = 8;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  if (sorted.length < 2) return null;

  const maxH = Math.max(...sorted.map(e => e.durationH), OMS_THRESHOLD_H + 1);
  const toX = (i: number) => PAD + (i / (sorted.length - 1)) * (W - PAD * 2);
  const toY = (h: number) => H - PAD - (h / maxH) * (H - PAD * 2);

  const points = sorted.map((e, i) => `${toX(i)},${toY(e.durationH)}`).join(' ');
  const threshY = toY(OMS_THRESHOLD_H);

  return (
    <Svg width="100%" viewBox={`0 0 ${W} ${H}`} height={H}>
      <SvgLine_ x1={PAD} y1={threshY} x2={W - PAD} y2={threshY} stroke={theme.mute} strokeWidth="0.5" strokeDasharray="3,3" />
      <SvgText_ x={W - PAD} y={threshY - 3} textAnchor="end" fontSize={8} fill={theme.mute} fontFamily={FontMono}>7h OMS</SvgText_>
      <SvgPolyline_ points={points} fill="none" stroke={theme.selected} strokeWidth="1.5" strokeLinejoin="round" />
      {sorted.map((e, i) => (
        <SvgCircle_ key={e.id} cx={toX(i)} cy={toY(e.durationH)} r="3" fill={durationColor(e.durationH, theme)} />
      ))}
    </Svg>
  );
}

export default function SleepScreen(_props: NavProps): React.ReactElement {
  const theme = useTheme();
  const today = ds(new Date());
  const store = useSleepStore();

  const todayEntry = useMemo(
    () => store.entries.find(e => e.date === today) ?? null,
    [store.entries, today],
  );

  const [hours, setHours]       = useState<number>(todayEntry?.durationH ? Math.floor(todayEntry.durationH) : 7);
  const [mins, setMins]         = useState<number>(todayEntry?.durationH ? Math.round((todayEntry.durationH % 1) * 60) : 0);
  const [quality, setQuality]   = useState<number>(todayEntry?.quality ?? 3);
  const [bedtime, setBedtime]   = useState<string>(todayEntry?.bedtime ?? '');
  const [wakeTime, setWakeTime] = useState<string>(todayEntry?.wakeTime ?? '');
  const [saving, setSaving]     = useState(false);

  const durationH = hours + mins / 60;

  const last7 = useMemo(
    () => store.entries.filter(e => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      return e.date >= cutoff.toISOString().slice(0, 10);
    }),
    [store.entries],
  );

  const handleSave = async () => {
    if (durationH <= 0) return;
    setSaving(true);
    const entry: SleepEntryLatest = {
      v: 2,
      id: today,
      date: today,
      timestamp: Date.now(),
      durationH,
      quality,
      sleepScore: Math.round((quality / 5) * 50 + (Math.min(9, Math.max(6, durationH)) - 6) / 3 * 50),
      bedtime:  bedtime || undefined,
      wakeTime: wakeTime || undefined,
    };
    if (todayEntry) {
      await store.update(entry);
    } else {
      await store.add(entry);
    }
    setSaving(false);
  };

  const handleDelete = (entry: SleepEntryLatest) => {
    Alert.alert('Supprimer ?', `Entrée du ${entry.date}`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void store.remove(entry.id) },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader tag="SYSTÈME · SOMMEIL" title="SUIVI SOMMEIL" />

      {/* Saisie du jour */}
      <View style={[s.section, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 16 }]}>
        <Text style={[T.label, { marginBottom: 16 }]}>
          {todayEntry ? 'MODIFIER AUJOURD\'HUI' : 'SAISIR AUJOURD\'HUI'}
        </Text>

        {/* Durée */}
        <View style={{ marginBottom: 16 }}>
          <Text style={[T.label, { color: theme.mute, marginBottom: 8 }]}>DURÉE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {[5, 6, 7, 8, 9].map(h => (
                <Touch key={h} onPress={() => setHours(h)}
                  style={[s.picker, { borderColor: hours === h ? theme.selected : Clr.white10, backgroundColor: hours === h ? `${theme.selected}1A` : Clr.white5 }]}>
                  <Text style={{ fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, color: hours === h ? theme.selected : theme.mute }}>
                    {h}h
                  </Text>
                </Touch>
              ))}
            </View>
            <View style={{ width: 1, height: 24, backgroundColor: Clr.white10 }} />
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {[0, 15, 30, 45].map(m => (
                <Touch key={m} onPress={() => setMins(m)}
                  style={[s.picker, { borderColor: mins === m ? theme.selected : Clr.white10, backgroundColor: mins === m ? `${theme.selected}1A` : Clr.white5 }]}>
                  <Text style={{ fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, color: mins === m ? theme.selected : theme.mute }}>
                    {String(m).padStart(2, '0')}
                  </Text>
                </Touch>
              ))}
            </View>
          </View>
          <Text style={{ fontFamily: FontMono, fontSize: Fs.sm, marginTop: 8, color: durationColor(durationH, theme) }}>
            {formatDuration(durationH)}
            {durationH < OMS_THRESHOLD_H ? ` — en dessous des ${OMS_THRESHOLD_H}h recommandées` : ' — objectif atteint ✓'}
          </Text>
        </View>

        {/* Qualité */}
        <View style={{ marginBottom: 16 }}>
          <Text style={[T.label, { color: theme.mute, marginBottom: 8 }]}>QUALITÉ</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3, 4, 5].map(q => (
              <Touch key={q} onPress={() => setQuality(q)} style={{ flex: 1 }}>
                <View style={[s.qualityBtn, { borderColor: quality === q ? theme.selected : Clr.white10, backgroundColor: quality === q ? `${qualityColor(q, theme)}20` : Clr.white5 }]}>
                  <Text style={{ fontFamily: FontMono, fontWeight: Fw.display, fontSize: Fs.base, color: quality === q ? qualityColor(q, theme) : theme.mute }}>
                    {q}
                  </Text>
                </View>
              </Touch>
            ))}
          </View>
          <Text style={{ fontFamily: FontSans, fontSize: Fs.sm, marginTop: 4, color: qualityColor(quality, theme) }}>
            {QUALITY_LABELS[quality]}
          </Text>
        </View>

        {/* Horaires */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={[T.label, { color: theme.mute, marginBottom: 4 }]}>COUCHER</Text>
            <RNTextInput
              value={bedtime}
              onChangeText={setBedtime}
              placeholder="HH:MM"
              placeholderTextColor={Clr.white15}
              keyboardType="numbers-and-punctuation"
              style={[s.timeInput, { color: theme.title, borderColor: Clr.white10, backgroundColor: Clr.white5 }]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[T.label, { color: theme.mute, marginBottom: 4 }]}>RÉVEIL</Text>
            <RNTextInput
              value={wakeTime}
              onChangeText={setWakeTime}
              placeholder="HH:MM"
              placeholderTextColor={Clr.white15}
              keyboardType="numbers-and-punctuation"
              style={[s.timeInput, { color: theme.title, borderColor: Clr.white10, backgroundColor: Clr.white5 }]}
            />
          </View>
        </View>

        <Touch onPress={() => void handleSave()} disabled={saving || durationH <= 0}
          style={[s.saveBtn, { backgroundColor: theme.selected, opacity: saving ? 0.5 : 1 }]}>
          <Text style={{ fontFamily: FontMono, fontWeight: Fw.display, fontSize: Fs.sm, color: '#000', letterSpacing: 3.6 }}>
            {saving ? 'ENREGISTREMENT…' : todayEntry ? 'METTRE À JOUR' : 'ENREGISTRER'}
          </Text>
        </Touch>
      </View>

      {/* Tendance 7 jours */}
      {last7.length >= 2 && (
        <View style={[s.section, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 16 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <Text style={T.label}>TENDANCE 7 JOURS</Text>
            <Text style={{ fontFamily: FontMono, fontWeight: Fw.value, fontSize: Fs.body, color: durationColor(store.avgDurationH, theme) }}>
              {'moy. '}{formatDuration(store.avgDurationH)}
            </Text>
          </View>
          <WeekChart entries={last7} />
        </View>
      )}

      {/* Historique */}
      {store.entries.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={[T.label, { marginBottom: 4 }]}>HISTORIQUE</Text>
          {store.entries.slice(0, 14).map(entry => (
            <Card key={entry.id} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Moon size={16} color={durationColor(entry.durationH, theme)} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FontMono, fontSize: Fs.sm, color: theme.mute }}>{entry.date}</Text>
                <Text style={{ fontFamily: FontMono, fontWeight: Fw.value, fontSize: Fs.body, color: durationColor(entry.durationH, theme) }}>
                  {formatDuration(entry.durationH)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontFamily: FontMono, fontWeight: Fw.value, fontSize: Fs.body, color: qualityColor(entry.quality, theme) }}>
                  {'★'.repeat(entry.quality)}{'☆'.repeat(5 - entry.quality)}
                </Text>
                <Touch onPress={() => handleDelete(entry)} style={{ padding: 4 }}>
                  <Trash2 size={14} color={theme.mute} />
                </Touch>
              </View>
            </Card>
          ))}
        </View>
      )}

      {store.entries.length === 0 && !store.loading && (
        <View style={[s.empty, { borderColor: Clr.white5, backgroundColor: theme.surface }]}>
          <Moon size={24} color={theme.mute} />
          <Text style={[T.label, { color: theme.mute, textAlign: 'center' }]}>
            Aucune donnée — saisis ta première nuit
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  section: { padding: 16, borderWidth: 1 },
  picker: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  qualityBtn: { height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  timeInput: { fontFamily: FontMono, fontSize: Fs.body, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  saveBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: 24, alignItems: 'center', gap: 8, borderWidth: 1 },
});
