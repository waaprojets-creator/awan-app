import { useState, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export type TemporalMode = 'MATIN' | 'JOUR' | 'SOIR' | 'NUIT';

export interface TemporalState {
  mode:  TemporalMode;
  hour:  number;
  label: string;       // libellé display Cairo
  // Token status — résolu par InstrumentCard via var(--color-awan-status-*)
  status: 'spirit' | 'ok' | 'warn' | 'mute';
}

// ── Tranches horaires ──────────────────────────────────────────────────────────
// Calées sur un rythme journalier naturel + pratique islamique
// NUIT  : 00h–05h  (Tahajjud / Fajr approche)
// MATIN : 05h–11h  (Fajr → fin du matin)
// JOUR  : 11h–18h  (Dhuhr / Asr / activité)
// SOIR  : 18h–00h  (Maghrib / Isha / bilan)

function modeFromHour(hour: number): TemporalMode {
  if (hour >= 5  && hour < 11) return 'MATIN';
  if (hour >= 11 && hour < 18) return 'JOUR';
  if (hour >= 18)              return 'SOIR';
  return 'NUIT';
}

const MODE_META: Record<TemporalMode, { label: string; status: TemporalState['status'] }> = {
  MATIN: { label: 'MATIN',  status: 'ok'     },
  JOUR:  { label: 'JOUR',   status: 'ok'     },
  SOIR:  { label: 'SOIR',   status: 'warn'   },
  NUIT:  { label: 'NUIT',   status: 'spirit' },
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useTemporalMode(): TemporalState {
  const [hour, setHour] = useState(() => new Date().getHours());

  useEffect(() => {
    // Recalcule à chaque changement d'heure entière
    const msUntilNextHour = () => {
      const now = new Date();
      return (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000;
    };

    let timeout: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timeout = setTimeout(() => {
        setHour(new Date().getHours());
        schedule();
      }, msUntilNextHour());
    };

    schedule();
    return () => clearTimeout(timeout);
  }, []);

  const mode = modeFromHour(hour);
  const meta = MODE_META[mode];

  return { mode, hour, label: meta.label, status: meta.status };
}
