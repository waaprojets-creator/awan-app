import type { MoveRecord } from '@/types/chess';
import { CLASSIFICATION_META } from '@/constants/classification';

interface BestMoveSuggestionProps {
  move: MoveRecord;
}

export function BestMoveSuggestion({ move }: BestMoveSuggestionProps) {
  if (!move.classification || !move.bestMoveSan) return null;
  if (['best', 'good', 'brilliant', 'great', 'book', 'forced'].includes(move.classification)) return null;

  const meta = CLASSIFICATION_META[move.classification];
  const cpLoss =
    move.evalCp !== null
      ? `${Math.abs(move.evalCp / 100).toFixed(1)} de perte`
      : '';

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
      style={{ backgroundColor: meta.bgColor, borderLeft: `3px solid ${meta.color}` }}
    >
      <span style={{ color: meta.color }} className="font-bold text-base">{meta.symbol}</span>
      <div>
        <span className="text-chess-text-secondary">{meta.label} · </span>
        <span className="text-chess-text-primary font-medium">
          Meilleur : <strong>{move.bestMoveSan}</strong>
        </span>
        {cpLoss && (
          <span className="text-chess-text-muted ml-1">({cpLoss})</span>
        )}
      </div>
    </div>
  );
}
