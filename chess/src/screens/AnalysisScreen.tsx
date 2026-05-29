import { useEffect, useCallback, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAnalysisStore } from '@/store/analysisStore';
import { getGameById } from '@/services/gameStorageService';
import { ChessBoard } from '@/components/board/ChessBoard';
import { EvalBar } from '@/components/board/EvalBar';
import { MoveList } from '@/components/game/MoveList';
import { AdvantageGraph } from '@/components/analysis/AdvantageGraph';
import { BestMoveSuggestion } from '@/components/analysis/BestMoveSuggestion';
import { MoveClassBadge } from '@/components/analysis/MoveClassBadge';
import { Button } from '@/components/ui/Button';
import { CLASSIFICATION_META } from '@/constants/classification';

export default function AnalysisScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const gameId = params.get('gameId');
  const store = useAnalysisStore();
  const [boardWidth, setBoardWidth] = useState(360);

  useEffect(() => {
    function measure() {
      const vw = window.innerWidth;
      setBoardWidth(Math.min(vw - 32, 400));
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (!gameId) return;
    const game = getGameById(gameId);
    if (!game) { navigate('/history'); return; }
    store.loadGame(game);
  }, [gameId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') store.nextMove();
      if (e.key === 'ArrowLeft') store.prevMove();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store]);

  const currentMove = store.moves[store.currentMoveIndex];
  const currentEvalCp = currentMove?.evalCp ?? null;
  const currentEvalMate = currentMove?.evalMate ?? null;

  const summary = (() => {
    const counts: Record<string, number> = {};
    store.moves.forEach((m) => {
      if (m.classification) {
        counts[m.classification] = (counts[m.classification] ?? 0) + 1;
      }
    });
    return counts;
  })();

  return (
    <div className="screen-enter p-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-chess-text-primary">Analyse</h1>
        {!store.game?.analyzed && !store.isAnalyzing && store.game && (
          <Button size="sm" onClick={() => store.startAnalysis()}>
            Analyser avec Stockfish
          </Button>
        )}
        {store.isAnalyzing && (
          <div className="flex items-center gap-2 text-sm text-chess-text-secondary">
            <div className="w-4 h-4 border-2 border-chess-accent border-t-transparent rounded-full animate-spin" />
            {Math.round(store.analysisProgress * 100)}%
          </div>
        )}
      </div>

      {/* Board + eval */}
      <div className="flex items-center gap-2">
        <EvalBar
          evalCp={currentEvalCp}
          evalMate={currentEvalMate}
          flipped={store.game?.playerColor === 'b'}
          className="self-stretch"
        />
        <ChessBoard
          fen={store.currentFen}
          boardFlipped={store.game?.playerColor === 'b'}
          arrows={store.currentArrows}
          interactive={false}
          width={boardWidth - 28}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => store.goToMove(-1)}
          className="w-9 h-9 rounded-lg bg-chess-surface hover:bg-chess-surface-alt flex items-center justify-center text-chess-text-secondary"
        >
          ⏮
        </button>
        <button
          onClick={store.prevMove}
          className="w-9 h-9 rounded-lg bg-chess-surface hover:bg-chess-surface-alt flex items-center justify-center text-chess-text-secondary"
        >
          ◀
        </button>
        <button
          onClick={store.nextMove}
          className="w-9 h-9 rounded-lg bg-chess-surface hover:bg-chess-surface-alt flex items-center justify-center text-chess-text-secondary"
        >
          ▶
        </button>
        <button
          onClick={() => store.goToMove(store.moves.length - 1)}
          className="w-9 h-9 rounded-lg bg-chess-surface hover:bg-chess-surface-alt flex items-center justify-center text-chess-text-secondary"
        >
          ⏭
        </button>
      </div>

      {/* Best move suggestion */}
      {currentMove && <BestMoveSuggestion move={currentMove} />}

      {/* Advantage graph */}
      {store.graphData.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-chess-text-muted font-medium">Graphe d'avantage</div>
          <AdvantageGraph
            data={store.graphData}
            currentIndex={store.currentMoveIndex}
            onMoveClick={store.goToMove}
          />
        </div>
      )}

      {/* Move list */}
      <div className="bg-chess-surface rounded-xl overflow-hidden" style={{ maxHeight: 200 }}>
        <MoveList
          moves={store.moves}
          currentIndex={store.currentMoveIndex}
          onMoveClick={store.goToMove}
        />
      </div>

      {/* Summary badges */}
      {store.game?.analyzed && Object.keys(summary).length > 0 && (
        <div className="bg-chess-surface rounded-xl p-4 space-y-2">
          <div className="text-sm font-semibold text-chess-text-secondary">Résumé</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary).map(([cls, count]) => {
              const meta = CLASSIFICATION_META[cls as keyof typeof CLASSIFICATION_META];
              if (!meta || !meta.symbol) return null;
              return (
                <div key={cls} className="flex items-center gap-1 text-sm">
                  <MoveClassBadge classification={cls as any} />
                  <span className="text-chess-text-secondary">{count}×</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
