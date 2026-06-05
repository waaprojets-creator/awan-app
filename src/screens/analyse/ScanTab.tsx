import React, { useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import { safeStorage } from '@/utils/safeStorage';
import { BiometricsService } from '@/services/biometricsService';
import { useMeasurementStore } from '@/hooks/useMeasurementStore';
import { useWeightStore } from '@/hooks/useWeightStore';
import { Card } from '@/components/ui/Card';
import { Touch } from '@/components/ui/Touch';
import { Heading } from '@/components/ui/Heading';
import { ds } from '@/utils/storage';
import { useTheme } from '@/hooks/useTheme';
import { FontMono } from '@/constants/typography';

// ─── Site lists (must match MensurationScreen) ────────────────────────────────
const JP7_SITES = ['pectoral', 'axillaire', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh_anterior'] as const;
const DW4_SITES = ['biceps', 'triceps', 'subscapular', 'suprailiac'] as const;
const ALL13_SITES = [
  'pectoral', 'axillaire', 'triceps', 'subscapular', 'abdominal', 'suprailiac',
  'thigh_anterior', 'biceps', 'calf_medial', 'supraspinal', 'abdominal_lateral',
  'thigh_lateral', 'forearm',
] as const;

const SCAN_RANGES = [
  { id: 30,  label: '30J',  sublabel: 'COURT' },
  { id: 90,  label: '90J',  sublabel: 'MOYEN' },
  { id: 365, label: '1AN',  sublabel: 'LONG' },
] as const;
type ScanRange = 30 | 90 | 365;

// ─── BF% series for a measurement entry ──────────────────────────────────────
function computeBfSeries(
  entries: ReturnType<typeof useMeasurementStore>['history'],
  age: number,
  sex: 'male' | 'female',
  cutoff: Date,
) {
  return entries
    .filter(e => new Date(e.date) >= cutoff)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => {
      const sk = e.skinfolds ?? {};
      const s13Total = ALL13_SITES.every(k => (sk[k] ?? 0) > 0)
        ? ALL13_SITES.reduce((sum, k) => sum + (sk[k] ?? 0), 0) : 0;
      const bf13 = s13Total > 0 ? BiometricsService.skinfolds13(s13Total, age, sex) : null;
      const bfJP7 = JP7_SITES.every(k => (sk[k] ?? 0) > 0)
        ? BiometricsService.jacksonPollock7(
            sk['pectoral'] ?? 0, sk['axillaire'] ?? 0, sk['triceps'] ?? 0,
            sk['subscapular'] ?? 0, sk['abdominal'] ?? 0, sk['suprailiac'] ?? 0,
            sk['thigh_anterior'] ?? 0, age, sex)
        : null;
      const bfDW4 = DW4_SITES.every(k => (sk[k] ?? 0) > 0)
        ? BiometricsService.durninWomersley4(
            sk['biceps'] ?? 0, sk['triceps'] ?? 0, sk['subscapular'] ?? 0, sk['suprailiac'] ?? 0, age, sex)
        : null;
      return { date: e.date, bf13, bfJP7, bfDW4 };
    });
}

// ─── SVG multi-line chart ─────────────────────────────────────────────────────
type Point = { date: string; v: number | null };

function buildPath(points: Point[], minY: number, rangeY: number, xs: number[], W: number, H: number) {
  const pts = points.map((p, i) => p.v !== null
    ? { x: xs[i]!, y: H - Math.max(4, ((p.v - minY) / rangeY) * (H - 16) + 8) }
    : null
  );
  // Build segments (skip null gaps)
  const segments: string[] = [];
  let seg = '';
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i] ?? null;
    if (p === null) { if (seg) { segments.push(seg); seg = ''; } continue; }
    seg += seg === '' ? `M${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }
  if (seg) segments.push(seg);
  return { d: segments.join(' '), dots: pts.filter((p): p is { x: number; y: number } => p !== null) };
}

interface MultiLineChartProps {
  series13: Point[];
  seriesJP7: Point[];
  seriesDW4: Point[];
}

function MultiLineChart({ series13, seriesJP7, seriesDW4 }: MultiLineChartProps) {
  const theme = useTheme();
  const W = 300;
  const H = 120;

  const allVals = [
    ...series13.map(p => p.v),
    ...seriesJP7.map(p => p.v),
    ...seriesDW4.map(p => p.v),
  ].filter((v): v is number => v !== null);

  if (allVals.length === 0) return null;

  // Combine all dates for x axis
  const allDates = Array.from(new Set([
    ...series13.map(p => p.date),
    ...seriesJP7.map(p => p.date),
    ...seriesDW4.map(p => p.date),
  ])).sort();

  if (allDates.length < 2) return null;

  const minTs = new Date(allDates[0]!).getTime();
  const maxTs = new Date(allDates[allDates.length - 1]!).getTime();
  const tsRange = maxTs - minTs || 1;

  function dateToX(date: string) {
    return ((new Date(date).getTime() - minTs) / tsRange) * (W - 10) + 5;
  }

  const padding = 2;
  const minY = Math.max(0, Math.floor(Math.min(...allVals)) - padding);
  const maxY = Math.ceil(Math.max(...allVals)) + padding;
  const rangeY = maxY - minY || 1;

  function buildSvgPath(series: Point[]) {
    const filtered = series.filter(p => p.v !== null);
    if (filtered.length === 0) return '';
    const segments: string[] = [];
    let seg = '';
    for (const p of series) {
      if (p.v === null) { if (seg) { segments.push(seg); seg = ''; } continue; }
      const x = dateToX(p.date).toFixed(1);
      const y = (H - Math.max(4, ((p.v - minY) / rangeY) * (H - 16) + 8)).toFixed(1);
      seg += seg === '' ? `M${x},${y}` : `L${x},${y}`;
    }
    if (seg) segments.push(seg);
    return segments.join(' ');
  }

  function buildDots(series: Point[]) {
    return series
      .filter(p => p.v !== null)
      .map(p => ({
        cx: dateToX(p.date),
        cy: H - Math.max(4, ((p.v! - minY) / rangeY) * (H - 16) + 8),
        v: p.v!,
      }));
  }

  const path13 = buildSvgPath(series13);
  const pathJP7 = buildSvgPath(seriesJP7);
  const pathDW4 = buildSvgPath(seriesDW4);
  const dots13 = buildDots(series13);
  const dotsJP7 = buildDots(seriesJP7);
  const dotsDW4 = buildDots(seriesDW4);

  // Y-axis labels: min and max
  const yLabels = [minY, Math.round((minY + maxY) / 2), maxY];

  return (
    <div style={{ position: 'relative' }}>
      {/* Y-axis labels */}
      <div style={{ position: 'absolute', left: 0, top: 0, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 4 }}>
        {[...yLabels].reverse().map(v => (
          <span key={v} style={{ fontSize: 9, fontFamily: FontMono, color: theme.mute, lineHeight: '12px' }}>
            {v}%
          </span>
        ))}
      </div>
      <div style={{ marginLeft: 28 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
          {/* Grid lines */}
          {yLabels.map((v, i) => {
            const y = H - Math.max(4, ((v - minY) / rangeY) * (H - 16) + 8);
            return (
              <line
                key={i}
                x1={0} y1={y.toFixed(1)} x2={W} y2={y.toFixed(1)}
                stroke="rgba(255,255,255,0.05)" strokeWidth={1}
              />
            );
          })}

          {/* DW4 — dashed, muted */}
          {pathDW4 && (
            <path
              d={pathDW4}
              fill="none"
              stroke={theme.mute}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              strokeOpacity={0.7}
            />
          )}
          {dotsDW4.map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={3} fill={theme.mute} fillOpacity={0.7} />
          ))}

          {/* JP7 — dashed, tx */}
          {pathJP7 && (
            <path
              d={pathJP7}
              fill="none"
              stroke={theme.title}
              strokeWidth={1.5}
              strokeDasharray="6 3"
              strokeOpacity={0.8}
            />
          )}
          {dotsJP7.map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={3} fill={theme.title} fillOpacity={0.8} />
          ))}

          {/* 13-plis — solid gold (primary) */}
          {path13 && (
            <path
              d={path13}
              fill="none"
              stroke={theme.selected}
              strokeWidth={2}
            />
          )}
          {dots13.map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={4} fill={theme.selected} />
          ))}
        </svg>

        {/* X-axis: first and last date */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 9, fontFamily: FontMono, color: theme.mute }}>
            {allDates[0]?.slice(5).replace('-', '/')}
          </span>
          <span style={{ fontSize: 9, fontFamily: FontMono, color: theme.mute }}>
            {allDates[allDates.length - 1]?.slice(5).replace('-', '/')}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── ScanTab ──────────────────────────────────────────────────────────────────
export default function ScanTab() {
  const theme = useTheme();
  const measureStore = useMeasurementStore();
  const weightStore = useWeightStore();
  const [scanRange, setScanRange] = useState<ScanRange>(90);

  const profile = useMemo(() => {
    const raw = safeStorage.get('awan.nutrition.profile');
    if (!raw) return { age: 30, sex: 'male' as const };
    try {
      const p = JSON.parse(raw) as Record<string, unknown>;
      return {
        age: typeof p.age === 'number' ? p.age : 30,
        sex: p.gender === 'woman' ? 'female' as const : 'male' as const,
      };
    } catch { return { age: 30, sex: 'male' as const }; }
  }, []);

  const cutoff = useMemo(() => subDays(new Date(), scanRange), [scanRange]);

  const bfSeries = useMemo(
    () => computeBfSeries(measureStore.history, profile.age, profile.sex, cutoff),
    [measureStore.history, profile, cutoff],
  );

  const series13 = useMemo(() => bfSeries.map(p => ({ date: p.date, v: p.bf13 })), [bfSeries]);
  const seriesJP7 = useMemo(() => bfSeries.map(p => ({ date: p.date, v: p.bfJP7 })), [bfSeries]);
  const seriesDW4 = useMemo(() => bfSeries.map(p => ({ date: p.date, v: p.bfDW4 })), [bfSeries]);

  const has13 = series13.some(p => p.v !== null);
  const hasJP7 = seriesJP7.some(p => p.v !== null);
  const hasDW4 = seriesDW4.some(p => p.v !== null);
  const hasAny = has13 || hasJP7 || hasDW4;

  // Latest values for stats row
  const latest = useMemo(() => {
    const last = bfSeries.filter(p => p.bf13 !== null || p.bfJP7 !== null || p.bfDW4 !== null).at(-1);
    return last ?? null;
  }, [bfSeries]);

  const history = useMemo(() => {
    return measureStore.history
      .filter(m => new Date(m.date) >= cutoff)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [measureStore.history, cutoff]);

  return (
    <div className="space-y-8">

      {/* Range selector */}
      <div className="flex flex-row gap-3">
        {SCAN_RANGES.map(r => (
          <Touch
            key={r.id}
            onPress={() => setScanRange(r.id)}
            className="flex-1 py-2 border items-center transition-all"
            style={{
              borderColor: scanRange === r.id ? theme.selected : 'rgba(255,255,255,0.08)',
              backgroundColor: scanRange === r.id ? 'rgba(212,175,55,0.1)' : 'transparent',
            }}
          >
            <span
              className="text-awan-md font-black tracking-[0.2em] block"
              style={{ color: scanRange === r.id ? theme.selected : theme.mute }}
            >
              {r.label}
            </span>
            <span
              className="text-awan-sm font-black tracking-widest uppercase block mt-0.5"
              style={{ color: scanRange === r.id ? theme.selected : theme.mute, opacity: 0.6 }}
            >
              {r.sublabel}
            </span>
          </Touch>
        ))}
      </div>

      {/* BF% multi-curve chart */}
      <Card className="p-5 bg-white/3 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Formules scientifiques indépendantes" className="mb-5">
          % MASSE GRASSE — ÉVOLUTION
        </Heading>

        {!hasAny ? (
          <div
            className="h-[100px] flex items-center justify-center"
            style={{ borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <span
              className="text-awan-xs font-black tracking-widest uppercase"
              style={{ color: theme.mute }}
            >
              SAISIR LES PLIS CUTANÉS POUR AFFICHER LES COURBES
            </span>
          </div>
        ) : (
          <MultiLineChart series13={series13} seriesJP7={seriesJP7} seriesDW4={seriesDW4} />
        )}

        {/* Legend */}
        <div className="flex flex-row flex-wrap gap-x-5 gap-y-2 mt-5 pt-4 border-t border-white/5">
          <div className="flex flex-row items-center gap-2">
            <svg width="24" height="10">
              <line x1="0" y1="5" x2="24" y2="5" stroke={theme.selected} strokeWidth="2" />
              <circle cx="12" cy="5" r="3" fill={theme.selected} />
            </svg>
            <div>
              <span className="text-awan-md font-black tracking-widest uppercase" style={{ color: theme.selected }}>13 PLIS</span>
              <span className="text-awan-sm block" style={{ color: theme.mute }}>Haute densité · {has13 ? `${series13.filter(p => p.v !== null).length} pts` : '—'}</span>
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <svg width="24" height="10">
              <line x1="0" y1="5" x2="24" y2="5" stroke={theme.title} strokeWidth="1.5" strokeDasharray="6 3" strokeOpacity="0.8" />
              <circle cx="12" cy="5" r="3" fill={theme.title} fillOpacity="0.8" />
            </svg>
            <div>
              <span className="text-awan-md font-black tracking-widest uppercase" style={{ color: theme.title }}>JP7</span>
              <span className="text-awan-sm block" style={{ color: theme.mute }}>Athlétique · 7 sites · {hasJP7 ? `${seriesJP7.filter(p => p.v !== null).length} pts` : '—'}</span>
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <svg width="24" height="10">
              <line x1="0" y1="5" x2="24" y2="5" stroke={theme.mute} strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity="0.7" />
              <circle cx="12" cy="5" r="3" fill={theme.mute} fillOpacity="0.7" />
            </svg>
            <div>
              <span className="text-awan-md font-black tracking-widest uppercase" style={{ color: theme.mute }}>DW4</span>
              <span className="text-awan-sm block" style={{ color: theme.mute }}>Population générale · 4 sites · {hasDW4 ? `${seriesDW4.filter(p => p.v !== null).length} pts` : '—'}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Latest values row */}
      {latest && (
        <div className="grid grid-cols-3 gap-3">
          {latest.bf13 !== null && (
            <Card className="p-4 bg-white/3 border-white/5" variant="flat">
              <span className="text-awan-sm font-black tracking-widest uppercase block mb-1" style={{ color: theme.selected }}>13 PLIS</span>
              <span className="text-2xl font-black font-mono" style={{ color: theme.selected }}>
                {latest.bf13}<span className="text-xs ml-0.5" style={{ color: theme.mute }}>%</span>
              </span>
              <span className="text-awan-sm font-black uppercase tracking-widest block mt-1" style={{ color: theme.mute }}>{latest.date.slice(5).replace('-', '/')}</span>
            </Card>
          )}
          {latest.bfJP7 !== null && (
            <Card className="p-4 bg-white/3 border-white/5" variant="flat">
              <span className="text-awan-sm font-black tracking-widest uppercase block mb-1" style={{ color: theme.title }}>JP7</span>
              <span className="text-2xl font-black font-mono" style={{ color: theme.title }}>
                {latest.bfJP7}<span className="text-xs ml-0.5" style={{ color: theme.mute }}>%</span>
              </span>
              <span className="text-awan-sm font-black uppercase tracking-widest block mt-1" style={{ color: theme.mute }}>{latest.date.slice(5).replace('-', '/')}</span>
            </Card>
          )}
          {latest.bfDW4 !== null && (
            <Card className="p-4 bg-white/3 border-white/5" variant="flat">
              <span className="text-awan-sm font-black tracking-widest uppercase block mb-1" style={{ color: theme.mute }}>DW4</span>
              <span className="text-2xl font-black font-mono" style={{ color: theme.mute }}>
                {latest.bfDW4}<span className="text-xs ml-0.5">%</span>
              </span>
              <span className="text-awan-sm font-black uppercase tracking-widest block mt-1" style={{ color: theme.mute }}>{latest.date.slice(5).replace('-', '/')}</span>
            </Card>
          )}
        </div>
      )}

      {/* Écart max sur la période */}
      {latest && [latest.bf13, latest.bfJP7, latest.bfDW4].filter((v): v is number => v !== null).length >= 2 && (() => {
        const vals = [latest.bf13, latest.bfJP7, latest.bfDW4].filter((v): v is number => v !== null);
        const ecart = parseFloat((Math.max(...vals) - Math.min(...vals)).toFixed(1));
        return (
          <Card
            className="p-4 border-white/5"
            variant="flat"
            style={{ backgroundColor: ecart > 3 ? 'rgba(255,165,0,0.05)' : 'rgba(255,255,255,0.02)' }}
          >
            <div className="flex flex-row items-center justify-between">
              <div>
                <span className="text-awan-sm font-black tracking-widest uppercase block mb-1" style={{ color: theme.mute }}>ÉCART MAX INTER-MÉTHODES</span>
                <span className="text-awan-sm block leading-relaxed" style={{ color: theme.mute }}>
                  {ecart <= 3 ? 'Cohérence mesure confirmée' : 'Vérifier la technique de saisie'}
                </span>
              </div>
              <span
                className="text-2xl font-black font-mono"
                style={{ color: ecart > 3 ? theme.statusWarn : theme.statusOk }}
              >
                {ecart}%
              </span>
            </div>
          </Card>
        );
      })()}

      {/* Measurement list */}
      {history.length > 0 && (
        <div className="space-y-3">
          <span className="text-awan-xs font-black tracking-[0.3em] uppercase" style={{ color: theme.mute }}>
            HISTORIQUE · {scanRange}J
          </span>
          {history.slice(0, 10).map((m, i) => {
            const w = weightStore.entries.filter(e => e.date <= m.date).sort((a, b) => b.date.localeCompare(a.date))[0];
            const sk = m.skinfolds ?? {};
            const age = profile.age;
            const sex = profile.sex;
            const s13Total = ALL13_SITES.every(k => (sk[k] ?? 0) > 0)
              ? ALL13_SITES.reduce((sum, k) => sum + (sk[k] ?? 0), 0) : 0;
            const bf13 = s13Total > 0 ? BiometricsService.skinfolds13(s13Total, age, sex) : null;
            const bfJP7 = JP7_SITES.every(k => (sk[k] ?? 0) > 0)
              ? BiometricsService.jacksonPollock7(sk['pectoral'] ?? 0, sk['axillaire'] ?? 0, sk['triceps'] ?? 0, sk['subscapular'] ?? 0, sk['abdominal'] ?? 0, sk['suprailiac'] ?? 0, sk['thigh_anterior'] ?? 0, age, sex)
              : null;
            const bfDW4 = DW4_SITES.every(k => (sk[k] ?? 0) > 0)
              ? BiometricsService.durninWomersley4(sk['biceps'] ?? 0, sk['triceps'] ?? 0, sk['subscapular'] ?? 0, sk['suprailiac'] ?? 0, age, sex)
              : null;
            return (
              <Card key={i} className="p-4 bg-white/3 border-white/5" variant="flat">
                <div className="flex flex-row items-center justify-between mb-3">
                  <span className="text-awan-sm font-mono font-bold tracking-widest" style={{ color: theme.selected }}>
                    {m.date.slice(5).replace('-', '/')}
                  </span>
                  {w && (
                    <span className="text-awan-sm font-black font-mono" style={{ color: theme.mute }}>
                      {w.weightKg} KG
                    </span>
                  )}
                </div>
                <div className="flex flex-row gap-4">
                  {bf13 !== null && (
                    <div>
                      <span className="text-awan-sm font-black tracking-widest uppercase block" style={{ color: theme.selected }}>13P</span>
                      <span className="text-base font-black font-mono" style={{ color: theme.selected }}>{bf13}%</span>
                    </div>
                  )}
                  {bfJP7 !== null && (
                    <div>
                      <span className="text-awan-sm font-black tracking-widest uppercase block" style={{ color: theme.title }}>JP7</span>
                      <span className="text-base font-black font-mono" style={{ color: theme.title }}>{bfJP7}%</span>
                    </div>
                  )}
                  {bfDW4 !== null && (
                    <div>
                      <span className="text-awan-sm font-black tracking-widest uppercase block" style={{ color: theme.mute }}>DW4</span>
                      <span className="text-base font-black font-mono" style={{ color: theme.mute }}>{bfDW4}%</span>
                    </div>
                  )}
                  {bf13 === null && bfJP7 === null && bfDW4 === null && m.body_fat_pct > 0 && (
                    <div>
                      <span className="text-awan-sm font-black tracking-widest uppercase block" style={{ color: theme.mute }}>MG</span>
                      <span className="text-base font-black font-mono" style={{ color: theme.mute }}>{m.body_fat_pct}%</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
