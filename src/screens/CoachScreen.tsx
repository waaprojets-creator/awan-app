import React, { useMemo, useState } from 'react';
import { useTheme, type AwanTheme } from '../hooks/useTheme';
import { ScrollView } from 'react-native';
import { AlertOctagon, AlertTriangle, CalendarClock, CheckCircle2, Info, Zap } from 'lucide-react';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';
import { useCoach } from '../hooks/useCoach';
import { ds } from '../utils/storage';
import { getAdviceText } from '../constants/coachAdvice';
import type { AssessmentLatest, Advice, RuleResult } from '../data/schemas/coach/assessment';
import type { ForecastLatest } from '../data/schemas/coach/forecast';
import type { Domain, Severity } from '../data/schemas/coach/rule';
import type { NavProps } from '../types/nav';

type TabKey = 'sport' | 'nutrition' | 'anthropo' | 'cross';

interface TabDef {
  key: TabKey;
  label: string;
  domain: Domain;
}

const TABS: TabDef[] = [
  { key: 'sport',     label: 'SPORT',     domain: 'sport' },
  { key: 'nutrition', label: 'NUTRITION', domain: 'nutrition' },
  { key: 'anthropo',  label: 'CORPS',     domain: 'anthropo' },
  { key: 'cross',     label: 'CROSS',     domain: 'cross' },
];

interface SeverityStyle {
  className: string;
  Icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  color: string;
}

function getSeverityStyles(t: Pick<AwanTheme, 'selected'>): Record<Severity, SeverityStyle> {
  return {
    info:  { className: 'border-awan-gold/20 bg-awan-gold/5',   Icon: Info,          color: t.selected },
    good:  { className: 'border-green-500/20 bg-green-500/5',   Icon: CheckCircle2,  color: 'rgb(34,197,94)' },
    warn:  { className: 'border-amber-400/20 bg-amber-400/5',   Icon: AlertTriangle, color: 'rgb(251,191,36)' },
    alert: { className: 'border-red-500/20 bg-red-500/5',       Icon: AlertOctagon,  color: 'rgb(239,68,68)' },
  };
}

function AdviceCard({ advice, ruleResult }: { advice: Advice; ruleResult: RuleResult | undefined }) {
  const theme = useTheme();
  const style = getSeverityStyles(theme)[advice.severity];
  const { Icon } = style;
  const text = getAdviceText(advice.key);
  return (
    <div className={`border p-4 flex flex-row gap-3 ${style.className}`}>
      <div className="flex-shrink-0 pt-0.5">
        <Icon size={20} color={style.color} />
      </div>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <span className="awan-label" style={{ color: style.color }}>
          {advice.severity.toUpperCase()}
        </span>
        <span className="text-awan-tx font-bold text-sm leading-snug break-words">
          {text.title}
        </span>
        <span className="text-awan-tx-dim text-xs leading-relaxed break-words">
          {text.advice}
        </span>
        {ruleResult !== undefined && Number.isFinite(ruleResult.signalValue) && ruleResult.signalValue !== 0 && (
          <span className="font-mono text-awan-md text-awan-tx-mute mt-1">
            VALEUR MESURÉE · {Number.isInteger(ruleResult.signalValue) ? ruleResult.signalValue : ruleResult.signalValue.toFixed(2)}
          </span>
        )}
      </div>
    </div>
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
  const style = getSeverityStyles(theme)[forecast.severity];
  const text = getAdviceText(forecast.detailKey);
  const titleText = getAdviceText(forecast.titleKey);
  const interpolated = interpolate(text.advice, { ...forecast.params, targetDate: forecast.targetDate });
  return (
    <div className={`border p-4 flex flex-row gap-3 ${style.className}`}>
      <div className="flex-shrink-0 pt-0.5">
        <CalendarClock size={20} color={style.color} />
      </div>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex flex-row items-center gap-2">
          <span className="awan-label" style={{ color: style.color }}>
            {horizonLabel(forecast.horizonDays)}
          </span>
          <span className="awan-label text-awan-tx-mute">·</span>
          <span className="awan-label text-awan-tx-mute font-mono">{forecast.targetDate}</span>
        </div>
        <span className="text-awan-tx font-bold text-sm leading-snug break-words">
          {titleText.title}
        </span>
        <span className="text-awan-tx-dim text-xs leading-relaxed break-words">
          {interpolated}
        </span>
        <span className="font-mono text-awan-md text-awan-tx-mute mt-1">
          CONFIANCE · {Math.round(forecast.confidence * 100)}%
        </span>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <div className="rounded-awan-xl border border-white/5 bg-awan-surface p-6 flex flex-col items-center gap-2">
      <Info size={24} color={theme.mute} />
      <span className="awan-label text-awan-tx-mute text-center">{message}</span>
    </div>
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

  const handleAnalyze = (): void => {
    void runAll(today);
  };

  return (
    <ScrollView
      style={{ flex: 1, width: '100%', maxWidth: '100%' }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100, width: '100%', maxWidth: '100%' }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader tag="SYSTÈME · COACH" title="CONSEILLER IA" />

      {/* ── Action principale ──────────────────────────────────────────────── */}
      <Touch
        onPress={handleAnalyze}
        disabled={loading}
        className="block w-full mb-6"
      >
        <div
          className="rounded-awan-xl border border-awan-gold/30 bg-awan-gold/5 p-4 flex flex-row items-center justify-center gap-2"
          style={{ opacity: loading ? 0.5 : 1 }}
        >
          <Zap size={16} color={theme.selected} />
          <span className="awan-label text-awan-gold font-mono font-bold">
            {loading ? 'ANALYSE EN COURS…' : 'ANALYSER'}
          </span>
        </div>
      </Touch>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-row gap-2 mb-4">
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Touch
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className="flex-1"
            >
              <div
                className={`rounded-awan-xl border p-2 text-center ${
                  active
                    ? 'border-awan-gold/40 bg-awan-gold/10'
                    : 'border-white/5 bg-white/5'
                }`}
              >
                <span
                  className="awan-label font-mono font-bold"
                  style={{ color: active ? theme.selected : theme.mute }}
                >
                  {tab.label}
                </span>
              </div>
            </Touch>
          );
        })}
      </div>

      {/* ── À VENIR (forecasts) ─────────────────────────────────────────── */}
      {hasAny && filtered.length > 0 && (() => {
        const allForecasts = filtered.flatMap(a => a.forecasts ?? []);
        if (allForecasts.length === 0) return null;
        const sorted = allForecasts.slice().sort((a, b) => a.horizonDays - b.horizonDays);
        return (
          <div className="mb-6">
            <span className="awan-label text-awan-tx-mute mb-3 block">À VENIR — PROJECTIONS COACH</span>
            <div className="flex flex-col gap-3">
              {sorted.map(f => <ForecastCard key={f.id} forecast={f} />)}
            </div>
          </div>
        );
      })()}

      {/* ── Cartes assessment (reactive advices) ─────────────────────────── */}
      <div className="flex flex-col gap-3">
        {hasAny && filtered.length > 0 && (() => {
          const anyAdvice = filtered.some(a => a.advices.length > 0);
          return anyAdvice ? (
            <span className="awan-label text-awan-tx-mute mb-1 block">AUJOURD'HUI</span>
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
                <div
                  key={assessment.id}
                  className="rounded-awan-xl border border-green-500/20 bg-green-500/5 p-4 flex flex-row gap-3"
                >
                  <CheckCircle2 size={20} color="rgb(34,197,94)" />
                  <div className="flex-1">
                    <span className="awan-label" style={{ color: 'rgb(34,197,94)' }}>
                      RAS · {assessment.domain.toUpperCase()}
                    </span>
                    <p className="text-awan-tx text-sm mt-1">
                      Aucune anomalie détectée.
                    </p>
                  </div>
                </div>
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
      </div>
    </ScrollView>
  );
}
