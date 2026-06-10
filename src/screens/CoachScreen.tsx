import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme, type AwanTheme } from '../hooks/useTheme';
import { AlertOctagon, AlertTriangle, CalendarClock, CheckCircle2, Info, Zap, type LucideIcon } from 'lucide-react-native';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';
import { useCoach } from '../hooks/useCoach';
import { ds } from '../utils/storage';
import { getAdviceText } from '../constants/coachAdvice';
import type { AssessmentLatest, Advice, RuleResult } from '../data/schemas/coach/assessment';
import type { ForecastLatest } from '../data/schemas/coach/forecast';
import type { Domain, Severity } from '../data/schemas/coach/rule';
import type { NavProps } from '../types/nav';
import { FontSans, FontMono } from '../constants/typography';
import { Fs, Fw, T } from '../theme/tokens';

type TabKey = 'sport' | 'nutrition' | 'anthropo' | 'cross';

interface TabDef { key: TabKey; label: string; domain: Domain; }

const TABS: TabDef[] = [
  { key: 'sport',     label: 'SPORT',     domain: 'sport' },
  { key: 'nutrition', label: 'NUTRITION', domain: 'nutrition' },
  { key: 'anthropo',  label: 'CORPS',     domain: 'anthropo' },
  { key: 'cross',     label: 'CROSS',     domain: 'cross' },
];

interface SeverityStyle {
  Icon: LucideIcon;
  color: string;
}

function getSeverityStyles(t: Pick<AwanTheme, 'selected'>): Record<Severity, SeverityStyle> {
  return {
    info:  { Icon: Info,          color: t.selected },
    good:  { Icon: CheckCircle2,  color: '#22C55E' },
    warn:  { Icon: AlertTriangle, color: '#FBBF24' },
    alert: { Icon: AlertOctagon,  color: '#EF4444' },
  };
}

function AdviceCard({ advice, ruleResult }: { advice: Advice; ruleResult: RuleResult | undefined }) {
  const theme = useTheme();
  const sev = getSeverityStyles(theme)[advice.severity];
  const { Icon } = sev;
  const text = getAdviceText(advice.key);
  return (
    <View style={[s.card, { borderColor: `${sev.color}33`, backgroundColor: `${sev.color}0D` }]}>
      <View style={{ paddingTop: 2 }}><Icon size={20} color={sev.color} /></View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[T.label, { color: sev.color }]}>{advice.severity.toUpperCase()}</Text>
        <Text style={{ fontFamily: FontSans, fontSize: Fs.body, fontWeight: Fw.value, color: theme.title, lineHeight: Math.round(Fs.body * 1.35) }}>{text.title}</Text>
        <Text style={{ fontFamily: FontSans, fontSize: Fs.sm, fontWeight: Fw.body, color: theme.text, lineHeight: Math.round(Fs.sm * 1.6) }}>{text.advice}</Text>
        {ruleResult !== undefined && Number.isFinite(ruleResult.signalValue) && ruleResult.signalValue !== 0 && (
          <Text style={[s.mono, { color: theme.mute, marginTop: 4 }]}>
            {'VALEUR MESURÉE · '}{Number.isInteger(ruleResult.signalValue) ? ruleResult.signalValue : ruleResult.signalValue.toFixed(2)}
          </Text>
        )}
      </View>
    </View>
  );
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = params[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}

function horizonLabel(days: number): string {
  if (days <= 0) return 'AUJOURD\'HUI';
  if (days === 1) return 'DEMAIN';
  if (days < 7) return `J+${days}`;
  if (days < 30) return `S+${Math.round(days / 7)}`;
  return `M+${Math.round(days / 30)}`;
}

function ForecastCard({ forecast }: { forecast: ForecastLatest }) {
  const theme = useTheme();
  const sev = getSeverityStyles(theme)[forecast.severity];
  const text = getAdviceText(forecast.detailKey);
  const titleText = getAdviceText(forecast.titleKey);
  const interpolated = interpolate(text.advice, { ...forecast.params, targetDate: forecast.targetDate });
  return (
    <View style={[s.card, { borderColor: `${sev.color}33`, backgroundColor: `${sev.color}0D` }]}>
      <View style={{ paddingTop: 2 }}><CalendarClock size={20} color={sev.color} /></View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[T.label, { color: sev.color }]}>{horizonLabel(forecast.horizonDays)}</Text>
          <Text style={[T.label, { color: theme.mute }]}>·</Text>
          <Text style={[s.mono, { color: theme.mute }]}>{forecast.targetDate}</Text>
        </View>
        <Text style={{ fontFamily: FontSans, fontSize: Fs.body, fontWeight: Fw.value, color: theme.title, lineHeight: Math.round(Fs.body * 1.35) }}>{titleText.title}</Text>
        <Text style={{ fontFamily: FontSans, fontSize: Fs.sm, fontWeight: Fw.body, color: theme.text, lineHeight: Math.round(Fs.sm * 1.6) }}>{interpolated}</Text>
        <Text style={[s.mono, { color: theme.mute, marginTop: 4 }]}>{'CONFIANCE · '}{Math.round(forecast.confidence * 100)}%</Text>
      </View>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View style={[s.emptyState, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}>
      <Info size={24} color={theme.mute} />
      <Text style={[T.label, { color: theme.mute, textAlign: 'center' }]}>{message}</Text>
    </View>
  );
}

export default function CoachScreen(_props: NavProps): React.ReactElement {
  const theme = useTheme();
  const today = ds(new Date());
  const { assessments, loading, runAll } = useCoach(today);
  const [activeTab, setActiveTab] = useState<TabKey>('sport');

  const filtered: AssessmentLatest[] = useMemo(
    () => assessments.filter((a) => a.domain === activeTab),
    [assessments, activeTab],
  );

  const hasAny = assessments.length > 0;

  return (
    <ScrollView
      style={{ flex: 1, width: '100%', backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader tag="SYSTÈME · COACH" title="CONSEILLER IA" />

      <Touch onPress={() => void runAll(today)} disabled={loading} style={{ marginBottom: 24 }}>
        <View style={[s.analyzeBtn, { borderColor: `${theme.selected}4D`, backgroundColor: `${theme.selected}0D`, opacity: loading ? 0.5 : 1 }]}>
          <Zap size={16} color={theme.selected} />
          <Text style={[s.mono, { color: theme.selected }]}>{loading ? 'ANALYSE EN COURS…' : 'ANALYSER'}</Text>
        </View>
      </Touch>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {TABS.map(tab => {
          const active = tab.key === activeTab;
          return (
            <Touch key={tab.key} onPress={() => setActiveTab(tab.key)} style={{ flex: 1 }}>
              <View style={[s.tab, { borderColor: active ? `${theme.selected}66` : theme.borderSoft, backgroundColor: active ? `${theme.selected}1A` : theme.surfaceDim }]}>
                <Text style={[T.label, { color: active ? theme.selected : theme.mute }]}>{tab.label}</Text>
              </View>
            </Touch>
          );
        })}
      </View>

      {hasAny && filtered.length > 0 && (() => {
        const allForecasts = filtered.flatMap(a => a.forecasts ?? []);
        if (allForecasts.length === 0) return null;
        const sorted = allForecasts.slice().sort((a, b) => a.horizonDays - b.horizonDays);
        return (
          <View style={{ marginBottom: 24 }}>
            <Text style={[T.label, { color: theme.mute, marginBottom: 12 }]}>À VENIR — PROJECTIONS COACH</Text>
            <View style={{ gap: 12 }}>
              {sorted.map(f => <ForecastCard key={f.id} forecast={f} />)}
            </View>
          </View>
        );
      })()}

      <View style={{ gap: 12 }}>
        {hasAny && filtered.length > 0 && (() => {
          const anyAdvice = filtered.some(a => a.advices.length > 0);
          return anyAdvice ? (
            <Text style={[T.label, { color: theme.mute, marginBottom: 4 }]}>{"AUJOURD'HUI"}</Text>
          ) : null;
        })()}
        {!hasAny ? (
          <EmptyState message="Aucune analyse — Appuie sur ANALYSER" />
        ) : filtered.length === 0 ? (
          <EmptyState message="Aucun signal dans ce domaine pour aujourd'hui" />
        ) : (
          filtered.map((assessment) => {
            const triggeredAdvices = assessment.advices;
            if (triggeredAdvices.length === 0) {
              return (
                <View key={assessment.id} style={[s.card, { borderColor: '#22C55E33', backgroundColor: '#22C55E0D' }]}>
                  <CheckCircle2 size={20} color="#22C55E" />
                  <View style={{ flex: 1 }}>
                    <Text style={[T.label, { color: '#22C55E' }]}>{'RAS · '}{assessment.domain.toUpperCase()}</Text>
                    <Text style={{ fontFamily: FontSans, fontSize: Fs.body, color: theme.title, marginTop: 4 }}>Aucune anomalie détectée.</Text>
                  </View>
                </View>
              );
            }
            return triggeredAdvices.map((advice) => {
              const rr = assessment.ruleResults.find((r) => r.ruleId === advice.ruleId);
              return (
                <AdviceCard
                  key={`${assessment.id}.${advice.ruleId}`}
                  advice={advice}
                  ruleResult={rr}
                />
              );
            });
          })
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, padding: 16, borderWidth: 1 },
  analyzeBtn: { borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tab: { borderWidth: 1, padding: 8, alignItems: 'center' },
  emptyState: { borderWidth: 1, padding: 24, alignItems: 'center', gap: 8 },
  mono: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display },
});
