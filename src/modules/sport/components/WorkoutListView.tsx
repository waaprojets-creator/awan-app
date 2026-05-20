import React, { useMemo } from 'react';
import { ScrollView, Alert } from 'react-native';
import { ChevronLeft, Play, Trash2, Zap } from 'lucide-react';
import { PageWrapper, StaggerList, StaggerItem } from '@/components/Animated';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Heading } from '@/components/ui/Heading';
import { Touch } from '@/components/ui/Touch';
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
    Alert.alert('Suppression', `Supprimer "${r.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => onDelete(r.id) },
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
            <ScreenHeader tag="SPORT · PROTOCOLES" title="MES ROUTINES" />
          </div>
        </div>

        <div className="px-6 pb-6">
          {routines.length === 0 ? (
            <Card className="py-20 items-center bg-white/5 border-dashed border-white/10">
              <span className="awan-label text-awan-tx-mute text-center">AUCUNE ROUTINE ENREGISTRÉE</span>
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
                            <div
                              className="inline-flex items-center px-2 py-0.5 mb-1"
                              style={{ backgroundColor: 'var(--color-awan-status-spirit, rgba(138,43,226,0.15))', border: '1px solid rgba(138,43,226,0.3)' }}
                            >
                              <span
                                className="text-[8px] font-black tracking-widest uppercase"
                                style={{ color: 'var(--color-awan-status-spirit, rgb(138,43,226))' }}
                              >
                                PROPOSÉE · COACH
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
                            <span className="text-[9px] font-black text-awan-gold tracking-widest">CYCLE {r.cycleLetter}</span>
                          </div>
                        )}
                        <div className="bg-white/5 px-2 py-0.5">
                          <span className="text-[9px] font-black text-awan-tx-mute tracking-widest">{r.exercises.length} EX</span>
                        </div>
                        {lastDate && (
                          <div className="bg-white/5 px-2 py-0.5">
                            <span className="text-[9px] font-black text-awan-tx-mute tracking-widest">DERNIÈRE : {lastDate}</span>
                          </div>
                        )}
                      </div>

                      {/* Muscle tags */}
                      {uniqueMuscles.length > 0 && (
                        <div className="flex flex-row flex-wrap gap-1 mt-2">
                          {uniqueMuscles.slice(0, 5).map(m => (
                            <span key={m} className="text-[8px] font-bold text-awan-tx-mute uppercase tracking-wider">
                              {m}{uniqueMuscles.indexOf(m) < uniqueMuscles.slice(0, 5).length - 1 ? ' ·' : ''}
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
                          className="mt-4 h-10 flex items-center justify-center border border-awan-gold/40"
                          style={{ backgroundColor: 'var(--color-awan-gold, #c9a84c)' + '15' }}
                        >
                          <span className="text-[10px] font-black text-awan-gold tracking-widest uppercase">ADOPTER CETTE ROUTINE</span>
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
        style={{
          position: 'fixed',
          bottom: 90,
          right: 24,
          backgroundColor: 'var(--color-awan-gold)',
          paddingHorizontal: 20,
          height: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          shadowColor: 'var(--color-awan-gold)',
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        <Zap size={16} color="black" strokeWidth={3} />
        <span className="text-[11px] font-black text-black tracking-widest uppercase">GÉNÉRER</span>
      </Touch>
    </PageWrapper>
  );
}
