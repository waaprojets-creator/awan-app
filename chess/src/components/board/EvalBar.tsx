import { scoreToPercent } from '@/constants/classification';

interface EvalBarProps {
  evalCp: number | null;
  evalMate: number | null;
  flipped?: boolean;
  className?: string;
}

export function EvalBar({ evalCp, evalMate, flipped = false, className = '' }: EvalBarProps) {
  const whitePct = scoreToPercent(evalCp, evalMate);
  const blackPct = 100 - whitePct;

  const topPct = flipped ? whitePct : blackPct;
  const bottomPct = flipped ? blackPct : whitePct;

  const evalLabel = () => {
    if (evalMate !== null) return evalMate > 0 ? `M${evalMate}` : `M${-evalMate}`;
    if (evalCp === null) return '0.0';
    const v = Math.abs(evalCp / 100);
    return v.toFixed(1);
  };

  const isWhiteAdvantage = (evalCp ?? 0) > 0;

  return (
    <div className={`flex flex-col w-5 rounded overflow-hidden bg-chess-surface-alt ${className}`} style={{ minHeight: 200 }}>
      {/* Dark side (top) */}
      <div
        className="eval-bar-fill bg-chess-surface-alt flex items-start justify-center pt-1"
        style={{ height: `${topPct}%`, minHeight: 8 }}
      >
        {!isWhiteAdvantage && topPct > 8 && (
          <span className="text-[8px] text-chess-text-secondary font-mono leading-none rotate-180 writing-mode-vertical">
            {evalLabel()}
          </span>
        )}
      </div>
      {/* White side (bottom) */}
      <div
        className="eval-bar-fill bg-chess-eval-white flex items-end justify-center pb-1"
        style={{ height: `${bottomPct}%`, minHeight: 8 }}
      >
        {isWhiteAdvantage && bottomPct > 8 && (
          <span className="text-[8px] text-gray-700 font-mono leading-none">
            {evalLabel()}
          </span>
        )}
      </div>
    </div>
  );
}
