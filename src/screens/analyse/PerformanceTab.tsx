import React, { useMemo, useState } from 'react';
import { Dimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Dumbbell } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { InstrumentCard } from '../../components/ui/InstrumentCard';
import type { WorkoutSessionLatest } from '../../data/schemas/sport/routine';
import {
  bestOneRmFromSession,
  sessionDensity,
  sessionAdherence,
  oneRmTrendPerExercise,
} from '../../services/workoutAnalysisService';
import { computeWeeklyTonnage } from '../../services/analyticsService';
import { PeriodizationService } from '../../services/periodizationService';
import { BarChart, EmptyState } from './shared';

const SvgPath_ = Path as any;
const SvgCircle_ = Circle as any;

interface PerformanceTabProps {
  sessions: WorkoutSessionLatest[];
  assessments?: Array<{ forecasts?: Array<{ kind: string; horizonDays?: number }> }>;
}

interface OneRMEntry { exerciseId: string; name: string; rm: number; date: string }
interface WeekTonnage { label: string; weight: number }

// ─── 1RM mini trend sparkline ─────────────────────────────────────────────────

function OneRMSparkline({ points }: { points: Array<{ date: string; oneRm: number }> }) {
  if (points.length < 2) return null;
  const W = Dimensions.get('window').width - 88;
  const H = 56;
  const pad = { l: 4, r: 4, t: 4, b: 4 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;
  const minRm = Math.min(...points.map(p => p.oneRm));
  const maxRm = Math.max(...points.map(p => p.oneRm));
  const range = maxRm - minRm || 1;
  const toX = (i: number) => pad.l + (i / (points.length - 1)) * cw;
  const toY = (v: number) => pad.t + ch - ((v - minRm) / range) * ch;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.oneRm)}`).join(' ');
  const last = points[points.length - 1]!;

  return (
    <Svg width={W} height={H}>
      <SvgPath_ d={d} fill="none" stroke="var(--color-awan-gold)" strokeWidth="1.5" />
      <SvgCircle_ cx={toX(points.length - 1)} cy={toY(last.oneRm)}
        r={3} fill="var(--color-awan-gold)" />
    </Svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PerformanceTab({ sessions, assessments = [] }: PerformanceTabProps) {
  const theme = useTheme();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  // Periodization state (synchronous)
  const perio = useMemo(() => PeriodizationService.getCurrent(), []);

  // Deload forecast from Coach assessments
  const hasDeloadForecast = useMemo(() =>
    assessments.some(a =>
      a.forecasts?.some(f => f.kind === 'deload' && (f.horizonDays ?? 99) <= 7)
    ), [assessments]);

  // Top 5 exercises by 1RM — 90 days, reps ≤ 12 guard applied in oneRmEstimate
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
    return Object.values(best).sort((a, b) => b.rm - a.rm).slice(0, 5);
  }, [sessions]);

  // 1RM trend per exercise (90d)
  const oneRmTrend = useMemo(() => oneRmTrendPerExercise(sessions, 90), [sessions]);

  // Tonnage 8 semaines glissantes
  const weeklyTonnage = useMemo((): WeekTonnage[] =>
    Array.from({ length: 8 }, (_, i) => {
      const offset = -(7 - i);
      return { label: offset === 0 ? 'S0' : `S${offset}`, weight: computeWeeklyTonnage(sessions, offset) };
    }), [sessions]);

  // PR cette semaine
  const hasPRthisWeek = useMemo(() => {
    const day = new Date().getDay() || 7;
    const monday = new Date();
    monday.setDate(monday.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);
    const weekStr = monday.toISOString().slice(0, 10);

    for (const session of sessions) {
      if (session.date < weekStr) continue;
      const rms = bestOneRmFromSession(session);
      for (const [exId, rm] of Object.entries(rms)) {
        const allTimeBest = sessions
          .filter(s => s.date < weekStr)
          .reduce((best, s) => Math.max(best, bestOneRmFromSession(s)[exId] ?? 0), 0);
        if (rm > allTimeBest && allTimeBest > 0) return true;
      }
    }
    return false;
  }, [sessions]);

  // Density + adherence — last 7 sessions
  const sessionMetrics = useMemo(() =>
    sessions.slice(-7).map(s => ({
      date: s.date,
      density: sessionDensity(s),
      adherence: sessionAdherence(s),
      tonnage: s.tonnage ?? 0,
    })), [sessions]);

  const lastDensity = sessionMetrics[sessionMetrics.length - 1]?.density ?? null;
  const lastAdherence = sessionMetrics[sessionMetrics.length - 1]?.adherence ?? null;

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

      {/* Periodization state */}
      {perio && (
        <Card className="p-6 bg-white/5 border-white/5" variant="flat">
          <Heading level={4} mono subtitle="État du mésocycle courant">PÉRIODISATION</Heading>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <InstrumentCard
              label="PHASE"
              value={`P${perio.phase}`}
              status="mute"
              delta={PeriodizationService.getPhaseLabel(perio.phase)}
              index={1}
            />
            <InstrumentCard
              label="SEMAINE MÉSO"
              value={perio.mesoWeek}
              status={perio.mesoWeek >= 6 ? 'warn' : 'ok'}
              index={2}
            />
            <InstrumentCard
              label="DÉCHARGE"
              value={perio.deloadTriggered || hasDeloadForecast ? 'OUI' : 'N/A'}
              status={perio.deloadTriggered || hasDeloadForecast ? 'warn' : 'mute'}
              index={3}
            />
          </div>
        </Card>
      )}

      {/* Densité & adhérence dernière séance */}
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Dernière séance enregistrée">INTENSITÉ & ADHÉRENCE</Heading>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <InstrumentCard
            label="DENSITÉ"
            value={lastDensity !== null ? lastDensity.toFixed(0) : '—'}
            unit="kg/min"
            status={lastDensity !== null ? (lastDensity >= 300 ? 'ok' : lastDensity >= 150 ? 'warn' : 'error') : 'mute'}
            index={1}
          />
          <InstrumentCard
            label="ADHÉRENCE PLAN"
            value={lastAdherence !== null ? `${(lastAdherence * 100).toFixed(0)}` : '—'}
            unit="%"
            status={lastAdherence !== null ? (lastAdherence >= 0.9 ? 'ok' : lastAdherence >= 0.7 ? 'warn' : 'error') : 'mute'}
            {...(lastAdherence !== null ? { progress: lastAdherence * 100 } : {})}
            index={2}
          />
        </div>
      </Card>

      {/* Top 5 1RM — sélectionnable pour voir la courbe */}
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Estimations · reps ≤ 12 · Brzycki·Epley·O'Conner">
          1RM ESTIMÉ · TOP 5
        </Heading>
        <div className="space-y-3 mt-5">
          {top5.length === 0 ? (
            <span className="text-awan-md text-awan-tx-mute">Pas de données sur 90 jours</span>
          ) : top5.map((entry, i) => (
            <div
              key={entry.exerciseId}
              className={`flex flex-row items-center justify-between border-b pb-3 cursor-pointer ${
                selectedExercise === entry.exerciseId ? 'border-awan-gold' : 'border-white/5'
              }`}
              onClick={() => setSelectedExercise(
                selectedExercise === entry.exerciseId ? null : entry.exerciseId
              )}
            >
              <div className="flex flex-row items-center gap-3">
                <span className="text-awan-xs font-black font-mono text-awan-tx-mute w-4">{i + 1}</span>
                <span className="text-awan-md font-black text-awan-tx uppercase tracking-wide">{entry.name}</span>
              </div>
              <div className="flex flex-row items-center gap-3">
                <span className="text-awan-xs font-mono text-awan-tx-mute">{entry.date}</span>
                <span className="text-xl font-black text-awan-gold font-mono">
                  {entry.rm}<span className="text-sm ml-0.5 opacity-50">kg</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 1RM trend sparkline for selected exercise */}
        {selectedExercise && oneRmTrend[selectedExercise] && (
          <div className="mt-4 border-t border-white/5 pt-4">
            <span className="text-awan-xs font-black uppercase tracking-widest text-awan-tx-mute">
              ÉVOLUTION 90J · {top5.find(e => e.exerciseId === selectedExercise)?.name ?? ''}
            </span>
            <div className="mt-2">
              <OneRMSparkline points={oneRmTrend[selectedExercise]!} />
            </div>
            <div className="flex flex-row justify-between mt-1">
              <span className="text-awan-xs font-mono text-awan-tx-mute">
                {oneRmTrend[selectedExercise]?.[0]?.date ?? ''}
              </span>
              <span className="text-awan-xs font-mono text-awan-gold font-black">
                {oneRmTrend[selectedExercise]?.[oneRmTrend[selectedExercise]!.length - 1]?.oneRm.toFixed(1)}kg
              </span>
            </div>
          </div>
        )}
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
