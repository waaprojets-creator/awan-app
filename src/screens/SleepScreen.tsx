import React, { useState, useMemo } from 'react';
import { ScrollView, Alert } from 'react-native';
import { Moon, Trash2 } from 'lucide-react';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';
import { Card } from '../components/ui/Card';
import { useSleepStore } from '../hooks/useSleepStore';
import { ds, uid } from '../utils/storage';
import type { NavProps } from '../types/nav';
import type { SleepEntryLatest } from '../data/schemas/sleep/sleepEntry';

// Seuil OMS — 7h recommandées pour adulte
const OMS_THRESHOLD_H = 7;

const QUALITY_LABELS: Record<number, string> = {
  1: 'Très mauvais',
  2: 'Mauvais',
  3: 'Moyen',
  4: 'Bon',
  5: 'Excellent',
};

function qualityColor(q: number): string {
  if (q <= 2) return 'var(--color-awan-status-error)';
  if (q === 3) return 'var(--color-awan-status-warn)';
  return 'var(--color-awan-status-ok)';
}

function durationColor(h: number): string {
  if (h < 6) return 'var(--color-awan-status-error)';
  if (h < OMS_THRESHOLD_H) return 'var(--color-awan-status-warn)';
  return 'var(--color-awan-status-ok)';
}

function formatDuration(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return mins > 0 ? `${hours}h${String(mins).padStart(2, '0')}` : `${hours}h`;
}

// SVG courbe 7 jours
function WeekChart({ entries }: { entries: SleepEntryLatest[] }) {
  const W = 280; const H = 80; const PAD = 8;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  if (sorted.length < 2) return null;

  const maxH = Math.max(...sorted.map(e => e.durationH), OMS_THRESHOLD_H + 1);
  const toX = (i: number) => PAD + (i / (sorted.length - 1)) * (W - PAD * 2);
  const toY = (h: number) => H - PAD - (h / maxH) * (H - PAD * 2);

  const points = sorted.map((e, i) => `${toX(i)},${toY(e.durationH)}`).join(' ');
  const threshY = toY(OMS_THRESHOLD_H);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {/* Ligne seuil OMS */}
      <line x1={PAD} y1={threshY} x2={W - PAD} y2={threshY}
        stroke="var(--color-awan-tx-mute)" strokeWidth="0.5" strokeDasharray="3,3" />
      <text x={W - PAD} y={threshY - 3} textAnchor="end"
        style={{ fontSize: 8, fill: 'var(--color-awan-tx-mute)', fontFamily: 'var(--font-mono)' }}>
        7h OMS
      </text>
      {/* Courbe */}
      <polyline points={points} fill="none"
        stroke="var(--color-awan-gold)" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Points */}
      {sorted.map((e, i) => (
        <circle key={e.id} cx={toX(i)} cy={toY(e.durationH)} r="3"
          fill={durationColor(e.durationH)} />
      ))}
    </svg>
  );
}

export default function SleepScreen(_props: NavProps): React.ReactElement {
  const today = ds(new Date());
  const store = useSleepStore();

  const todayEntry = useMemo(
    () => store.entries.find(e => e.date === today) ?? null,
    [store.entries, today],
  );

  const [hours, setHours]       = useState<number>(todayEntry?.durationH ? Math.floor(todayEntry.durationH) : 7);
  const [mins, setMins]         = useState<number>(todayEntry?.durationH ? Math.round((todayEntry.durationH % 1) * 60) : 0);
  const [quality, setQuality]   = useState<number>(todayEntry?.quality ?? 3);
  const [bedtime, setBedtime]   = useState<string>(todayEntry?.bedtime ?? '');
  const [wakeTime, setWakeTime] = useState<string>(todayEntry?.wakeTime ?? '');
  const [saving, setSaving]     = useState(false);

  const durationH = hours + mins / 60;

  const last7 = useMemo(
    () => store.entries.filter(e => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      return e.date >= cutoff.toISOString().slice(0, 10);
    }),
    [store.entries],
  );

  const handleSave = async () => {
    if (durationH <= 0) return;
    setSaving(true);
    const entry: SleepEntryLatest = {
      v: 1,
      id: todayEntry?.id ?? uid(),
      date: today,
      timestamp: Date.now(),
      durationH,
      quality,
      bedtime:  bedtime || undefined,
      wakeTime: wakeTime || undefined,
    };
    if (todayEntry) {
      await store.update(entry);
    } else {
      await store.add(entry);
    }
    setSaving(false);
  };

  const handleDelete = (entry: SleepEntryLatest) => {
    Alert.alert('Supprimer ?', `Entrée du ${entry.date}`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void store.remove(entry.id) },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader tag="SYSTÈME · SOMMEIL" title="SUIVI SOMMEIL" />

      {/* Saisie du jour */}
      <div className="p-4 border mb-4" style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'var(--color-awan-border)' }}>
        <span className="awan-label block mb-4">
          {todayEntry ? 'MODIFIER AUJOURD\'HUI' : 'SAISIR AUJOURD\'HUI'}
        </span>

        {/* Durée */}
        <div className="mb-4">
          <span className="awan-label text-awan-tx-mute block mb-2">DURÉE</span>
          <div className="flex flex-row items-center gap-3">
            <div className="flex flex-row items-center gap-1">
              {[5, 6, 7, 8, 9].map(h => (
                <Touch key={h} onPress={() => setHours(h)}
                  className={`w-10 h-10 flex items-center justify-center border ${hours === h ? 'border-awan-gold bg-awan-gold/10' : 'border-white/10 bg-white/5'}`}>
                  <span className="font-mono text-sm font-bold"
                    style={{ color: hours === h ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)' }}>
                    {h}h
                  </span>
                </Touch>
              ))}
            </div>
            <div className="flex flex-row items-center gap-1">
              {[0, 15, 30, 45].map(m => (
                <Touch key={m} onPress={() => setMins(m)}
                  className={`w-10 h-10 flex items-center justify-center border ${mins === m ? 'border-awan-gold bg-awan-gold/10' : 'border-white/10 bg-white/5'}`}>
                  <span className="font-mono text-xs font-bold"
                    style={{ color: mins === m ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)' }}>
                    {String(m).padStart(2, '0')}
                  </span>
                </Touch>
              ))}
            </div>
          </div>
          <span className="font-mono text-xs mt-2 block" style={{ color: durationColor(durationH) }}>
            {formatDuration(durationH)}
            {durationH < OMS_THRESHOLD_H ? ` — en dessous des ${OMS_THRESHOLD_H}h recommandées` : ' — objectif atteint ✓'}
          </span>
        </div>

        {/* Qualité */}
        <div className="mb-4">
          <span className="awan-label text-awan-tx-mute block mb-2">QUALITÉ</span>
          <div className="flex flex-row gap-2">
            {[1, 2, 3, 4, 5].map(q => (
              <Touch key={q} onPress={() => setQuality(q)}
                className={`flex-1 h-12 flex items-center justify-center border ${quality === q ? 'border-awan-gold' : 'border-white/10 bg-white/5'}`}
                style={{ backgroundColor: quality === q ? `${qualityColor(q)}20` : undefined }}>
                <span className="font-mono font-black text-base"
                  style={{ color: quality === q ? qualityColor(q) : 'var(--color-awan-tx-mute)' }}>
                  {q}
                </span>
              </Touch>
            ))}
          </div>
          <span className="font-sans text-xs mt-1 block" style={{ color: qualityColor(quality) }}>
            {QUALITY_LABELS[quality]}
          </span>
        </div>

        {/* Horaires optionnels */}
        <div className="flex flex-row gap-3 mb-4">
          <div className="flex-1">
            <span className="awan-label text-awan-tx-mute block mb-1">COUCHER</span>
            <input
              type="time"
              value={bedtime}
              onChange={e => setBedtime(e.target.value)}
              className="w-full font-mono text-sm bg-white/5 border border-white/10 px-3 py-2"
              style={{ color: 'var(--color-awan-tx)', outline: 'none' }}
            />
          </div>
          <div className="flex-1">
            <span className="awan-label text-awan-tx-mute block mb-1">RÉVEIL</span>
            <input
              type="time"
              value={wakeTime}
              onChange={e => setWakeTime(e.target.value)}
              className="w-full font-mono text-sm bg-white/5 border border-white/10 px-3 py-2"
              style={{ color: 'var(--color-awan-tx)', outline: 'none' }}
            />
          </div>
        </div>

        <Touch onPress={() => void handleSave()} disabled={saving || durationH <= 0}
          className="h-12 flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-awan-gold)', opacity: saving ? 0.5 : 1 }}>
          <span className="font-mono font-black text-sm text-black tracking-widest">
            {saving ? 'ENREGISTREMENT…' : todayEntry ? 'METTRE À JOUR' : 'ENREGISTRER'}
          </span>
        </Touch>
      </div>

      {/* Tendance 7 jours */}
      {last7.length >= 2 && (
        <div className="p-4 border mb-4" style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'var(--color-awan-border)' }}>
          <div className="flex flex-row justify-between items-baseline mb-3">
            <span className="awan-label">TENDANCE 7 JOURS</span>
            <span className="font-mono font-bold text-sm" style={{ color: durationColor(store.avgDurationH) }}>
              moy. {formatDuration(store.avgDurationH)}
            </span>
          </div>
          <WeekChart entries={last7} />
        </div>
      )}

      {/* Historique */}
      {store.entries.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="awan-label mb-1">HISTORIQUE</span>
          {store.entries.slice(0, 14).map(entry => (
            <Card key={entry.id} className="p-3 flex flex-row items-center gap-3">
              <Moon size={16} color={durationColor(entry.durationH)} />
              <div className="flex-1 flex flex-col">
                <span className="font-mono text-xs" style={{ color: 'var(--color-awan-tx-mute)' }}>
                  {entry.date}
                </span>
                <span className="font-mono font-bold text-sm" style={{ color: durationColor(entry.durationH) }}>
                  {formatDuration(entry.durationH)}
                </span>
              </div>
              <div className="flex flex-row items-center gap-2">
                <span className="font-mono font-bold text-sm" style={{ color: qualityColor(entry.quality) }}>
                  {'★'.repeat(entry.quality)}{'☆'.repeat(5 - entry.quality)}
                </span>
                <Touch onPress={() => handleDelete(entry)} className="p-1">
                  <Trash2 size={14} color="var(--color-awan-tx-mute)" />
                </Touch>
              </div>
            </Card>
          ))}
        </div>
      )}

      {store.entries.length === 0 && !store.loading && (
        <div className="p-6 flex flex-col items-center gap-2 border border-white/5"
          style={{ backgroundColor: 'var(--color-awan-surface)' }}>
          <Moon size={24} color="var(--color-awan-tx-mute)" />
          <span className="awan-label text-awan-tx-mute text-center">
            Aucune donnée — saisis ta première nuit
          </span>
        </div>
      )}
    </ScrollView>
  );
}
