import { useEffect, useState } from 'react';
import { usePuzzleStore } from '@/store/puzzleStore';
import { ChessBoard } from '@/components/board/ChessBoard';
import { PuzzleRating } from '@/components/puzzles/PuzzleRating';
import { Button } from '@/components/ui/Button';

export default function PuzzlesScreen() {
  const store = usePuzzleStore();
  const [boardWidth, setBoardWidth] = useState(360);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    function measure() {
      setBoardWidth(Math.min(window.innerWidth - 32, 400));
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (!store.currentPuzzle) store.init();
  }, []);

  function handleMove(from: string, to: string, promotion = 'q'): boolean {
    if (store.status !== 'solving') return false;
    const uci = from + to + (promotion !== 'q' ? promotion : '');
    const result = store.submitMove(uci);

    if (result === 'wrong') {
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 800);
      return false;
    }
    if (result === 'correct_step' || result === 'solved') {
      setFeedback('correct');
      setTimeout(() => setFeedback(null), 400);
      return true;
    }
    return result !== 'ignore';
  }

  const puzzle = store.currentPuzzle;
  if (!puzzle) {
    return (
      <div className="flex items-center justify-center h-64 text-chess-text-muted">
        Chargement…
      </div>
    );
  }

  const isPlayerTurn = store.status === 'solving';
  const playerColorFromFen = store.boardFen.split(' ')[1] as 'w' | 'b' | undefined;
  const boardFlipped = playerColorFromFen === 'b';

  return (
    <div className="screen-enter p-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-chess-text-primary">Puzzles</h1>
          <p className="text-xs text-chess-text-muted mt-0.5">
            {puzzle.themes.slice(0, 2).join(' · ')} · {puzzle.rating} ELO
          </p>
        </div>
        <PuzzleRating />
      </div>

      {/* Status message */}
      <div className="h-8 flex items-center">
        {store.status === 'solving' && (
          <p className="text-sm text-chess-text-secondary">
            Trouvez le meilleur coup pour {playerColorFromFen === 'w' ? 'les Blancs' : 'les Noirs'} ♟
          </p>
        )}
        {store.status === 'correct' && (
          <p className="text-sm font-semibold text-chess-accent">✓ Excellent ! +{delta(store.playerRating, puzzle.rating, true)}</p>
        )}
        {store.status === 'failed' && (
          <p className="text-sm font-semibold text-chess-blunder">✗ Raté ! Solution ci-dessous</p>
        )}
      </div>

      {/* Board */}
      <div
        className={`rounded-lg overflow-hidden transition-all duration-200 ${
          feedback === 'correct' ? 'ring-2 ring-chess-accent' :
          feedback === 'wrong' ? 'ring-2 ring-chess-blunder' : ''
        }`}
      >
        <ChessBoard
          fen={store.boardFen}
          onMove={handleMove}
          boardFlipped={boardFlipped}
          interactive={isPlayerTurn}
          width={boardWidth}
          arrows={
            store.showSolution && store.expectedMoves[store.solutionStep]
              ? [{
                  from: store.expectedMoves[store.solutionStep]!.slice(0, 2),
                  to: store.expectedMoves[store.solutionStep]!.slice(2, 4),
                  color: 'rgba(0,180,200,0.8)',
                }]
              : []
          }
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {store.status === 'solving' && (
          <Button variant="ghost" size="sm" onClick={store.giveUp}>
            Voir la solution
          </Button>
        )}
        {(store.status === 'correct' || store.status === 'failed') && (
          <Button fullWidth onClick={store.nextPuzzle}>
            Puzzle suivant →
          </Button>
        )}
      </div>
    </div>
  );
}

function delta(playerRating: number, puzzleRating: number, won: boolean): number {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - playerRating) / 400));
  return Math.abs(Math.round(K * ((won ? 1 : 0) - expected)));
}
