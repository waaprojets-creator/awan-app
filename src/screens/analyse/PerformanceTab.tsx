import React, { useMemo } from 'react';
import { Dumbbell } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import type { WorkoutSessionLatest } from '../../data/schemas/sport/routine';
import { bestOneRmFromSession } from '../../services/workoutAnalysisService';
import { computeWeeklyTonnage } from '../../services/analyticsService';
import { BarChart, EmptyState } from './shared';

interface PerformanceTabProps {
  sessions: WorkoutSessionLatest[];
}

interface OneRMEntry {
  exerciseId: string;
  name: string;
  rm: number;
  date: string;
}

interface WeekTonnage { label: string; weight: number }

export function PerformanceTab({ sessions }: PerformanceTabProps) {
  const theme = useTheme();

  // Top 5 exercices par 1RM estimé — fenêtre 90 jours
  const top5 = useMemo((): OneRMEntry[] => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutStr = cutoff.toISOString().slice(0, 10);

    const best: Record<string, OneRMEntry> = {};
    for (const session of sessions) {
      if (session.date < cutStr) continue;
      const rms = bestOneRmFromSession(session);
      for (const ex of session.exercises) {
        const rm = rms[ex.exerciseId];
        if (!rm) continue;
        const existing = best[ex.exerciseId];
        if (!existing || rm > existing.rm) {
          best[ex.exerciseId] = { exerciseId: ex.exerciseId, name: ex.name, rm, date: session.date };
        }
      }
    }
    return Object.values(best)
      .sort((a, b) => b.rm - a.rm)
      .slice(0, 5);
  }, [sessions]);

  // Tonnage 8 semaines glissantes
  const weeklyTonnage = useMemo((): WeekTonnage[] => {
    return Array.from({ length: 8 }, (_, i) => {
      const offset = -(7 - i);
      const tonnage = computeWeeklyTonnage(sessions, offset);
      return { label: offset === 0 ? 'S0' : `S${offset}`, weight: tonnage };
    });
  }, [sessions]);

  // PR cette semaine vs all-time précédent
  const hasPRthisWeek = useMemo(() => {
    const thisWeekStart = new Date();
    const day = thisWeekStart.getDay() || 7;
    thisWeekStart.setDate(thisWeekStart.getDate() - (day - 1));
    thisWeekStart.setHours(0, 0, 0, 0);
    const weekStr = thisWeekStart.toISOString().slice(0, 10);

    for (const session of sessions) {
      if (session.date < weekStr) continue;
      const rms = bestOneRmFromSession(session);
      for (const [exId, rm] of Object.entries(rms)) {
        const allTimeBest = sessions
          .filter(s => s.date < weekStr)
          .reduce((best, s) => {
            const prev = bestOneRmFromSession(s)[exId] ?? 0;
            return prev > best ? prev : best;
          }, 0);
        if (rm > allTimeBest && allTimeBest > 0) return true;
      }
    }
    return false;
  }, [sessions]);

  if (sessions.length === 0) return <EmptyState Icon={Dumbbell} label="Aucune séance enregistrée" />;

  return (
    <div className="space-y-8">
      {/* PR badge */}
      {hasPRthisWeek && (
        <Card className="p-4 border-awan-gold bg-awan-gold/10" variant="flat">
          <div className="flex flex-row items-center gap-3">
            <span className="text-xl">🏆</span>
            <span className="text-awan-md font-black text-awan-gold uppercase tracking-widest">
              Nouveau Record Personnel cette semaine
            </span>
          </div>
        </Card>
      )}

      {/* Top 5 1RM */}
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Estimations multi-formules (Brzycki · Epley · O'Conner)">1RM ESTIMÉ · TOP 5</Heading>
        <div className="space-y-3 mt-5">
          {top5.length === 0 ? (
            <span className="text-awan-md text-awan-tx-mute">Pas de données sur 90 jours</span>
          ) : top5.map((entry, i) => (
            <div key={entry.exerciseId} className="flex flex-row items-center justify-between border-b border-white/5 pb-3">
              <div className="flex flex-row items-center gap-3">
                <span className="text-awan-xs font-black font-mono text-awan-tx-mute w-4">{i + 1}</span>
                <span className="text-awan-md font-black text-awan-tx uppercase tracking-wide">{entry.name}</span>
              </div>
              <div className="flex flex-row items-center gap-3">
                <span className="text-awan-xs font-mono text-awan-tx-mute">{entry.date}</span>
                <span className="text-xl font-black text-awan-gold font-mono">{entry.rm}<span className="text-sm ml-0.5 opacity-50">kg</span></span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tonnage hebdo 8 semaines */}
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Charge totale · 8 semaines glissantes">TONNAGE HEBDOMADAIRE</Heading>
        <div className="h-[200px] mt-6">
          <BarChart data={weeklyTonnage} dataKey="weight" color={theme.title} />
        </div>
        <div className="flex flex-row justify-between px-2 mt-2">
          {weeklyTonnage.map(w => (
            <span key={w.label} className="text-awan-xs font-mono text-awan-tx-mute">{w.label}</span>
          ))}
        </div>
      </Card>
    </div>
  );
}
