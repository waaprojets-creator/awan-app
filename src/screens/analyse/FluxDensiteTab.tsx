import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import type { WorkoutSessionLatest } from '../../data/schemas/sport/routine';
import { computeEAT, buildFluxData, computeFluxDensity, type WeekMacros } from '../../services/analyticsService';
import { StackedBarChart, GuardCard, LoadingState, loadNutritionProfile, deriveTDEE } from './shared';
import { useTheme, type AwanTheme } from '../../hooks/useTheme';

interface FluxDensiteTabProps {
  sessions: WorkoutSessionLatest[];
  weightKg: number | null;
}

function getPhaseLabels(t: Pick<AwanTheme, 'statusWarn' | 'statusOk' | 'statusInfo'>): Record<string, { label: string; color: string }> {
  return {
    surplus: { label: 'Surplus — phase de construction active', color: t.statusWarn },
    maintenance: { label: 'Maintenance — équilibre thermodynamique', color: t.statusOk },
    deficit: { label: 'Déficit — phase de sèche', color: t.statusInfo },
  };
}

export function FluxDensiteTab({ sessions, weightKg }: FluxDensiteTabProps) {
  const theme = useTheme();
  const PHASE_LABELS = getPhaseLabels(theme);
  const [fluxData, setFluxData] = useState<WeekMacros[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    buildFluxData(8)
      .then(d => { if (active) { setFluxData(d); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const profile = useMemo(() => loadNutritionProfile(), []);

  const tdeeWeekly = useMemo(() => {
    if (!profile) return null;
    return deriveTDEE(profile) * 7;
  }, [profile]);

  // EAT hebdo par semaine
  const eatByWeek = useMemo((): Map<string, number> => {
    const map = new Map<string, number>();
    if (!weightKg || !fluxData) return map;
    for (const week of fluxData) {
      const weekEnd = new Date(week.weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const endStr = weekEnd.toISOString().slice(0, 10);
      const weekSessions = sessions.filter(s => s.date >= week.weekStart && s.date <= endStr);
      const eat = weekSessions.reduce((acc, s) => acc + computeEAT(s, weightKg), 0);
      map.set(week.weekStart, eat);
    }
    return map;
  }, [sessions, weightKg, fluxData]);

  // Expenditure lines (constant across weeks = same profile, variable EAT)
  const currentWeek = fluxData?.[fluxData.length - 1];
  const currentEAT = currentWeek ? (eatByWeek.get(currentWeek.weekStart) ?? 0) : 0;
  const lineA = tdeeWeekly ?? null;                          // BMR+NEAT × 7
  const lineB = tdeeWeekly != null ? tdeeWeekly + currentEAT : null; // + EAT semaine courante

  const phase = useMemo(() => {
    if (!currentWeek || lineB == null) return null;
    return computeFluxDensity(currentWeek.totalKcal, lineB);
  }, [currentWeek, lineB]);

  if (loading) return <LoadingState label="Calcul flux de densité..." />;

  if (!profile) {
    return (
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Bilan thermodynamique hebdomadaire">FLUX DE DENSITÉ</Heading>
        <GuardCard message="Profil nutritionnel manquant → Nutrition → Objectifs" />
      </Card>
    );
  }

  const noData = !fluxData || fluxData.every(w => w.totalKcal === 0);
  if (noData) {
    return (
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Bilan thermodynamique hebdomadaire">FLUX DE DENSITÉ</Heading>
        <GuardCard message="Aucune donnée nutritionnelle — commencez à saisir vos repas" />
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="P×4 + G×4 + L×9 kcal · 8 semaines">FLUX DE DENSITÉ</Heading>

        <div className="mt-6">
          <StackedBarChart
            data={fluxData ?? []}
            lineA={lineA}
            lineB={lineB}
            height={220}
          />
        </div>

        {/* Axe X labels */}
        <div className="flex flex-row justify-between px-2 mt-1">
          {(fluxData ?? []).map(w => (
            <span key={w.weekStart} className="text-awan-xs font-mono text-awan-tx-mute">{w.label}</span>
          ))}
        </div>

        {/* Légende */}
        <div className="flex flex-row gap-4 mt-4 flex-wrap">
          {[
            { color: theme.statusOk, label: 'Protéines' },
            { color: theme.statusInfo, label: 'Glucides' },
            { color: theme.statusWarn, label: 'Lipides' },
          ].map(l => (
            <div key={l.label} className="flex flex-row items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
              <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest">{l.label}</span>
            </div>
          ))}
          <div className="flex flex-row items-center gap-1.5">
            <div className="w-6 h-0 border-t border-dashed" style={{ borderColor: theme.mute }} />
            <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest">BMR+NEAT</span>
          </div>
          <div className="flex flex-row items-center gap-1.5">
            <div className="w-6 h-0 border-t" style={{ borderColor: theme.selected }} />
            <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest">+EAT</span>
          </div>
        </div>
      </Card>

      {/* Phase courante */}
      {phase && (
        <Card className="p-5" variant="flat" style={{ borderColor: PHASE_LABELS[phase]!.color + '40' }}>
          <span className="awan-label mb-2 block" style={{ color: PHASE_LABELS[phase]!.color }}>
            PHASE COURANTE
          </span>
          <span className="text-awan-md font-black text-awan-tx">{PHASE_LABELS[phase]!.label}</span>
          {lineB != null && currentWeek && (
            <div className="flex flex-row gap-6 mt-4">
              <div>
                <span className="text-awan-xs text-awan-tx-mute uppercase tracking-widest block">Ingestion</span>
                <span className="text-xl font-black font-mono text-awan-tx">{currentWeek.totalKcal.toLocaleString()}<span className="text-sm ml-1 opacity-50">kcal</span></span>
              </div>
              <div>
                <span className="text-awan-xs text-awan-tx-mute uppercase tracking-widest block">Dépense totale</span>
                <span className="text-xl font-black font-mono text-awan-tx">{Math.round(lineB).toLocaleString()}<span className="text-sm ml-1 opacity-50">kcal</span></span>
              </div>
              <div>
                <span className="text-awan-xs text-awan-tx-mute uppercase tracking-widest block">Bilan</span>
                <span className="text-xl font-black font-mono" style={{ color: PHASE_LABELS[phase]!.color }}>
                  {currentWeek.totalKcal - Math.round(lineB) > 0 ? '+' : ''}{(currentWeek.totalKcal - Math.round(lineB)).toLocaleString()}
                </span>
              </div>
            </div>
          )}
          {weightKg === null && (
            <span className="text-awan-xs text-awan-tx-mute mt-2 block">· EAT non calculé — poids manquant</span>
          )}
        </Card>
      )}
    </div>
  );
}
