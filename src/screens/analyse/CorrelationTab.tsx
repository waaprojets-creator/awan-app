import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { ds } from '../../utils/storage';
import type { WorkoutSessionLatest } from '../../data/schemas/sport/routine';
import type { MeasurementLatest } from '../../data/schemas/anthropo/measurement';
import type { WeightEntryLatest } from '../../data/schemas/body/weightEntry';
import { Card } from '../../components/ui/Card';

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

  return (
    <div className="space-y-6">
      <span className="text-awan-xs font-black text-awan-tx-mute tracking-[0.3em] uppercase block">
        CORRÉLATIONS INTER-MODULES · 30 JOURS
      </span>

      <Card className="p-5 bg-white/5 border-white/5" variant="flat">
        <span className="awan-label text-awan-gold mb-4 block">SPORT × POIDS</span>
        <div className="flex flex-row gap-0.5 h-16 items-end mb-2">
          {last30.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              {d.weight && avgWeight ? (
                <div className="w-full" style={{
                  height: `${Math.max(4, Math.min(48, (d.weight / avgWeight) * 32))}px`,
                  backgroundColor: d.hasWorkout ? theme.selected : 'rgba(255,255,255,0.12)',
                }} />
              ) : (
                <div className="w-full h-1" style={{ backgroundColor: d.hasWorkout ? theme.selected : 'transparent' }} />
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-row gap-4 mt-3">
          <div className="flex flex-row items-center gap-1.5">
            <div className="w-3 h-3" style={{ backgroundColor: theme.selected }} />
            <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest">Séance</span>
          </div>
          <div className="flex flex-row items-center gap-1.5">
            <div className="w-3 h-3 bg-white/12" />
            <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest">Repos</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-5 bg-white/5 border-white/5" variant="flat">
          <span className="awan-label text-awan-tx-mute mb-2 block">FRÉQUENCE</span>
          <span className="text-3xl font-black text-awan-gold font-mono">{sessionsPerWeek.toFixed(1)}</span>
          <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest mt-1 block">séances/sem · 30j</span>
        </Card>
        <Card className="p-5 bg-white/5 border-white/5" variant="flat">
          <span className="awan-label text-awan-tx-mute mb-2 block">POIDS · DELTA</span>
          <span className={`text-3xl font-black font-mono ${weightDelta == null ? 'text-awan-tx-mute' : weightDelta < 0 ? 'text-awan-status-ok' : weightDelta > 0 ? 'text-awan-status-warn' : 'text-awan-tx'}`}>
            {weightDelta != null ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)}` : '—'}
          </span>
          <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest mt-1 block">kg · total historique</span>
        </Card>
        <Card className="p-5 bg-white/5 border-white/5" variant="flat">
          <span className="awan-label text-awan-tx-mute mb-2 block">JOURS SPORT</span>
          <span className="text-3xl font-black text-awan-tx font-mono">{workoutDays}<span className="text-sm ml-1 opacity-50">/30</span></span>
          <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest mt-1 block">jours actifs</span>
        </Card>
        <Card className="p-5 bg-white/5 border-white/5" variant="flat">
          <span className="awan-label text-awan-tx-mute mb-2 block">KCAL JOUR</span>
          <span className="text-3xl font-black text-awan-tx font-mono">{todayKcal || '—'}</span>
          <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest mt-1 block">aujourd'hui</span>
        </Card>
      </div>

      <Card className="p-5 bg-awan-gold/5 border-awan-gold/20" variant="flat">
        <span className="awan-label text-awan-gold mb-3 block">INSIGHTS</span>
        <div className="space-y-2">
          {sessionsPerWeek < 2 && (
            <span className="text-awan-md text-awan-tx-dim block">· Fréquence en dessous des recommandations OMS (150 min/sem)</span>
          )}
          {sessionsPerWeek >= 4 && (
            <span className="text-awan-md text-awan-status-ok block">· Excellente fréquence d'entraînement</span>
          )}
          {weightDelta != null && weightDelta < -2 && sessionsPerWeek > 2 && (
            <span className="text-awan-md text-awan-status-warn block">· Perte de poids rapide avec entraînement intensif — vérifier l'apport protéique</span>
          )}
          {weightDelta != null && weightDelta > 2 && sessionsPerWeek < 2 && (
            <span className="text-awan-md text-awan-status-warn block">· Prise de masse sans entraînement suffisant — augmenter la fréquence</span>
          )}
          {sessionsPerWeek >= 2 && weightDelta != null && Math.abs(weightDelta) <= 1 && (
            <span className="text-awan-md text-awan-status-ok block">· Équilibre sport/poids stable — maintien de la composition corporelle</span>
          )}
          {workoutDays === 0 && weightPoints.length === 0 && (
            <span className="text-awan-md text-awan-tx-mute block">· Pas de données suffisantes — continuez à enregistrer vos séances et mesures</span>
          )}
        </div>
      </Card>
    </div>
  );
}
