import React from 'react';
import { motion } from 'motion/react';
import { Info } from 'lucide-react';
import type { AwanScore, ScoreStatus } from '@/hooks/useAwanScore';
import type { TemporalState } from '@/hooks/useTemporalMode';
import { Touch } from './ui/Touch';

// ── Résolution token → var CSS ─────────────────────────────────────────────────
// Pas de couleur hardcodée — toute couleur passe par un token CSS

const STATUS_VAR: Record<ScoreStatus, string> = {
  ok:     'var(--color-awan-status-ok)',
  warn:   'var(--color-awan-status-warn)',
  error:  'var(--color-awan-status-error)',
  spirit: 'var(--color-awan-status-spirit)',
  mute:   'var(--color-awan-tx-mute)',
};

// ── Barre de domaine ───────────────────────────────────────────────────────────

interface DomainBarProps {
  label: string;
  value: number;
  status: ScoreStatus;
  index: number;
}

function DomainBar({ label, value, status, index }: DomainBarProps) {
  const color = STATUS_VAR[status];
  return (
    <div className="flex flex-col gap-1">
      {/* Label + valeur */}
      <div className="flex justify-between items-baseline">
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '7px',
            fontWeight: 'var(--fw-mute)' as any,
            color: 'var(--color-awan-tx-mute)',
            letterSpacing: '0.2em',
          }}
          className="uppercase"
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            fontWeight: 700,
            color,
          }}
        >
          {value}
        </span>
      </div>
      {/* Barre */}
      <div
        className="h-[2px] w-full"
        style={{ backgroundColor: 'var(--color-awan-border)' }}
      >
        <motion.div
          className="h-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ── Score global ───────────────────────────────────────────────────────────────

interface AwanScoreDisplayProps {
  score:    AwanScore;
  temporal: TemporalState;
  className?: string;
  onInfo?: () => void;
}

export function AwanScoreDisplay({ score, temporal, className = '', onInfo }: AwanScoreDisplayProps) {
  const scoreColor  = STATUS_VAR[score.status];
  const modeColor   = STATUS_VAR[temporal.status];

  return (
    <div
      className={`p-5 border ${className}`}
      style={{
        backgroundColor: 'var(--color-awan-surface)',
        borderColor: 'var(--color-awan-border)',
      }}
    >
      {/* Ligne supérieure : mode temporel + ⓘ */}
      <div className="flex justify-between items-center mb-4">
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '8px',
            fontWeight: 'var(--fw-label)' as any,
            color: modeColor,
            letterSpacing: '0.3em',
          }}
          className="uppercase"
        >
          {temporal.label}
        </span>
        <div className="flex flex-row items-center gap-3">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '7px',
              fontWeight: 400,
              color: 'var(--color-awan-tx-mute)',
              opacity: 0.5,
            }}
          >
            {String(temporal.hour).padStart(2, '0')}H
          </span>
          {onInfo && (
            <Touch onPress={onInfo} className="p-1">
              <Info size={12} color="var(--color-awan-tx-mute)" />
            </Touch>
          )}
        </div>
      </div>

      {/* Score global — Cairo 900 display */}
      <div className="flex items-baseline gap-2 mb-1">
        <motion.span
          key={score.global}
          initial={{ opacity: 0.4, scale: 0.95 }}
          animate={{ opacity: 1,   scale: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '80px',
            fontWeight: 'var(--fw-display)' as any,
            color: scoreColor,
            lineHeight: 1,
            letterSpacing: '-0.03em',
          }}
        >
          {score.global}
        </motion.span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 400,
            color: 'var(--color-awan-tx-mute)',
          }}
        >
          / 100
        </span>
      </div>

      {/* Label AWAN SCORE */}
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '7px',
          fontWeight: 'var(--fw-mute)' as any,
          color: 'var(--color-awan-tx-mute)',
          letterSpacing: '0.4em',
        }}
        className="uppercase block mb-6"
      >
        AWAN SCORE
      </span>

      {/* 3 barres de domaine */}
      <div className="flex flex-col gap-3">
        <DomainBar label={score.spirit.label} value={score.spirit.value} status={score.spirit.status} index={0} />
        <DomainBar label={score.body.label}   value={score.body.value}   status={score.body.status}   index={1} />
        <DomainBar label={score.time.label}   value={score.time.value}   status={score.time.status}   index={2} />
      </div>

      {/* Angle actif bas-droite */}
      <div
        className="absolute bottom-0 right-0 w-3 h-3 border-b border-r"
        style={{ borderColor: scoreColor, opacity: 0.4 }}
      />
    </div>
  );
}
