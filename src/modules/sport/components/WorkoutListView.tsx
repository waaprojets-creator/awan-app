import React, { useMemo } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { ChevronLeft, Play, Trash2, Zap } from 'lucide-react-native';
import { PageWrapper, StaggerList, StaggerItem } from '@/components/Animated';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Heading } from '@/components/ui/Heading';
import { Touch } from '@/components/ui/Touch';
import { useTheme } from '@/hooks/useTheme';
import { FontMono } from '@/constants/typography';
import { Fs, Fw, Ls, Clr } from '@/theme/tokens';
import { L } from '@/constants/labels';
import { SYMBOLS } from '@/constants/symbols';
import type { RoutineLatest, WorkoutSessionLatest } from '@/data/schemas/sport/routine';

interface WorkoutListViewProps {
  routines: RoutineLatest[];
  sessions: WorkoutSessionLatest[];
  onBack: () => void;
  onGenerate: () => void;
  onStart: (routine: RoutineLatest) => void;
  onDelete: (id: string) => void;
  onAdopt: (routine: RoutineLatest) => void;
}

export function WorkoutListView({
  routines, sessions, onBack, onGenerate, onStart, onDelete, onAdopt,
}: WorkoutListViewProps) {
  const theme = useTheme();

  const lastSessionByRoutine = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const s of sessions) {
      if (!s.routineId) continue;
      const existing = map[s.routineId];
      if (!existing || s.date > existing) map[s.routineId] = s.date;
    }
    return map;
  }, [sessions]);

  function handleDelete(r: RoutineLatest) {
    Alert.alert(L.sport.deleteTitle, L.sport.deletePrompt(r.name), [
      { text: L.common.cancel, style: 'cancel' },
      { text: L.common.delete, style: 'destructive', onPress: () => onDelete(r.id) },
    ]);
  }

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={s.headerPad}>
          <View style={s.headerRow}>
            <Touch
              onPress={onBack}
              style={[s.iconBtn, { backgroundColor: Clr.white5, borderColor: Clr.white10 }]}
            >
              <ChevronLeft size={20} color={theme.mute} />
            </Touch>
            <ScreenHeader tag={L.sport.routinesTag} title={L.sport.myRoutines} style={{ flex: 1, marginBottom: 0 }} />
          </View>
        </View>

        <View style={s.listPad}>
          {routines.length === 0 ? (
            <Card style={s.emptyCard}>
              <Text style={[s.label, { color: theme.mute, textAlign: 'center' }]}>{L.sport.noRoutines}</Text>
            </Card>
          ) : (
            <StaggerList>
              {routines.map((r) => {
                const isCoach = r.source === 'coach';
                const lastDate = lastSessionByRoutine[r.id];
                const uniqueMuscles = [...new Set(r.exercises.map(e => e.primaryMuscle).filter(Boolean))];

                return (
                  <StaggerItem key={r.id} style={{ marginBottom: 16 }}>
                    <Card onPress={() => onStart(r)}>
                      <View style={s.cardHeader}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          {isCoach && (
                            <View style={[s.badge, { backgroundColor: 'rgba(212,175,55,0.15)', borderColor: 'rgba(212,175,55,0.30)' }]}>
                              <Text style={[s.labelXs, { color: theme.selected }]}>{L.sport.coachBadge}</Text>
                            </View>
                          )}
                          <Heading level={3} style={{ marginBottom: 0, marginTop: 0 }}>{r.name}</Heading>
                        </View>
                        <View style={s.cardActions}>
                          {!isCoach && (
                            <Touch onPress={() => handleDelete(r)} style={s.deleteBtn}>
                              <Trash2 size={15} color="rgba(255,255,255,0.20)" />
                            </Touch>
                          )}
                          <View style={[s.playBtn, { backgroundColor: 'rgba(212,175,55,0.20)', borderColor: 'rgba(212,175,55,0.30)' }]}>
                            <Play size={18} color={theme.selected} strokeWidth={3} />
                          </View>
                        </View>
                      </View>

                      <View style={s.badges}>
                        {r.cycleLetter && (
                          <View style={[s.tag, { backgroundColor: 'rgba(212,175,55,0.10)', borderColor: 'rgba(212,175,55,0.20)' }]}>
                            <Text style={[s.labelSm, { color: theme.selected }]}>{L.sport.cycle} {r.cycleLetter}</Text>
                          </View>
                        )}
                        <View style={[s.tag, { backgroundColor: Clr.white5, borderColor: Clr.white10 }]}>
                          <Text style={[s.labelSm, { color: theme.mute }]}>{r.exercises.length} {L.sport.exShort}</Text>
                        </View>
                        {lastDate && (
                          <View style={[s.tag, { backgroundColor: Clr.white5, borderColor: Clr.white10 }]}>
                            <Text style={[s.labelSm, { color: theme.mute }]}>{L.sport.lastSession} : {lastDate}</Text>
                          </View>
                        )}
                      </View>

                      {uniqueMuscles.length > 0 && (
                        <View style={s.muscleRow}>
                          {uniqueMuscles.slice(0, 5).map((m, idx) => (
                            <Text key={m} style={[s.labelXs, { color: theme.mute, fontWeight: Fw.value }]}>
                              {m}{idx < Math.min(uniqueMuscles.length, 5) - 1 ? ` ${SYMBOLS.bullet}` : ''}
                            </Text>
                          ))}
                        </View>
                      )}

                      {isCoach && (
                        <Touch
                          onPress={() => onAdopt(r)}
                          style={[s.adoptBtn, { borderColor: 'rgba(212,175,55,0.40)', backgroundColor: 'rgba(212,175,55,0.08)' }]}
                        >
                          <Text style={[s.labelMd, { color: theme.selected }]}>{L.sport.adoptRoutine}</Text>
                        </Touch>
                      )}
                    </Card>
                  </StaggerItem>
                );
              })}
            </StaggerList>
          )}
        </View>
      </ScrollView>

      <Touch
        onPress={onGenerate}
        style={s.fab}
      >
        <Zap size={16} color="#000" strokeWidth={3} />
        <Text style={[s.labelLg, { color: '#000' }]}>{L.sport.generate}</Text>
      </Touch>
    </PageWrapper>
  );
}

const s = StyleSheet.create({
  headerPad: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  iconBtn: { width: 40, height: 40, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  listPad: { paddingHorizontal: 24, paddingBottom: 24 },
  emptyCard: { paddingVertical: 80, alignItems: 'center' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  deleteBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4, borderWidth: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  muscleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  adoptBtn: { marginTop: 16, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  fab: {
    position: 'absolute', bottom: 90, right: 24,
    paddingHorizontal: 20, height: 48,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(212,175,55,1)',
  },
  label: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  labelXs: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.xs_02 },
  labelSm: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  labelMd: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.md_02 },
  labelLg: { fontFamily: FontMono, fontSize: Fs.lg, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.lg_02 },
});
