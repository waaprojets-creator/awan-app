import React, { useMemo } from 'react';
import { ScrollView, Alert } from 'react-native';
import { ChevronLeft, Play, Trash2, Zap } from 'lucide-react-native';
import { PageWrapper, StaggerList, StaggerItem } from '@/components/Animated';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Heading } from '@/components/ui/Heading';
import { Touch } from '@/components/ui/Touch';
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
  routines,
  sessions,
  onBack,
  onGenerate,
  onStart,
  onDelete,
  onAdopt,
}: WorkoutListViewProps) {
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
        <div className="px-6 pt-4 pb-2">
          <div className="flex flex-row items-center gap-4 mb-4">
            <Touch
              onPress={onBack}
              className="w-10 h-10 bg-white/5 flex items-center justify-center"
            >
              <ChevronLeft size={20} className="text-awan-tx-mute" />
            </Touch>
            <ScreenHeader tag={L.sport.routinesTag} title={L.sport.myRoutines} />
          </div>
        </div>

        <div className="px-6 pb-6">
          {routines.length === 0 ? (
            <Card className="py-20 items-center bg-white/5 border-dashed border-white/10">
              <span className="awan-label text-awan-tx-mute text-center">{L.sport.noRoutines}</span>
            </Card>
          ) : (
            <StaggerList>
              {routines.map((r) => {
                const isCoach = r.source === 'coach';
                const lastDate = lastSessionByRoutine[r.id];
                const uniqueMuscles = [...new Set(r.exercises.map(e => e.primaryMuscle).filter(Boolean))];

                return (
                  <StaggerItem key={r.id} className="mb-4">
                    <Card className="p-5 bg-awan-surface" onPress={() => onStart(r)}>
                      {/* Header row */}
                      <div className="flex flex-row items-start justify-between mb-3">
                        <div className="flex-1 pr-3">
                          {isCoach && (
                            <div className="inline-flex items-center px-2 py-0.5 mb-1 bg-awan-status-spirit/15 border border-awan-status-spirit/30">
                              <span className="awan-label-xs text-awan-status-spirit">
                                {L.sport.coachBadge}
                              </span>
                            </div>
                          )}
                          <Heading level={3} className="mb-0 mt-0">{r.name}</Heading>
                        </div>
                        <div className="flex flex-row gap-2 items-center">
                          {!isCoach && (
                            <Touch
                              onPress={(e: any) => { e.stopPropagation?.(); handleDelete(r); }}
                              className="w-8 h-8 flex items-center justify-center"
                            >
                              <Trash2 size={15} className="text-white/20" />
                            </Touch>
                          )}
                          <div className="w-10 h-10 bg-awan-gold/20 flex items-center justify-center border border-awan-gold/30">
                            <Play size={18} className="text-awan-gold" strokeWidth={3} />
                          </div>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-row flex-wrap gap-2 mb-2">
                        {r.cycleLetter && (
                          <div className="bg-awan-gold/10 px-2 py-0.5 border border-awan-gold/20">
                            <span className="awan-label-sm text-awan-gold">{L.sport.cycle} {r.cycleLetter}</span>
                          </div>
                        )}
                        <div className="bg-white/5 px-2 py-0.5">
                          <span className="awan-label-sm text-awan-tx-mute">{r.exercises.length} {L.sport.exShort}</span>
                        </div>
                        {lastDate && (
                          <div className="bg-white/5 px-2 py-0.5">
                            <span className="awan-label-sm text-awan-tx-mute">{L.sport.lastSession} : {lastDate}</span>
                          </div>
                        )}
                      </div>

                      {/* Muscle tags */}
                      {uniqueMuscles.length > 0 && (
                        <div className="flex flex-row flex-wrap gap-1 mt-2">
                          {uniqueMuscles.slice(0, 5).map(m => (
                            <span key={m} className="awan-label-xs text-awan-tx-mute" style={{ fontWeight: 700 }}>
                              {m}{uniqueMuscles.indexOf(m) < uniqueMuscles.slice(0, 5).length - 1 ? ` ${SYMBOLS.bullet}` : ''}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Adopt button for coach routines */}
                      {isCoach && (
                        <Touch
                          onPress={(e: any) => {
                            e.stopPropagation?.();
                            onAdopt(r);
                          }}
                          className="mt-4 h-10 flex items-center justify-center border border-awan-gold/40 bg-awan-gold/[0.08]"
                        >
                          <span className="awan-label-md text-awan-gold">{L.sport.adoptRoutine}</span>
                        </Touch>
                      )}
                    </Card>
                  </StaggerItem>
                );
              })}
            </StaggerList>
          )}
        </div>
      </ScrollView>

      {/* Floating generate button */}
      <Touch
        onPress={onGenerate}
        className="fixed bottom-[90px] right-6 px-5 h-12 flex flex-row items-center gap-2 bg-awan-gold shadow-2xl"
      >
        <Zap size={16} color="black" strokeWidth={3} />
        <span className="awan-label-lg text-black">{L.sport.generate}</span>
      </Touch>
    </PageWrapper>
  );
}
