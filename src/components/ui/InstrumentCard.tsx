import React from 'react';
import { motion } from 'motion/react';
import { Touch } from './Touch';

type StatusVariant = 'ok' | 'warn' | 'error' | 'info' | 'spirit' | 'mute';

interface InstrumentCardProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: StatusVariant;
  progress?: number;    // 0–100, affiche barre de progression
  delta?: string;       // ex: "+2.3" affiché en annotation
  index?: number;       // numéro de cotation [01]
  onPress?: () => void;
  className?: string;
}

const STATUS_COLOR: Record<StatusVariant, string> = {
  ok:     'var(--color-awan-status-ok)',
  warn:   'var(--color-awan-status-warn)',
  error:  'var(--color-awan-status-error)',
  info:   'var(--color-awan-status-info)',
  spirit: 'var(--color-awan-status-spirit)',
  mute:   'var(--color-awan-tx-mute)',
};

export function InstrumentCard({
  label,
  value,
  unit,
  status = 'mute',
  progress,
  delta,
  index,
  onPress,
  className = '',
}: InstrumentCardProps) {
  const statusColor = STATUS_COLOR[status];

  const inner = (
    <div
      className={`relative flex flex-col justify-between p-4 border overflow-hidden ${className}`}
      style={{
        backgroundColor: 'var(--color-awan-surface)',
        borderColor: 'rgba(255,255,255,0.06)',
        minHeight: 96,
      }}
    >
      {/* Cotation technique [01] */}
      {index !== undefined && (
        <span
          className="absolute top-2 right-2"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '7px',
            fontWeight: 400,
            color: 'var(--color-awan-tx-mute)',
            opacity: 0.5,
            letterSpacing: '0.1em',
          }}
        >
          [{String(index).padStart(2, '0')}]
        </span>
      )}

      {/* Label — Cairo 300 */}
      <span
        className="uppercase tracking-[0.2em] block"
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '8px',
          fontWeight: 300,
          color: 'var(--color-awan-tx-mute)',
        }}
      >
        {label}
      </span>

      {/* Valeur + unité — JetBrains Mono pour les chiffres */}
      <div className="flex items-baseline gap-1 mt-1">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '22px',
            fontWeight: 700,
            color: statusColor,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              fontWeight: 400,
              color: 'var(--color-awan-tx-mute)',
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* Delta annotation — Cairo 300 */}
      {delta && (
        <span
          className="mt-0.5 block"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '9px',
            fontWeight: 300,
            color: delta.startsWith('+')
              ? 'var(--color-awan-status-ok)'
              : 'var(--color-awan-status-error)',
          }}
        >
          {delta}
        </span>
      )}

      {/* Barre de progression — indicateur bas */}
      {progress !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
          <motion.div
            className="h-full"
            style={{ backgroundColor: statusColor }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Coin actif — angle supérieur gauche */}
      <div
        className="absolute top-0 left-0 w-2 h-2 border-t border-l"
        style={{ borderColor: statusColor, opacity: status === 'mute' ? 0.2 : 0.6 }}
      />
    </div>
  );

  if (onPress) {
    return (
      <Touch onPress={onPress} className="block w-full text-left">
        <motion.div whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
          {inner}
        </motion.div>
      </Touch>
    );
  }

  return inner;
}
