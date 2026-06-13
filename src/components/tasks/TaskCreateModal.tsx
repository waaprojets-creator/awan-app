import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TextInput as RNTextInput } from 'react-native';
import { X } from 'lucide-react-native';

import { useTheme, type AwanTheme } from '../../hooks/useTheme';
import { FontSans, FontMono } from '../../constants/typography';
import { Fs, Fw, Ls, Sp, Clr } from '../../theme/tokens';
import { L } from '../../constants/labels';
import { Touch } from '../ui/Touch';
import { getStorage } from '../../data/storage/storageService';
import { Planner } from '../../modules/planning/api';
import { HabitService } from '../../services/habitService';
import { slugify, HABIT_DOMAINS, type HabitDomain, type HabitDefinitionLatest } from '../../data/schemas/habits/habitDefinition';
import { domainColor, priorityColor, PRIORITY_LABEL, DOW_LABELS } from './taskColors';

const TextInput = RNTextInput as React.ComponentType<any>;

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  existingDomains: string[];
  existingTags: string[];
}

export function TaskCreateModal({ visible, onClose, onCreated, existingDomains, existingTags }: Props) {
  const theme = useTheme();
  const [type, setType] = useState<'task' | 'habit'>('task');
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState('');
  const [habitDomain, setHabitDomain] = useState<HabitDomain | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [days, setDays] = useState<number[]>([]);

  const reset = () => {
    setType('task'); setTitle(''); setDomain(''); setHabitDomain(undefined);
    setTags([]); setTagInput(''); setPriority(2); setDays([]);
  };

  const addTag = (raw: string) => {
    const parts = raw.split(',').map(t => t.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setTags(prev => Array.from(new Set([...prev, ...parts])));
    setTagInput('');
  };
  const toggleTag = (t: string) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const toggleDay = (d: number) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());

  const canSubmit = title.trim().length > 0;

  const submit = async () => {
    const t = title.trim();
    if (!t) return;
    if (type === 'task') {
      const planner = new Planner(await getStorage());
      await planner.createTask({ title: t, domain: domain.trim() || 'general', durationMin: 30, priority, tags });
    } else {
      const def: HabitDefinitionLatest = {
        v: 1,
        id: slugify(t),
        name: t,
        daysOfWeek: days,
        domain: habitDomain,
        tags,
        order: Math.floor(Date.now() / 1000),
        isActive: true,
        savedAt: Date.now(),
      };
      await HabitService.saveDefinition(def);
    }
    onCreated();
    reset();
    onClose();
  };

  const suggestTags = existingTags.filter(t => !tags.includes(t)).slice(0, 8);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[s.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[s.card, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <View style={s.head}>
            <Text style={[s.title, { color: theme.title }]}>NOUVELLE {type === 'task' ? 'TÂCHE' : 'HABITUDE'}</Text>
            <Touch onPress={onClose} style={s.iconBtn} accessibilityLabel={L.common.close}>
              <X size={18} color={theme.mute} />
            </Touch>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Sp[4] }}>
            {/* Type */}
            <View style={s.segment}>
              {(['task', 'habit'] as const).map(ty => (
                <Touch
                  key={ty}
                  onPress={() => setType(ty)}
                  style={[s.segBtn, { borderColor: theme.border, backgroundColor: type === ty ? theme.selected : 'transparent' }]}
                >
                  <Text style={[s.segText, { color: type === ty ? theme.bg : theme.mute }]}>
                    {ty === 'task' ? 'TÂCHE' : 'HABITUDE'}
                  </Text>
                </Touch>
              ))}
            </View>

            <Field label="TITRE">
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Nom…"
                placeholderTextColor={theme.mute}
                autoFocus
                style={[s.input, { color: theme.title, borderColor: theme.border }]}
              />
            </Field>

            {type === 'task' ? (
              <>
                <Field label="PRIORITÉ">
                  <View style={s.chips}>
                    {([1, 2, 3] as const).map(p => {
                      const active = priority === p;
                      const c = priorityColor(theme, p);
                      return (
                        <Touch key={p} onPress={() => setPriority(p)} style={[s.chip, { borderColor: active ? c : theme.border, backgroundColor: active ? c : 'transparent' }]}>
                          <Text style={[s.chipText, { color: active ? theme.bg : theme.text }]}>{PRIORITY_LABEL[p]}</Text>
                        </Touch>
                      );
                    })}
                  </View>
                </Field>

                <Field label="DOMAINE">
                  <TextInput
                    value={domain}
                    onChangeText={setDomain}
                    placeholder="travail, perso, famille…"
                    placeholderTextColor={theme.mute}
                    style={[s.input, { color: theme.title, borderColor: theme.border }]}
                  />
                  {existingDomains.length > 0 && (
                    <View style={[s.chips, { marginTop: Sp[2] }]}>
                      {existingDomains.slice(0, 8).map(d => (
                        <Touch key={d} onPress={() => setDomain(d)} style={[s.chipSm, { borderColor: theme.border }]}>
                          <View style={[s.dot, { backgroundColor: domainColor(theme, d) }]} />
                          <Text style={[s.chipSmText, { color: theme.text }]}>{d}</Text>
                        </Touch>
                      ))}
                    </View>
                  )}
                </Field>
              </>
            ) : (
              <>
                <Field label="JOURS (vide = tous les jours)">
                  <View style={s.chips}>
                    {DOW_LABELS.map((lab, d) => {
                      const active = days.includes(d);
                      return (
                        <Touch key={d} onPress={() => toggleDay(d)} style={[s.dayBtn, { borderColor: active ? theme.selected : theme.border, backgroundColor: active ? theme.selected : 'transparent' }]}>
                          <Text style={[s.chipText, { color: active ? theme.bg : theme.text }]}>{lab}</Text>
                        </Touch>
                      );
                    })}
                  </View>
                </Field>

                <Field label="DOMAINE">
                  <View style={s.chips}>
                    {HABIT_DOMAINS.map(d => {
                      const active = habitDomain === d;
                      return (
                        <Touch key={d} onPress={() => setHabitDomain(active ? undefined : d)} style={[s.chipSm, { borderColor: active ? theme.selected : theme.border, backgroundColor: active ? Clr.gold10 : 'transparent' }]}>
                          <Text style={[s.chipSmText, { color: active ? theme.selected : theme.text }]}>{d}</Text>
                        </Touch>
                      );
                    })}
                  </View>
                </Field>
              </>
            )}

            {/* Tags / dossiers */}
            <Field label="DOSSIERS (TAGS)">
              {tags.length > 0 && (
                <View style={[s.chips, { marginBottom: Sp[2] }]}>
                  {tags.map(t => (
                    <Touch key={t} onPress={() => toggleTag(t)} style={[s.chipSm, { borderColor: theme.selected, backgroundColor: Clr.gold10 }]}>
                      <Text style={[s.chipSmText, { color: theme.selected }]}>{t}</Text>
                      <X size={10} color={theme.selected} />
                    </Touch>
                  ))}
                </View>
              )}
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={() => addTag(tagInput)}
                placeholder="villa n2, awan app… (Entrée pour ajouter)"
                placeholderTextColor={theme.mute}
                style={[s.input, { color: theme.title, borderColor: theme.border }]}
              />
              {suggestTags.length > 0 && (
                <View style={[s.chips, { marginTop: Sp[2] }]}>
                  {suggestTags.map(t => (
                    <Touch key={t} onPress={() => toggleTag(t)} style={[s.chipSm, { borderColor: theme.border }]}>
                      <Text style={[s.chipSmText, { color: theme.mute }]}>+ {t}</Text>
                    </Touch>
                  ))}
                </View>
              )}
            </Field>

            <Touch
              onPress={submit}
              disabled={!canSubmit}
              style={[s.primaryBtn, { backgroundColor: canSubmit ? theme.selected : theme.border, opacity: canSubmit ? 1 : 0.5 }]}
            >
              <Text style={[s.primaryText, { color: theme.bg }]}>{L.common.validate.toUpperCase()}</Text>
            </Touch>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ marginTop: Sp[4] }}>
      <Text style={[s.fieldLabel, { color: theme.mute }]}>{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  card: { borderTopWidth: 1, padding: Sp[5], maxHeight: '88%' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sp[3] },
  title: { fontFamily: FontMono, fontSize: Fs.lg, fontWeight: Fw.display, letterSpacing: Ls.lg_02, textTransform: 'uppercase' },
  iconBtn: { padding: Sp[1] },
  segment: { flexDirection: 'row', gap: Sp[2] },
  segBtn: { flex: 1, paddingVertical: Sp[3], borderWidth: 1, alignItems: 'center' },
  segText: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, letterSpacing: Ls.sm_02, textTransform: 'uppercase' },
  fieldLabel: { fontFamily: FontMono, fontSize: Fs.xxs, fontWeight: Fw.display, letterSpacing: Ls.xxs_02, marginBottom: Sp[2] },
  input: { fontFamily: FontSans, fontSize: Fs.body, fontWeight: Fw.value, borderWidth: 1, paddingHorizontal: Sp[3], paddingVertical: Sp[3], backgroundColor: Clr.white5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Sp[2] },
  chip: { paddingHorizontal: Sp[4], paddingVertical: Sp[2], borderWidth: 1 },
  chipText: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, letterSpacing: Ls.sm_015, textTransform: 'uppercase' },
  chipSm: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Sp[3], paddingVertical: Sp[1], borderWidth: 1 },
  chipSmText: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.value, letterSpacing: Ls.xs_02, textTransform: 'uppercase' },
  dot: { width: 6, height: 6 },
  dayBtn: { width: 38, paddingVertical: Sp[2], borderWidth: 1, alignItems: 'center' },
  primaryBtn: { marginTop: Sp[5], paddingVertical: Sp[3], alignItems: 'center' },
  primaryText: { fontFamily: FontMono, fontSize: Fs.body, fontWeight: Fw.display, letterSpacing: Ls.body_005, textTransform: 'uppercase' },
});
