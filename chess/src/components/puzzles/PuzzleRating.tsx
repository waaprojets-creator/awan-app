import { usePuzzleStore } from '@/store/puzzleStore';

export function PuzzleRating() {
  const rating = usePuzzleStore((s) => s.playerRating);
  const streak = usePuzzleStore((s) => s.streak);

  return (
    <div className="flex items-center gap-3">
      <div className="text-center">
        <div className="text-xl font-bold text-chess-text-primary">{rating}</div>
        <div className="text-xs text-chess-text-muted">Classement</div>
      </div>
      {streak > 1 && (
        <div className="text-center">
          <div className="text-xl font-bold text-chess-accent">{streak}🔥</div>
          <div className="text-xs text-chess-text-muted">Série</div>
        </div>
      )}
    </div>
  );
}
