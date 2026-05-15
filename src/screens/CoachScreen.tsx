import React, { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, Zap } from 'lucide-react';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';
import { useCoach } from '../hooks/useCoach';
import { ds } from '../utils/storage';
import type { AssessmentLatest, Advice, RuleResult } from '../data/schemas/coach/assessment';
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

const SEVERITY_STYLES: Record<Severity, SeverityStyle> = {
  info:  { className: 'border-awan-gold/20 bg-awan-gold/5',   Icon: Info,          color: 'var(--color-awan-gold)' },
  good:  { className: 'border-green-500/20 bg-green-500/5',   Icon: CheckCircle2,  color: 'rgb(34,197,94)' },
  warn:  { className: 'border-amber-400/20 bg-amber-400/5',   Icon: AlertTriangle, color: 'rgb(251,191,36)' },
  alert: { className: 'border-red-500/20 bg-red-500/5',       Icon: AlertOctagon,  color: 'rgb(239,68,68)' },
};

function AdviceCard({ advice, ruleResult }: { advice: Advice; ruleResult: RuleResult | undefined }) {
  const style = SEVERITY_STYLES[advice.severity];
  const { Icon } = style;
  return (
    <div className={`rounded-awan-xl border p-4 flex flex-row gap-3 ${style.className}`}>
      <div className="flex-shrink-0 pt-0.5">
        <Icon size={20} color={style.color} />
      </div>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <span className="awan-label" style={{ color: style.color }}>
          {advice.severity.toUpperCase()} · {advice.ruleId}
        </span>
        <span className="text-awan-tx text-sm leading-snug break-words">
          {advice.key}
        </span>
        {ruleResult !== undefined && (
          <span className="font-mono text-[10px] text-awan-tx-mute mt-1">
            SIGNAL = {Number.isFinite(ruleResult.signalValue) ? ruleResult.signalValue.toFixed(2) : '—'}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-awan-xl border border-white/5 bg-awan-surface p-6 flex flex-col items-center gap-2">
      <Info size={24} color="var(--color-awan-tx-mute)" />
      <span className="awan-label text-awan-tx-mute text-center">{message}</span>
    </div>
  );
}

export default function CoachScreen(_props: NavProps): React.ReactElement {
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
          <Zap size={16} color="var(--color-awan-gold)" />
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
                  style={{ color: active ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)' }}
                >
                  {tab.label}
                </span>
              </div>
            </Touch>
          );
        })}
      </div>

      {/* ── Cartes assessment ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
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
