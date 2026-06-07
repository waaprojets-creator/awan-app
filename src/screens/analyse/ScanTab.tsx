import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { subDays } from 'date-fns';
import { safeStorage } from '../../utils/safeStorage';
import { BiometricsService } from '../../services/biometricsService';
import { useMeasurementStore } from '../../hooks/useMeasurementStore';
import { useWeightStore } from '../../hooks/useWeightStore';
import { Card } from '../../components/ui/Card';
import { Touch } from '../../components/ui/Touch';
import { Heading } from '../../components/ui/Heading';
import { ds } from '../../utils/storage';
import { useTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls, Clr } from '../../theme/tokens';

const SvgPath_ = Path as any;
const SvgCircle_ = Circle as any;
const SvgLine_ = Line as any;

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

type Point = { date: string; v: number | null };

function MultiLineChart({ series13, seriesJP7, seriesDW4 }: {
  series13: Point[];
  seriesJP7: Point[];
  seriesDW4: Point[];
}) {
  const theme = useTheme();
  const screenW = Dimensions.get('window').width - 88;
  const W = 300;
  const H = 120;

  const allVals = [
    ...series13.map(p => p.v),
    ...seriesJP7.map(p => p.v),
    ...seriesDW4.map(p => p.v),
  ].filter((v): v is number => v !== null);

  if (allVals.length === 0) return null;

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

  const yLabels = [minY, Math.round((minY + maxY) / 2), maxY];

  return (
    <View style={{ flexDirection: 'row' }}>
      {/* Y-axis labels */}
      <View style={{ width: 28, height: H, justifyContent: 'space-between', paddingVertical: 4 }}>
        {[...yLabels].reverse().map(v => (
          <Text key={v} style={{ fontFamily: FontMono, fontSize: 9, color: theme.mute }}>
            {v}%
          </Text>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
          {yLabels.map((v, i) => {
            const y = H - Math.max(4, ((v - minY) / rangeY) * (H - 16) + 8);
            return (
              <SvgLine_ key={i} x1={0} y1={y.toFixed(1)} x2={W} y2={y.toFixed(1)}
                stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            );
          })}
          {pathDW4 ? (
            <SvgPath_ d={pathDW4} fill="none" stroke={theme.mute} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
          ) : null}
          {dotsDW4.map((p, i) => (
            <SvgCircle_ key={i} cx={p.cx} cy={p.cy} r={3} fill={theme.mute} opacity={0.7} />
          ))}
          {pathJP7 ? (
            <SvgPath_ d={pathJP7} fill="none" stroke={theme.title} strokeWidth={1.5} strokeDasharray="6 3" opacity={0.8} />
          ) : null}
          {dotsJP7.map((p, i) => (
            <SvgCircle_ key={i} cx={p.cx} cy={p.cy} r={3} fill={theme.title} opacity={0.8} />
          ))}
          {path13 ? (
            <SvgPath_ d={path13} fill="none" stroke={theme.selected} strokeWidth={2} />
          ) : null}
          {dots13.map((p, i) => (
            <SvgCircle_ key={i} cx={p.cx} cy={p.cy} r={4} fill={theme.selected} />
          ))}
        </Svg>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ fontFamily: FontMono, fontSize: 9, color: theme.mute }}>
            {allDates[0]?.slice(5).replace('-', '/')}
          </Text>
          <Text style={{ fontFamily: FontMono, fontSize: 9, color: theme.mute }}>
            {allDates[allDates.length - 1]?.slice(5).replace('-', '/')}
          </Text>
        </View>
      </View>
    </View>
  );
}

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
    <View style={{ gap: 32 }}>
      {/* Range selector */}
      <View style={s.rangeRow}>
        {SCAN_RANGES.map(r => (
          <Touch
            key={r.id}
            onPress={() => setScanRange(r.id)}
            style={[s.rangeBtn, {
              borderColor: scanRange === r.id ? theme.selected : 'rgba(255,255,255,0.08)',
              backgroundColor: scanRange === r.id ? 'rgba(212,175,55,0.1)' : 'transparent',
            }]}
          >
            <Text style={[s.rangeLabelMain, { color: scanRange === r.id ? theme.selected : theme.mute }]}>
              {r.label}
            </Text>
            <Text style={[s.rangeLabelSub, { color: scanRange === r.id ? theme.selected : theme.mute, opacity: 0.6 }]}>
              {r.sublabel}
            </Text>
          </Touch>
        ))}
      </View>

      {/* BF% multi-curve chart */}
      <Card variant="flat" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <Heading level={4} mono subtitle="Formules scientifiques indépendantes">
          % MASSE GRASSE — ÉVOLUTION
        </Heading>

        {!hasAny ? (
          <View style={[s.emptyChart, { borderColor: 'rgba(255,255,255,0.08)' }]}>
            <Text style={[s.labelXs, { color: theme.mute }]}>
              SAISIR LES PLIS CUTANÉS POUR AFFICHER LES COURBES
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 20 }}>
            <MultiLineChart series13={series13} seriesJP7={seriesJP7} seriesDW4={seriesDW4} />
          </View>
        )}

        {/* Legend */}
        <View style={s.legendContainer}>
          {[
            {
              color: theme.selected,
              title: '13 PLIS',
              subtitle: `Haute densité · ${has13 ? `${series13.filter(p => p.v !== null).length} pts` : '—'}`,
              strokeDash: false,
            },
            {
              color: theme.title,
              title: 'JP7',
              subtitle: `Athlétique · 7 sites · ${hasJP7 ? `${seriesJP7.filter(p => p.v !== null).length} pts` : '—'}`,
              strokeDash: true,
            },
            {
              color: theme.mute,
              title: 'DW4',
              subtitle: `Population générale · 4 sites · ${hasDW4 ? `${seriesDW4.filter(p => p.v !== null).length} pts` : '—'}`,
              strokeDash: true,
            },
          ].map(l => (
            <View key={l.title} style={s.legendItem}>
              <Svg width={24} height={10}>
                <SvgLine_ x1={0} y1={5} x2={24} y2={5} stroke={l.color}
                  strokeWidth={l.title === '13 PLIS' ? 2 : 1.5}
                  strokeDasharray={l.strokeDash ? (l.title === 'JP7' ? '6 3' : '4 3') : undefined}
                  opacity={l.title === '13 PLIS' ? 1 : 0.8}
                />
                <SvgCircle_ cx={12} cy={5} r={3} fill={l.color}
                  opacity={l.title === '13 PLIS' ? 1 : 0.8}
                />
              </Svg>
              <View>
                <Text style={[s.legendTitle, { color: l.color }]}>{l.title}</Text>
                <Text style={[s.legendSub, { color: theme.mute }]}>{l.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Latest values row */}
      {latest && (
        <View style={s.statsRow}>
          {latest.bf13 !== null && (
            <Card variant="flat" style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <Text style={[s.statLabel, { color: theme.selected }]}>13 PLIS</Text>
              <Text style={[s.statNum, { color: theme.selected }]}>
                {latest.bf13}<Text style={[s.unitSm, { color: theme.mute }]}>%</Text>
              </Text>
              <Text style={[s.statDate, { color: theme.mute }]}>{latest.date.slice(5).replace('-', '/')}</Text>
            </Card>
          )}
          {latest.bfJP7 !== null && (
            <Card variant="flat" style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <Text style={[s.statLabel, { color: theme.title }]}>JP7</Text>
              <Text style={[s.statNum, { color: theme.title }]}>
                {latest.bfJP7}<Text style={[s.unitSm, { color: theme.mute }]}>%</Text>
              </Text>
              <Text style={[s.statDate, { color: theme.mute }]}>{latest.date.slice(5).replace('-', '/')}</Text>
            </Card>
          )}
          {latest.bfDW4 !== null && (
            <Card variant="flat" style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <Text style={[s.statLabel, { color: theme.mute }]}>DW4</Text>
              <Text style={[s.statNum, { color: theme.mute }]}>
                {latest.bfDW4}<Text style={s.unitSm}>%</Text>
              </Text>
              <Text style={[s.statDate, { color: theme.mute }]}>{latest.date.slice(5).replace('-', '/')}</Text>
            </Card>
          )}
        </View>
      )}

      {/* Inter-method spread */}
      {latest && [latest.bf13, latest.bfJP7, latest.bfDW4].filter((v): v is number => v !== null).length >= 2 && (() => {
        const vals = [latest.bf13, latest.bfJP7, latest.bfDW4].filter((v): v is number => v !== null);
        const ecart = parseFloat((Math.max(...vals) - Math.min(...vals)).toFixed(1));
        return (
          <Card variant="flat" style={{ backgroundColor: ecart > 3 ? 'rgba(255,165,0,0.05)' : 'rgba(255,255,255,0.02)' }}>
            <View style={s.ecartRow}>
              <View>
                <Text style={[s.statLabel, { color: theme.mute, marginBottom: 4 }]}>ÉCART MAX INTER-MÉTHODES</Text>
                <Text style={[s.ecartHint, { color: theme.mute }]}>
                  {ecart <= 3 ? 'Cohérence mesure confirmée' : 'Vérifier la technique de saisie'}
                </Text>
              </View>
              <Text style={[s.ecartNum, { color: ecart > 3 ? theme.statusWarn : theme.statusOk }]}>
                {ecart}%
              </Text>
            </View>
          </Card>
        );
      })()}

      {/* Measurement list */}
      {history.length > 0 && (
        <View style={{ gap: 12 }}>
          <Text style={[s.historyHeader, { color: theme.mute }]}>HISTORIQUE · {scanRange}J</Text>
          {history.slice(0, 10).map((m, i) => {
            const w = weightStore.entries.filter(e => e.date <= m.date).sort((a, b) => b.date.localeCompare(a.date))[0];
            const sk = m.skinfolds ?? {};
            const { age, sex } = profile;
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
              <Card key={i} variant="flat" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <View style={s.historyRowHeader}>
                  <Text style={[s.historyDate, { color: theme.selected }]}>
                    {m.date.slice(5).replace('-', '/')}
                  </Text>
                  {w && <Text style={[s.historyWeight, { color: theme.mute }]}>{w.weightKg} KG</Text>}
                </View>
                <View style={s.historyValues}>
                  {bf13 !== null && (
                    <View>
                      <Text style={[s.statLabel, { color: theme.selected }]}>13P</Text>
                      <Text style={[s.historyVal, { color: theme.selected }]}>{bf13}%</Text>
                    </View>
                  )}
                  {bfJP7 !== null && (
                    <View>
                      <Text style={[s.statLabel, { color: theme.title }]}>JP7</Text>
                      <Text style={[s.historyVal, { color: theme.title }]}>{bfJP7}%</Text>
                    </View>
                  )}
                  {bfDW4 !== null && (
                    <View>
                      <Text style={[s.statLabel, { color: theme.mute }]}>DW4</Text>
                      <Text style={[s.historyVal, { color: theme.mute }]}>{bfDW4}%</Text>
                    </View>
                  )}
                  {bf13 === null && bfJP7 === null && bfDW4 === null && m.body_fat_pct > 0 && (
                    <View>
                      <Text style={[s.statLabel, { color: theme.mute }]}>MG</Text>
                      <Text style={[s.historyVal, { color: theme.mute }]}>{m.body_fat_pct}%</Text>
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  rangeRow: { flexDirection: 'row', gap: 12 },
  rangeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1 },
  rangeLabelMain: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, letterSpacing: Ls.sm_02 },
  rangeLabelSub: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02, marginTop: 2 },
  emptyChart: { height: 100, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1 },
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: Clr.white5 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendTitle: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  legendSub: { fontFamily: FontMono, fontSize: Fs.sm },
  statsRow: { flexDirection: 'row', gap: 12 },
  statLabel: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02, marginBottom: 4 },
  statNum: { fontFamily: FontMono, fontSize: 22, fontWeight: Fw.display },
  statDate: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02, marginTop: 4 },
  unitSm: { fontFamily: FontMono, fontSize: Fs.xs, opacity: 0.5 },
  ecartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ecartHint: { fontFamily: FontMono, fontSize: Fs.sm, lineHeight: 20 },
  ecartNum: { fontFamily: FontMono, fontSize: 22, fontWeight: Fw.display },
  historyHeader: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.body_033 },
  historyRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  historyDate: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, letterSpacing: Ls.sm_02 },
  historyWeight: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display },
  historyValues: { flexDirection: 'row', gap: 16 },
  historyVal: { fontFamily: FontMono, fontSize: 16, fontWeight: Fw.display },
  labelXs: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
});
