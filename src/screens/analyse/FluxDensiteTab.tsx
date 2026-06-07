import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { TrendingUp } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import type { WorkoutSessionLatest } from '../../data/schemas/sport/routine';
import { computeEAT, buildFluxData, computeFluxDensity, type WeekMacros } from '../../services/analyticsService';
import { StackedBarChart, GuardCard, LoadingState, loadNutritionProfile, deriveTDEE } from './shared';
import { useTheme, type AwanTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';

const SvgPath_ = Path as any;

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

  const currentWeek = fluxData?.[fluxData.length - 1];
  const currentEAT = currentWeek ? (eatByWeek.get(currentWeek.weekStart) ?? 0) : 0;
  const lineA = tdeeWeekly ?? null;
  const lineB = tdeeWeekly != null ? tdeeWeekly + currentEAT : null;

  const phase = useMemo(() => {
    if (!currentWeek || lineB == null) return null;
    return computeFluxDensity(currentWeek.totalKcal, lineB);
  }, [currentWeek, lineB]);

  if (loading) return <LoadingState label="Calcul flux de densité..." />;

  if (!profile) {
    return (
      <Card variant="flat">
        <Heading level={4} mono subtitle="Bilan thermodynamique hebdomadaire">FLUX DE DENSITÉ</Heading>
        <GuardCard message="Profil nutritionnel manquant → Nutrition → Objectifs" />
      </Card>
    );
  }

  const noData = !fluxData || fluxData.every(w => w.totalKcal === 0);
  if (noData) {
    return (
      <Card variant="flat">
        <Heading level={4} mono subtitle="Bilan thermodynamique hebdomadaire">FLUX DE DENSITÉ</Heading>
        <GuardCard message="Aucune donnée nutritionnelle — commencez à saisir vos repas" />
      </Card>
    );
  }

  const phaseInfo = phase ? PHASE_LABELS[phase] : null;

  return (
    <View style={{ gap: 32 }}>
      <Card variant="flat">
        <Heading level={4} mono subtitle="P×4 + G×4 + L×9 kcal · 8 semaines">FLUX DE DENSITÉ</Heading>

        <View style={{ marginTop: 24 }}>
          <StackedBarChart data={fluxData ?? []} lineA={lineA} lineB={lineB} height={220} />
        </View>

        <View style={s.xLabels}>
          {(fluxData ?? []).map(w => (
            <Text key={w.weekStart} style={[s.xLabel, { color: theme.mute }]}>{w.label}</Text>
          ))}
        </View>

        <View style={s.legend}>
          {[
            { color: theme.statusOk, label: 'Protéines' },
            { color: theme.statusInfo, label: 'Glucides' },
            { color: theme.statusWarn, label: 'Lipides' },
          ].map(l => (
            <View key={l.label} style={s.legendItem}>
              <View style={[s.legendSwatch, { backgroundColor: l.color, borderRadius: 2 }]} />
              <Text style={[s.labelXs, { color: theme.mute }]}>{l.label}</Text>
            </View>
          ))}
          <View style={s.legendItem}>
            <View style={[s.legendLine, { backgroundColor: theme.mute }]} />
            <Text style={[s.labelXs, { color: theme.mute }]}>BMR+NEAT</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendLine, { backgroundColor: theme.selected }]} />
            <Text style={[s.labelXs, { color: theme.mute }]}>+EAT</Text>
          </View>
        </View>
      </Card>

      {phase && phaseInfo && (
        <Card variant="flat" style={{ borderColor: `${phaseInfo.color}40` }}>
          <Text style={[s.phaseLabel, { color: phaseInfo.color, marginBottom: 8 }]}>PHASE COURANTE</Text>
          <Text style={[s.bodyText, { color: theme.title }]}>{phaseInfo.label}</Text>
          {lineB != null && currentWeek && (
            <View style={[s.row, { gap: 24, marginTop: 16 }]}>
              <View>
                <Text style={[s.labelXs, { color: theme.mute }]}>Ingestion</Text>
                <Text style={[s.numText, { color: theme.title }]}>
                  {currentWeek.totalKcal.toLocaleString()}<Text style={s.unitSm}> kcal</Text>
                </Text>
              </View>
              <View>
                <Text style={[s.labelXs, { color: theme.mute }]}>Dépense totale</Text>
                <Text style={[s.numText, { color: theme.title }]}>
                  {Math.round(lineB).toLocaleString()}<Text style={s.unitSm}> kcal</Text>
                </Text>
              </View>
              <View>
                <Text style={[s.labelXs, { color: theme.mute }]}>Bilan</Text>
                <Text style={[s.numText, { color: phaseInfo.color }]}>
                  {currentWeek.totalKcal - Math.round(lineB) > 0 ? '+' : ''}{(currentWeek.totalKcal - Math.round(lineB)).toLocaleString()}
                </Text>
              </View>
            </View>
          )}
          {weightKg === null && (
            <Text style={[s.labelXs, { color: theme.mute, marginTop: 8 }]}>· EAT non calculé — poids manquant</Text>
          )}
        </Card>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline' },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: 4 },
  xLabel: { fontFamily: FontMono, fontSize: Fs.xs },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12 },
  legendLine: { width: 24, height: 1 },
  phaseLabel: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  bodyText: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display },
  numText: { fontFamily: FontMono, fontSize: 20, fontWeight: Fw.display, letterSpacing: Ls.tight },
  unitSm: { fontFamily: FontMono, fontSize: Fs.sm, opacity: 0.5 },
  labelXs: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
});
