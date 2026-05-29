import { useEffect, useRef } from 'react';
import type { MoveRecord } from '@/types/chess';
import { CLASSIFICATION_META } from '@/constants/classification';

interface MoveListProps {
  moves: MoveRecord[];
  currentIndex?: number;
  onMoveClick?: (index: number) => void;
  compact?: boolean;
}

export function MoveList({ moves, currentIndex = -1, onMoveClick, compact = false }: MoveListProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentIndex]);

  const pairs: [MoveRecord, MoveRecord | null][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i]!, moves[i + 1] ?? null]);
  }

  if (pairs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-chess-text-muted text-sm">
        Aucun coup joué
      </div>
    );
  }

  return (
    <div className={`move-list overflow-y-auto flex-1 ${compact ? 'text-xs' : 'text-sm'}`}>
      {pairs.map(([white, black], pairIdx) => {
        const wIdx = pairIdx * 2;
        const bIdx = pairIdx * 2 + 1;

        return (
          <div
            key={pairIdx}
            className={`flex items-center gap-1 ${pairIdx % 2 === 0 ? 'bg-transparent' : 'bg-chess-surface-alt/30'}`}
          >
            <span className="w-7 text-chess-text-muted text-center shrink-0 py-0.5">
              {pairIdx + 1}.
            </span>
            <MoveButton
              move={white}
              index={wIdx}
              isActive={currentIndex === wIdx}
              onClick={onMoveClick}
              ref={currentIndex === wIdx ? activeRef : undefined}
            />
            {black && (
              <MoveButton
                move={black}
                index={bIdx}
                isActive={currentIndex === bIdx}
                onClick={onMoveClick}
                ref={currentIndex === bIdx ? activeRef : undefined}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface MoveBtnProps {
  move: MoveRecord;
  index: number;
  isActive: boolean;
  onClick?: (i: number) => void;
  ref?: React.Ref<HTMLButtonElement>;
}

function MoveButton({ move, index, isActive, onClick, ref }: MoveBtnProps) {
  const meta = move.classification ? CLASSIFICATION_META[move.classification] : null;

  return (
    <button
      ref={ref}
      onClick={() => onClick?.(index)}
      className={`
        flex-1 flex items-center gap-1 px-1.5 py-0.5 rounded text-left
        transition-colors duration-100
        ${isActive
          ? 'bg-chess-accent text-white font-semibold'
          : 'text-chess-text-primary hover:bg-chess-surface-hover'}
      `}
    >
      <span className="font-medium">{move.san}</span>
      {meta?.symbol && (
        <span
          className="text-xs font-bold"
          style={{ color: isActive ? 'white' : meta.color }}
        >
          {meta.symbol}
        </span>
      )}
    </button>
  );
}
