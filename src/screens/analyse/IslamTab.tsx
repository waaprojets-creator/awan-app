import React, { useEffect, useState } from 'react';
import { subDays, format, parseISO } from 'date-fns';
import { IslamService } from '@/services/islamService';
import { PRAYER_NAMES } from '@/data/schemas/islam/prayerLog';
import { ds } from '@/utils/storage';
import { Card } from '@/components/ui/Card';

// Obligatory prayers only (fard) for streak calculation
const FARD_PRAYERS = ['sobh', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
const TOTAL_PRAYERS = PRAYER_NAMES.length; // 7

interface DayData {
  date: string;
  label: string;
  count: number;
}

interface WeekData {
  label: string;
  ayahs: number;
}

interface Props {
  today: string;
  range: string;
}

export default function IslamTab({ today }: Props) {
  const [days30, setDays30] = useState<DayData[]>([]);
  const [weeks8, setWeeks8] = useState<WeekData[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      // 30 days prayer adherence
      const dayResults: DayData[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = subDays(new Date(today), i);
        const dateStr = ds(d);
        const log = await IslamService.getPrayerLog(dateStr);
        const count = log
          ? PRAYER_NAMES.filter(p => log.prayers?.[p]).length
          : 0;
        dayResults.push({
          date: dateStr,
          label: format(d, 'dd/MM'),
          count,
        });
      }

      // streak: consecutive days with 5+ fard prayers
      let s = 0;
      for (let i = dayResults.length - 1; i >= 0; i--) {
        const d = dayResults[i];
        const log = await IslamService.getPrayerLog(d.date);
        const fardDone = log
          ? FARD_PRAYERS.filter(p => log.prayers?.[p as keyof typeof log.prayers]).length
          : 0;
        if (fardDone >= 5) s++;
        else break;
      }

      // 8 weeks Quran sessions
      const weekResults: WeekData[] = [];
      for (let w = 7; w >= 0; w--) {
        let weekAyahs = 0;
        for (let d = 6; d >= 0; d--) {
          const dateStr = ds(subDays(new Date(today), w * 7 + d));
          const sessions = await IslamService.getQuranSessions(dateStr);
          if (sessions) {
            weekAyahs += sessions.sessions.reduce((acc, s) => acc + s.ayahsRead, 0);
          }
        }
        const refDate = subDays(new Date(today), w * 7);
        weekResults.push({ label: format(refDate, 'dd/MM'), ayahs: weekAyahs });
      }

      if (active) {
        setDays30(dayResults);
        setStreak(s);
        setWeeks8(weekResults);
        setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [today]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em' }}>CHARGEMENT...</span>
      </div>
    );
  }

  const maxAyahs = Math.max(...weeks8.map(w => w.ayahs), 1);
  const chartHeight = 100;

  return (
    <div className="space-y-5">
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', fontWeight: 700, color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em', display: 'block' }}>
        ANALYSE ISLAM · 30 JOURS
      </span>

      {/* Streak */}
      <div className="flex flex-row gap-3">
        <Card className="flex-1 p-4" variant="flat">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.2em', display: 'block', marginBottom: 6 }}>
            STREAK PRIÈRES
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '36px', fontWeight: 700, color: 'var(--color-awan-gold)', lineHeight: 1 }}>
            {streak}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.15em', display: 'block', marginTop: 4 }}>
            jours consécutifs ≥5 fard
          </span>
        </Card>
        <Card className="flex-1 p-4" variant="flat">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.2em', display: 'block', marginBottom: 6 }}>
            MOY. ADHÉRENCE 30J
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '36px', fontWeight: 700, color: 'var(--color-awan-tx)', lineHeight: 1 }}>
            {days30.length > 0
              ? Math.round((days30.reduce((a, d) => a + d.count, 0) / (days30.length * TOTAL_PRAYERS)) * 100)
              : 0}
            <span style={{ fontSize: '14px', color: 'var(--color-awan-tx-mute)' }}>%</span>
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.15em', display: 'block', marginTop: 4 }}>
            sur {TOTAL_PRAYERS} prières/jour
          </span>
        </Card>
      </div>

      {/* 30-day adherence bars */}
      <Card className="p-4" variant="flat">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-gold)', letterSpacing: '0.2em', display: 'block', marginBottom: 12 }}>
          ADHÉRENCE PRIÈRES · 30J
        </span>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 56 }}>
          {days30.map((d, i) => {
            const ratio = d.count / TOTAL_PRAYERS;
            const barColor = ratio >= 0.85
              ? 'var(--color-awan-status-ok)'
              : ratio >= 0.5
                ? 'var(--color-awan-gold)'
                : ratio > 0
                  ? 'color-mix(in srgb, var(--color-awan-status-warn) 60%, transparent)'
                  : 'color-mix(in srgb, var(--color-awan-border) 60%, transparent)';
            return (
              <div
                key={i}
                title={`${d.label} — ${d.count}/${TOTAL_PRAYERS}`}
                style={{
                  flex: 1,
                  height: `${Math.max(4, ratio * 100)}%`,
                  backgroundColor: barColor,
                  alignSelf: 'flex-end',
                }}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          {[days30[0], days30[14], days30[29]].map((d, i) => d ? (
            <span key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'var(--color-awan-tx-mute)' }}>{d.label}</span>
          ) : null)}
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { color: 'var(--color-awan-status-ok)', label: '≥6/7' },
            { color: 'var(--color-awan-gold)', label: '4-5/7' },
            { color: 'color-mix(in srgb, var(--color-awan-status-warn) 60%, transparent)', label: '1-3/7' },
            { color: 'color-mix(in srgb, var(--color-awan-border) 60%, transparent)', label: '0/7' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, backgroundColor: color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.1em' }}>{label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 8-week Quran ayahs chart */}
      <Card className="p-4" variant="flat">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-gold)', letterSpacing: '0.2em', display: 'block', marginBottom: 12 }}>
          VERSETS CORAN · 8 SEMAINES
        </span>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: chartHeight }}>
          {weeks8.map((w, i) => {
            const ratio = w.ayahs / maxAyahs;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: w.ayahs > 0 ? 'var(--color-awan-tx)' : 'transparent', letterSpacing: '0.05em' }}>
                  {w.ayahs}
                </span>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(ratio > 0 ? 4 : 0, ratio * (chartHeight - 20))}px`,
                    backgroundColor: 'var(--color-awan-gold)',
                    opacity: 0.6 + ratio * 0.4,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          {weeks8.map((w, i) => (
            <span key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '6px', color: 'var(--color-awan-tx-mute)', flex: 1, textAlign: 'center' }}>
              {w.label}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
