import React, { useEffect, useState } from 'react';
import { useTheme, type AwanTheme } from '../../hooks/useTheme';
import { Activity } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { InstrumentCard } from '../../components/ui/InstrumentCard';
import type { StatusVariant } from '../../components/ui/InstrumentCard';
import { SleepService } from '../../services/sleepService';
import { MeasurementService } from '../../services/measurementService';
import { JournalService } from '../../services/journalService';
import { EmptyState } from './shared';

// ─── Readiness state signals (W3 partial — RMSSD pending hardware) ────────────
// Source: Blatter & Cajochen 2007, Monk 2005 — circadian autonomic readiness
// RMSSD hardware integration planned in future sprint

interface ReadinessData {
  bpmRest: number | null;         // latest measurement.bpm_rest
  sleepH: number | null;          // last sleep durationH
  sleepQuality: number | null;    // last sleep quality 1-5
  mood: number | null;            // last journal mood 1-5
}

function readinessBadge(data: ReadinessData, t: Pick<AwanTheme, 'danger' | 'statusWarn' | 'statusOk'>): { label: string; color: string } {
  let alerts = 0;
  if (data.bpmRest !== null && data.bpmRest > 70) alerts++;
  if (data.sleepH !== null && data.sleepH < 6) alerts++;
  if (data.sleepQuality !== null && data.sleepQuality <= 2) alerts++;
  if (data.mood !== null && data.mood <= 2) alerts++;

  if (alerts >= 2) return { label: 'REPOS RECOMMANDÉ', color: t.danger };
  if (alerts === 1) return { label: 'VIGILANCE', color: t.statusWarn };
  return { label: 'OPTIMAL', color: t.statusOk };
}

function bpmStatus(bpm: number | null): StatusVariant {
  if (bpm === null) return 'mute';
  if (bpm <= 60) return 'ok';
  if (bpm <= 70) return 'warn';
  return 'error';
}

function sleepStatus(h: number | null): StatusVariant {
  if (h === null) return 'mute';
  if (h >= 7.5) return 'ok';
  if (h >= 6) return 'warn';
  return 'error';
}

function moodStatus(m: number | null): StatusVariant {
  if (m === null) return 'mute';
  if (m >= 4) return 'ok';
  if (m >= 3) return 'warn';
  return 'error';
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReadinessTab() {
  const theme = useTheme();
  const [data, setData] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      SleepService.getAll(),
      MeasurementService.getAll(),
      JournalService.getAll(),
    ]).then(([sleepEntries, measurements, journals]) => {
      if (!active) return;

      const lastSleep = sleepEntries[0] ?? null;
      const lastMeasure = measurements[0] ?? null;
      const lastJournal = journals[0] ?? null;

      setData({
        bpmRest: lastMeasure?.bpm_rest ?? null,
        sleepH: lastSleep?.durationH ?? null,
        sleepQuality: lastSleep?.quality ?? null,
        mood: lastJournal?.mood ?? null,
      });
      setLoading(false);
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <span className="text-awan-md text-awan-tx-mute font-black uppercase tracking-widest">Chargement…</span>
    </div>
  );

  if (!data) return <EmptyState Icon={Activity} label="Données insuffisantes" />;

  const badge = readinessBadge(data, theme);

  return (
    <div className="space-y-8">
      {/* Readiness badge */}
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="État du système nerveux autonome · Signaux composite">
          ÉTAT DE FORME
        </Heading>
        <div className="mt-4 flex flex-row items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: badge.color }} />
          <span className="font-mono text-xl font-black" style={{ color: badge.color }}>
            {badge.label}
          </span>
        </div>
      </Card>

      {/* Signal cards */}
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Dernières valeurs disponibles">SIGNAUX</Heading>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <InstrumentCard
            label="BPM REPOS"
            value={data.bpmRest !== null ? data.bpmRest : '—'}
            unit="bpm"
            status={bpmStatus(data.bpmRest)}
            {...(data.bpmRest !== null ? { delta: data.bpmRest <= 60 ? '≤ 60 ✓' : '> 60' } : {})}
            index={1}
          />
          <InstrumentCard
            label="SOMMEIL"
            value={data.sleepH !== null ? data.sleepH.toFixed(1) : '—'}
            unit="h"
            status={sleepStatus(data.sleepH)}
            {...(data.sleepQuality !== null ? { delta: `qualité ${data.sleepQuality}/5` } : {})}
            index={2}
          />
          <InstrumentCard
            label="HUMEUR"
            value={data.mood !== null ? data.mood : '—'}
            unit="/5"
            status={moodStatus(data.mood)}
            {...(data.mood !== null ? { progress: (data.mood / 5) * 100 } : {})}
            index={3}
          />
          <InstrumentCard
            label="RMSSD"
            value="—"
            unit="ms"
            status="mute"
            delta="capteur à venir"
            index={4}
          />
        </div>
      </Card>

      {/* Info note */}
      <Card className="p-4 bg-white/5 border-white/5" variant="flat">
        <span className="text-awan-xs text-awan-tx-mute">
          RMSSD (variabilité cardiaque) disponible dès intégration Polar/Garmin/Apple Health.
          Source : Blatter & Cajochen 2007 — chronobiologie du système nerveux autonome.
        </span>
      </Card>
    </div>
  );
}
