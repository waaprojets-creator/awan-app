import React from 'react';
import { useDbFill } from '@/hooks/useDbFill';

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 2 : 1);
}

export function DbFillGauge() {
  const { domains, total, bytes, maxBytes, loading } = useDbFill();

  if (loading) return null;

  const fillRatio = Math.min(bytes / maxBytes, 1);
  const isNearCap = fillRatio >= 0.8;
  const isAtCap = fillRatio >= 1;

  return (
    <div className="bg-white/3 border border-white/5 p-6">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs font-black text-awan-tx uppercase tracking-widest">REMPLISSAGE BASE</span>
        <span
          className="text-xs font-mono"
          style={{
            color: isAtCap
              ? 'var(--color-awan-status-error)'
              : isNearCap
              ? 'var(--color-awan-status-warn)'
              : 'var(--color-awan-tx-mute)',
          }}
        >
          {formatMB(bytes)} / {formatMB(maxBytes)} MB
        </span>
      </div>
      <div className="flex items-baseline justify-between mb-4">
        <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-tighter">
          {total} entrées · plafond {(maxBytes / 1024 / 1024).toFixed(0)} MB
        </span>
        <span className="text-xs font-mono text-awan-tx-dim">{(fillRatio * 100).toFixed(1)}%</span>
      </div>

      {/* Stacked bar — segments proportionnels à la taille MB, fond = capacité restante */}
      <div
        className="h-3 w-full flex overflow-hidden"
        style={{ backgroundColor: 'var(--color-awan-border-soft)' }}
        role="img"
        aria-label={`Base utilisateur : ${formatMB(bytes)} sur ${formatMB(maxBytes)} MB`}
      >
        {total > 0 && domains.map((d) => (
          d.count > 0 ? (
            <div
              key={d.id}
              style={{
                width: `${(d.count / total) * fillRatio * 100}%`,
                backgroundColor: d.color,
              }}
              title={`${d.label} — ${d.count}`}
            />
          ) : null
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-4">
        {domains.map((d) => (
          <div key={d.id} className="flex items-center gap-2">
            <span
              className="w-3 h-3 shrink-0"
              style={{ backgroundColor: d.color }}
              aria-hidden
            />
            <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-tighter flex-1">
              {d.label}
            </span>
            <span className="text-awan-sm font-mono text-awan-tx-dim">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
