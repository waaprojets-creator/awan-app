import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput as RNTextInput } from 'react-native';
import { X } from 'lucide-react-native';

import { useTheme, type AwanTheme } from '../../hooks/useTheme';
import { FontSans, FontMono } from '../../constants/typography';
import { Fs, Fw, Ls, Sp, Clr } from '../../theme/tokens';
import { L } from '../../constants/labels';
import { Touch } from '../ui/Touch';
import { summarizeStates } from '../../modules/planning/dayState';
import { LIFE_STATES, LIFE_STATE_META, type LifeState, type StateSegment } from '../../data/schemas/planning/dayState';
import { stateColor } from './stateColor';

const TextInput = RNTextInput as React.ComponentType<any>;

const PRESETS: ReadonlyArray<{ label: string; start: number; end: number }> = [
  { label: 'Nuit',       start: 0,    end: 420 },
  { label: 'Matinée',    start: 420,  end: 720 },
  { label: 'Après-midi', start: 720,  end: 1080 },
  { label: 'Soirée',     start: 1080, end: 1440 },
  { label: 'Journée',    start: 0,    end: 1440 },
];

function parseHHMM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 24 || mm > 59) return null;
  const min = h * 60 + mm;
  return min >= 0 && min <= 1440 ? min : null;
}

function minToHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h}h${String(m).padStart(2, '0')}`;
}

function Strip({ segments, theme }: { segments: StateSegment[]; theme: AwanTheme }) {
  return (
    <View style={[s.strip, { borderColor: theme.border }]}>
      {segments.map((seg, i) => (
        <View
          key={`${seg.startMin}-${i}`}
          style={{ flex: Math.max(1, seg.endMin - seg.startMin), backgroundColor: stateColor(theme, seg.state) }}
        />
      ))}
    </View>
  );
}

/**
 * Contrôle des états de vie d'une journée : barre 24h proportionnelle (segments
 * intra-journée) + éditeur pour peindre un état sur une plage horaire.
 */
export function DayStateControl({ segments, setSegment, reset }: {
  segments: StateSegment[];
  setSegment: (state: LifeState, startMin: number, endMin: number) => Promise<void> | void;
  reset: () => Promise<void> | void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<LifeState>('travail');
  const [startStr, setStartStr] = useState('08:00');
  const [endStr, setEndStr] = useState('17:00');

  const summary = summarizeStates(segments);
  const present = LIFE_STATES.filter(st => summary[st] > 0);

  const startMin = parseHHMM(startStr);
  const endMin = parseHHMM(endStr);
  const canApply = startMin != null && endMin != null && endMin > startMin;

  const applyPreset = (p: { start: number; end: number }) => {
    setStartStr(minToHHMM(p.start));
    setEndStr(minToHHMM(p.end));
  };

  const apply = () => {
    if (canApply) void setSegment(sel, startMin, endMin);
  };

  return (
    <>
      <Touch onPress={() => setOpen(true)} style={[s.trigger, { borderBottomColor: theme.border }]}>
        <View style={s.triggerHead}>
          <Text style={[s.triggerLabel, { color: theme.mute }]}>ÉTATS DU JOUR</Text>
          <Text style={[s.triggerEdit, { color: theme.selected }]}>{L.common.edit.toUpperCase()}</Text>
        </View>
        <Strip segments={segments} theme={theme} />
        <View style={s.legend}>
          {present.map(st => (
            <View key={st} style={s.legendItem}>
              <View style={{ width: 8, height: 8, backgroundColor: stateColor(theme, st) }} />
              <Text style={[s.legendText, { color: theme.mute }]}>
                {LIFE_STATE_META[st].label} {fmtDur(summary[st])}
              </Text>
            </View>
          ))}
        </View>
      </Touch>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={[s.overlay, { backgroundColor: theme.overlay }]}>
          <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={s.cardHead}>
              <Text style={[s.cardTitle, { color: theme.title }]}>ÉTATS DU JOUR</Text>
              <Touch onPress={() => setOpen(false)} style={s.iconBtn} accessibilityLabel={L.common.close}>
                <X size={18} color={theme.mute} />
              </Touch>
            </View>

            <Strip segments={segments} theme={theme} />

            <Text style={[s.section, { color: theme.mute }]}>ÉTAT</Text>
            <View style={s.chips}>
              {LIFE_STATES.map(st => {
                const active = sel === st;
                const c = stateColor(theme, st);
                return (
                  <Touch
                    key={st}
                    onPress={() => setSel(st)}
                    style={[s.chip, { borderColor: active ? c : theme.border, backgroundColor: active ? c : 'transparent' }]}
                  >
                    <Text style={[s.chipText, { color: active ? theme.bg : theme.title }]}>
                      {LIFE_STATE_META[st].label}
                    </Text>
                  </Touch>
                );
              })}
            </View>

            <Text style={[s.section, { color: theme.mute }]}>PLAGE</Text>
            <View style={s.chips}>
              {PRESETS.map(p => (
                <Touch key={p.label} onPress={() => applyPreset(p)} style={[s.chip, { borderColor: theme.border }]}>
                  <Text style={[s.chipText, { color: theme.text }]}>{p.label}</Text>
                </Touch>
              ))}
            </View>

            <View style={s.timeRow}>
              <View style={s.timeField}>
                <Text style={[s.timeLabel, { color: theme.mute }]}>DÉBUT</Text>
                <TextInput
                  value={startStr}
                  onChangeText={setStartStr}
                  placeholder="08:00"
                  placeholderTextColor={theme.mute}
                  keyboardType="numbers-and-punctuation"
                  style={[s.input, { color: theme.title, borderColor: theme.border }]}
                />
              </View>
              <View style={s.timeField}>
                <Text style={[s.timeLabel, { color: theme.mute }]}>FIN</Text>
                <TextInput
                  value={endStr}
                  onChangeText={setEndStr}
                  placeholder="17:00"
                  placeholderTextColor={theme.mute}
                  keyboardType="numbers-and-punctuation"
                  style={[s.input, { color: theme.title, borderColor: theme.border }]}
                />
              </View>
            </View>

            <Touch
              onPress={apply}
              disabled={!canApply}
              style={[s.primaryBtn, { backgroundColor: canApply ? theme.selected : theme.border, opacity: canApply ? 1 : 0.5 }]}
            >
              <Text style={[s.primaryText, { color: theme.bg }]}>{L.common.validate.toUpperCase()}</Text>
            </Touch>

            <View style={s.footRow}>
              <Touch onPress={() => void reset()} style={s.footBtn}>
                <Text style={[s.footText, { color: theme.mute }]}>RÉINITIALISER</Text>
              </Touch>
              <Touch onPress={() => setOpen(false)} style={s.footBtn}>
                <Text style={[s.footText, { color: theme.title }]}>{L.common.close.toUpperCase()}</Text>
              </Touch>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: { paddingHorizontal: Sp[6], paddingVertical: Sp[3], borderBottomWidth: 1 },
  triggerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sp[2] },
  triggerLabel: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, letterSpacing: Ls.xs_02, textTransform: 'uppercase' },
  triggerEdit: { fontFamily: FontMono, fontSize: Fs.xxs, fontWeight: Fw.value, letterSpacing: Ls.xxs_02 },
  strip: { flexDirection: 'row', height: 18, borderWidth: 1, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Sp[3], marginTop: Sp[2] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontFamily: FontMono, fontSize: Fs.xxs, fontWeight: Fw.value, letterSpacing: Ls.xxs_02 },

  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: Sp[5] },
  card: { borderWidth: 1, padding: Sp[5] },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sp[4] },
  cardTitle: { fontFamily: FontMono, fontSize: Fs.lg, fontWeight: Fw.display, letterSpacing: Ls.lg_02, textTransform: 'uppercase' },
  iconBtn: { padding: Sp[1] },
  section: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, letterSpacing: Ls.xs_02, marginTop: Sp[4], marginBottom: Sp[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Sp[2] },
  chip: { paddingHorizontal: Sp[3], paddingVertical: Sp[2], borderWidth: 1 },
  chipText: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, letterSpacing: Ls.sm_015, textTransform: 'uppercase' },
  timeRow: { flexDirection: 'row', gap: Sp[3], marginTop: Sp[4] },
  timeField: { flex: 1 },
  timeLabel: { fontFamily: FontMono, fontSize: Fs.xxs, fontWeight: Fw.display, letterSpacing: Ls.xxs_02, marginBottom: Sp[1] },
  input: { fontFamily: FontMono, fontSize: Fs.base, fontWeight: Fw.value, borderWidth: 1, paddingHorizontal: Sp[3], paddingVertical: Sp[2], backgroundColor: Clr.white5 },
  primaryBtn: { marginTop: Sp[5], paddingVertical: Sp[3], alignItems: 'center' },
  primaryText: { fontFamily: FontMono, fontSize: Fs.body, fontWeight: Fw.display, letterSpacing: Ls.body_005, textTransform: 'uppercase' },
  footRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Sp[4] },
  footBtn: { paddingVertical: Sp[2], paddingHorizontal: Sp[2] },
  footText: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, letterSpacing: Ls.sm_02, textTransform: 'uppercase' },
});
