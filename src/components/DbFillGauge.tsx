import React from 'react';
import { useDbFill } from '@/hooks/useDbFill';

export function DbFillGauge() {
  const { domains, total, loading } = useDbFill();

  if (loading) return null;

  return (
    <div className="bg-white/3 border border-white/5 p-6">
      <div className="flex items-baseline justify-between mb-4">
        <span className="text-xs font-black text-awan-tx uppercase tracking-widest">REMPLISSAGE BASE</span>
        <span className="text-xs font-mono text-awan-tx-mute">{total} entrées</span>
      </div>

      {/* Stacked bar */}
      <div
        className="h-3 w-full flex overflow-hidden"
        style={{ backgroundColor: 'var(--color-awan-border-soft)' }}
        role="img"
        aria-label={`Base utilisateur : ${total} entrées totales`}
      >
        {total > 0 && domains.map((d) => (
          d.count > 0 ? (
            <div
              key={d.id}
              style={{
                width: `${(d.count / total) * 100}%`,
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
