import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import Svg, { Rect, Line, Path } from 'react-native-svg';
import { BarChart2 } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { WidgetInfo } from '../../components/ui/WidgetInfo';
import type { WorkoutSessionLatest } from '../../data/schemas/sport/routine';
import { MealService } from '../../services/mealService';
import { ds } from '../../utils/storage';
import { EmptyState, GuardCard, LoadingState } from './shared';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';

const SvgRect_ = Rect as any;
const SvgLine_ = Line as any;
const SvgPath_ = Path as any;

interface DayData {
  dateStr: string;
  label: string;
  tonnage: number;
  kcal: number;
  p: number;
  c: number;
  f: number;
}

interface SynoptiqueTabProps { sessions: WorkoutSessionLatest[] }

function computeTonnage(sessions: WorkoutSessionLatest[], dateStr: string): number {
  let t = 0;
  for (const s of sessions) {
    if (s.date !== dateStr) continue;
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (set.kind === 'working' && set.weightKg && set.reps) t += set.weightKg * set.reps;
      }
    }
  }
  return Math.round(t);
}

export function SynoptiqueTab({ sessions }: SynoptiqueTabProps) {
  const theme = useTheme();
  const [dayData, setDayData] = useState<DayData[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      return d;
    });
    Promise.all(dates.map(async d => {
      const str = ds(d);
      const tot = await MealService.getDailyTotals(str);
      const tonnage = computeTonnage(sessions, str);
      return { dateStr: str, label: str.slice(5), tonnage, kcal: tot.kcal, p: tot.p, c: tot.c, f: tot.f };
    })).then(rows => { if (active) { setDayData(rows); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sessions]);

  if (loading) return <LoadingState label="Calcul synoptique..." />;

  const hasAnyData = dayData?.some(d => d.tonnage > 0 || d.kcal > 0);
  if (!hasAnyData) return <EmptyState Icon={BarChart2} label="Aucune donnée sur 30 jours" />;

  return (
    <View style={{ gap: 32 }}>
      {dayData && <SynoptiqueChart data={dayData} />}
      <Card variant="flat">
        <Heading level={4} mono subtitle="Modulation chimique">SUPPLÉMENTS</Heading>
        <GuardCard message="Suivi des suppléments disponible dans AWAN v5" />
      </Card>
    </View>
  );
}

function SynoptiqueChart({ data }: { data: DayData[] }) {
  const theme = useTheme();
  const W = Dimensions.get('window').width - 48;
  const H = 220;
  const pad = { t: 12, b: 20, l: 8, r: 8 };
  const chartH = H - pad.t - pad.b;
  const colW = (W - pad.l - pad.r) / data.length;
  const barW = Math.max(2, colW * 0.7);

  const maxTonnage = Math.max(...data.map(d => d.tonnage), 1);
  const maxKcal = Math.max(...data.map(d => d.kcal), 1);
  const maxRendement = Math.max(
    ...data.filter(d => d.kcal > 0).map(d => d.tonnage / d.kcal), 1,
  );

  const toXCenter = (i: number) => pad.l + i * colW + colW / 2;
  const toYLeft = (v: number) => pad.t + chartH - (v / maxTonnage) * chartH;
  const toYRight = (v: number) => pad.t + chartH - (v / maxKcal) * chartH;

  const rendementPoints = data
    .map((d, i) => d.kcal > 0 ? `${toXCenter(i)},${pad.t + chartH - ((d.tonnage / d.kcal) / maxRendement) * chartH}` : null)
    .filter(Boolean) as string[];

  return (
    <View style={{ gap: 0 }}>
      <WidgetInfo
        id="Wn4"
        title="DASHBOARD SYNOPTIQUE"
        content="Grid system journalier : axe supérieur = tonnage (barres) + macros empilées + courbe rendement (tonnage/calories). Axe inférieur inversé = suppléments par molécule (position index fixe, épaisseur = dosage mg/g). Pattern matching visuel : corrélation booster → performance."
      />
    <Card variant="flat">
      <Heading level={4} mono subtitle="Tonnage × Macros · 30 jours">SYNOPTIQUE</Heading>
      <View style={{ marginTop: 16 }}>
        <View>
          <Svg width={W} height={H}>
            {data.map((d, i) => {
              const xCenter = toXCenter(i);
              const xBar = xCenter - barW / 2;
              const tH = (d.tonnage / maxTonnage) * chartH;
              const pKcal = d.p * 4; const cKcal = d.c * 4; const fKcal = d.f * 9;
              const macroW = barW * 0.5;
              const xMacro = xCenter - macroW / 2;
              const pH = (pKcal / maxKcal) * chartH;
              const cH = (cKcal / maxKcal) * chartH;
              const fH = (fKcal / maxKcal) * chartH;
              const baseY = pad.t + chartH;
              return (
                <React.Fragment key={i}>
                  {d.tonnage > 0 && (
                    <SvgRect_ x={xBar} y={toYLeft(d.tonnage)} width={barW} height={tH} fill={theme.selected} opacity={0.3} rx={1} />
                  )}
                  {pH > 0 && <SvgRect_ x={xMacro} y={baseY - pH} width={macroW} height={pH} fill={theme.statusOk} opacity={0.9} />}
                  {cH > 0 && <SvgRect_ x={xMacro} y={baseY - pH - cH} width={macroW} height={cH} fill={theme.statusInfo} opacity={0.9} />}
                  {fH > 0 && <SvgRect_ x={xMacro} y={baseY - pH - cH - fH} width={macroW} height={fH} fill={theme.statusWarn} opacity={0.9} />}
                  <SvgLine_ x1={pad.l + i * colW} y1={pad.t} x2={pad.l + i * colW} y2={pad.t + chartH} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                </React.Fragment>
              );
            })}
            {rendementPoints.length > 1 && (
              <SvgPath_ d={`M ${rendementPoints.join(' L ')}`} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
            )}
          </Svg>
        </View>
        <View style={s.legend}>
          {[
            { color: theme.selected, label: 'Tonnage', opacity: 0.3 },
            { color: theme.statusOk, label: 'Protéines', opacity: 1 },
            { color: theme.statusInfo, label: 'Glucides', opacity: 1 },
            { color: theme.statusWarn, label: 'Lipides', opacity: 1 },
            { color: 'rgba(255,255,255,0.5)', label: 'Rendement', opacity: 1 },
          ].map(l => (
            <View key={l.label} style={s.legendItem}>
              <View style={[s.legendSwatch, { backgroundColor: l.color, opacity: l.opacity }]} />
              <Text style={[s.labelXs, { color: theme.mute }]}>{l.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
    </View>
  );
}

const s = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 8, height: 8, borderRadius: 2 },
  labelXs: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase' },
});
