import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';
import { Moon } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { IslamService } from '../../services/islamService';
import { BarChart, GuardCard, LoadingState } from './shared';

function todayIso(): string { return new Date().toISOString().slice(0, 10); }
function subDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function isoWeek(date: string): string {
  const d = new Date(date);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const start = new Date(jan4);
  start.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const diff = d.getTime() - start.getTime();
  const week = Math.floor(diff / (7 * 86400000)) + 1;
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function IslamTab() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [prayerData, setPrayerData] = useState<Array<{ date: string; fardScore: number }>>([]);
  const [weeklyAyahs, setWeeklyAyahs] = useState<Array<{ week: string; ayahs: number }>>([]);

  useEffect(() => {
    const today = todayIso();
    const from30 = subDaysIso(29);
    const from56 = subDaysIso(55);

    Promise.all([
      IslamService.getPrayerLogsByDateRange(from30, today),
      IslamService.getQuranSessionsByDateRange(from56, today),
    ]).then(([logs, sessions]) => {
      // Build 30-day fardScore array (0 if no log)
      const dayMap: Record<string, number> = {};
      for (const l of logs) dayMap[l.date] = l.fardScore ?? 0;
      const days30: Array<{ date: string; fardScore: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const d = subDaysIso(i);
        days30.push({ date: d, fardScore: dayMap[d] ?? 0 });
      }
      setPrayerData(days30);

      // Build 8-week ayahs totals
      const weekMap: Record<string, number> = {};
      for (const s of sessions) {
        const wk = isoWeek(s.date);
        weekMap[wk] = (weekMap[wk] ?? 0) + s.ayahsRead;
      }
      const sortedWeeks = Object.keys(weekMap).sort().slice(-8);
      setWeeklyAyahs(sortedWeeks.map(w => ({ week: w, ayahs: weekMap[w] ?? 0 })));

      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState label="CHARGEMENT ISLAM..." />;

  let streak = 0;
  for (let i = 0; i < prayerData.length; i++) {
    const d = subDaysIso(i);
    const entry = prayerData.find(p => p.date === d);
    if (!entry || entry.fardScore < 1) break;
    streak++;
  }

  const avgAdherence = prayerData.length > 0
    ? Math.round(prayerData.reduce((s, d) => s + d.fardScore, 0) / prayerData.length * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Section 1 — Adhérence 30j */}
      <Card className="p-5 bg-white/5 border-white/5">
        <div className="flex flex-row items-center justify-between mb-4">
          <Heading level={4} mono>ADHÉRENCE PRIÈRES 30J</Heading>
          <div className="px-3 py-1" style={{ backgroundColor: avgAdherence >= 80 ? 'rgba(78,205,196,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${avgAdherence >= 80 ? theme.statusOk : 'rgba(255,255,255,0.1)'}` }}>
            <span style={{ fontFamily: FontMono, fontSize: '14px', fontWeight: 700, color: avgAdherence >= 80 ? theme.statusOk : theme.mute, letterSpacing: '0.1em' }}>
              {avgAdherence}%
            </span>
          </div>
        </div>
        {prayerData.every(d => d.fardScore === 0) ? (
          <GuardCard message="Aucune prière enregistrée — saisie dans Islam → Chrono Prières" />
        ) : (
          <BarChart
            data={prayerData}
            dataKey="fardScore"
            color={theme.selected}
          />
        )}
      </Card>

      {/* Section 2 — Streak */}
      <Card className="p-5 bg-white/5 border-white/5">
        <Heading level={4} mono className="mb-4">SÉQUENCE FARD</Heading>
        {streak === 0 ? (
          <GuardCard message="Aucune séquence — compte à partir de ta prochaine prière complète" />
        ) : (
          <div className="flex flex-row items-center gap-6 py-4">
            <Moon size={32} className="text-awan-gold" />
            <div>
              <span style={{ fontFamily: FontMono, fontSize: '48px', fontWeight: 700, color: theme.selected, lineHeight: 1 }}>
                {streak}
              </span>
              <span style={{ fontFamily: FontMono, fontSize: '11px', color: theme.mute, letterSpacing: '0.2em', display: 'block', marginTop: 4 }}>
                JOUR{streak > 1 ? 'S' : ''} CONSÉCUTIF{streak > 1 ? 'S' : ''}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Section 3 — Versets par semaine */}
      <Card className="p-5 bg-white/5 border-white/5">
        <Heading level={4} mono className="mb-4">VERSETS / SEMAINE</Heading>
        {weeklyAyahs.length === 0 ? (
          <GuardCard message="Aucune session Coran — saisie dans Islam → Wird" />
        ) : (
          <>
            <BarChart
              data={weeklyAyahs}
              dataKey="ayahs"
              color={theme.statusOk}
            />
            <div className="mt-3 flex flex-row justify-between">
              {weeklyAyahs.slice(-4).map(w => (
                <span key={w.week} style={{ fontFamily: FontMono, fontSize: '8px', color: theme.mute, letterSpacing: '0.1em' }}>
                  {w.week.split('-')[1]}
                </span>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
