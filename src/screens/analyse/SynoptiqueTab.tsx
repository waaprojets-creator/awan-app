import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { View, Dimensions } from 'react-native';
import Svg, { Rect, Line, Path, Circle } from 'react-native-svg';
import { BarChart2 } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import type { WorkoutSessionLatest } from '../../data/schemas/sport/routine';
import { MealService } from '../../services/mealService';
import { ds } from '../../utils/storage';
import { EmptyState, GuardCard } from './shared';

const SvgRect_ = Rect as any;
const SvgLine_ = Line as any;
const SvgPath_ = Path as any;
const SvgCircle_ = Circle as any;

interface DayData {
  dateStr: string;
  label: string;
  tonnage: number;
  kcal: number;
  p: number;
  c: number;
  f: number;
}

interface SynoptiqueTabProps {
  sessions: WorkoutSessionLatest[];
}

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
      return {
        dateStr: str,
        label: str.slice(5),
        tonnage,
        kcal: tot.kcal,
        p: tot.p,
        c: tot.c,
        f: tot.f,
      };
    })).then(rows => { if (active) { setDayData(rows); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sessions]);

  if (loading) {
    return (
      <div className="flex flex-col items-center py-20 opacity-30">
        <div className="w-8 h-8 rounded-full border-2 border-awan-gold border-t-transparent animate-spin mb-4" />
        <span className="text-awan-md font-black uppercase tracking-widest text-awan-tx-mute">Calcul synoptique...</span>
      </div>
    );
  }

  const hasAnyData = dayData?.some(d => d.tonnage > 0 || d.kcal > 0);
  if (!hasAnyData) return <EmptyState Icon={BarChart2} label="Aucune donnée sur 30 jours" />;

  return (
    <div className="space-y-8">
      {/* Graphique supérieur */}
      {dayData && <SynoptiqueChart data={dayData} />}

      {/* Graphique inférieur — Suppléments (guard propre) */}
      <Card className="p-5 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Modulation chimique">SUPPLÉMENTS</Heading>
        <GuardCard message="Suivi des suppléments disponible dans AWAN v5" />
      </Card>
    </div>
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

  // Rendement = tonnage / kcal (normalized)
  const maxRendement = Math.max(
    ...data.filter(d => d.kcal > 0).map(d => d.tonnage / d.kcal),
    1,
  );

  const toXCenter = (i: number) => pad.l + i * colW + colW / 2;
  const toYLeft = (v: number) => pad.t + chartH - (v / maxTonnage) * chartH;
  const toYRight = (v: number) => pad.t + chartH - (v / maxKcal) * chartH;

  const rendementPoints = data
    .map((d, i) => d.kcal > 0 ? `${toXCenter(i)},${pad.t + chartH - ((d.tonnage / d.kcal) / maxRendement) * chartH}` : null)
    .filter(Boolean) as string[];

  return (
    <Card className="p-4 bg-white/5 border-white/5" variant="flat">
      <Heading level={4} mono subtitle="Tonnage × Macros · 30 jours">SYNOPTIQUE</Heading>
      <div className="mt-4">
        <View>
          <Svg width={W} height={H}>
            {data.map((d, i) => {
              const xCenter = toXCenter(i);
              const xBar = xCenter - barW / 2;

              // Tonnage bar (left axis, gold)
              const tH = (d.tonnage / maxTonnage) * chartH;

              // Stacked macros (right axis, smaller)
              const pKcal = d.p * 4; const cKcal = d.c * 4; const fKcal = d.f * 9;
              const totalKcal = pKcal + cKcal + fKcal;
              const macroW = barW * 0.5;
              const xMacro = xCenter - macroW / 2;
              const pH = (pKcal / maxKcal) * chartH;
              const cH = (cKcal / maxKcal) * chartH;
              const fH = (fKcal / maxKcal) * chartH;
              const baseY = pad.t + chartH;

              return (
                <React.Fragment key={i}>
                  {/* Tonnage — fond transparent */}
                  {d.tonnage > 0 && (
                    <SvgRect_
                      x={xBar} y={toYLeft(d.tonnage)}
                      width={barW} height={tH}
                      fill={theme.selected} opacity={0.3} rx={1}
                    />
                  )}
                  {/* Macros empilées */}
                  {pH > 0 && <SvgRect_ x={xMacro} y={baseY - pH} width={macroW} height={pH} fill={theme.statusOk} opacity={0.9} />}
                  {cH > 0 && <SvgRect_ x={xMacro} y={baseY - pH - cH} width={macroW} height={cH} fill={theme.statusInfo} opacity={0.9} />}
                  {fH > 0 && <SvgRect_ x={xMacro} y={baseY - pH - cH - fH} width={macroW} height={fH} fill={theme.statusWarn} opacity={0.9} />}
                  {/* Separateur jour */}
                  <SvgLine_
                    x1={pad.l + i * colW} y1={pad.t}
                    x2={pad.l + i * colW} y2={pad.t + chartH}
                    stroke="rgba(255,255,255,0.03)" strokeWidth="1"
                  />
                </React.Fragment>
              );
            })}

            {/* Courbe de rendement */}
            {rendementPoints.length > 1 && (
              <SvgPath_
                d={`M ${rendementPoints.join(' L ')}`}
                fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1"
              />
            )}
          </Svg>
        </View>

        {/* Légende */}
        <div className="flex flex-row gap-3 mt-3 flex-wrap">
          {[
            { color: theme.selected, label: 'Tonnage', opacity: '0.3' },
            { color: theme.statusOk, label: 'Protéines' },
            { color: theme.statusInfo, label: 'Glucides' },
            { color: theme.statusWarn, label: 'Lipides' },
            { color: 'rgba(255,255,255,0.5)', label: 'Rendement' },
          ].map(l => (
            <div key={l.label} className="flex flex-row items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: l.color, opacity: l.opacity ?? '1' }} />
              <span className="text-awan-xs font-black text-awan-tx-mute uppercase">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
