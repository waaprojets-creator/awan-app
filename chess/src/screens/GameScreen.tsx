import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { useGameStore } from '@/store/gameStore';
import { getStockfishService } from '@/services/stockfishService';
import { getBotProfile } from '@/constants/elo';
import { saveGame } from '@/services/gameStorageService';
import { ChessBoard } from '@/components/board/ChessBoard';
import { EvalBar } from '@/components/board/EvalBar';
import { PlayerCard } from '@/components/game/PlayerCard';
import { ChessClock } from '@/components/game/ChessClock';
import { MoveList } from '@/components/game/MoveList';
import { GameControls } from '@/components/game/GameControls';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useChessClock } from '@/hooks/useChessClock';
import type { MoveRecord, SavedGame } from '@/types/chess';

export default function GameScreen() {
  const navigate = useNavigate();
  const store = useGameStore();
  const isThinkingRef = useRef(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [boardWidth, setBoardWidth] = useState(360);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  useChessClock();

  // Resize board to fit screen
  useEffect(() => {
    function measure() {
      if (boardContainerRef.current) {
        const w = boardContainerRef.current.offsetWidth;
        setBoardWidth(Math.min(w, 420));
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Init stockfish when game starts
  useEffect(() => {
    if (store.phase !== 'playing') return;
    const sf = getStockfishService();
    sf.waitReady().then(() => {
      const profile = getBotProfile(store.botElo);
      sf.setBotProfile(profile);
      sf.newGame();
    });
  }, [store.phase, store.botElo]);

  // Show end modal
  useEffect(() => {
    if (store.phase === 'ended') {
      setShowEndModal(true);
      persistGame();
    }
  }, [store.phase]);

  const persistGame = useCallback(() => {
    const s = useGameStore.getState();
    if (!s.id || !s.endedAt) return;
    const chess = new Chess();
    s.moves.forEach((m) => {
      try { chess.move({ from: m.uci.slice(0,2), to: m.uci.slice(2,4), promotion: m.uci[4] }); } catch {}
    });
    const saved: SavedGame = {
      id: s.id,
      pgn: chess.pgn(),
      moves: s.moves,
      result: s.result,
      endReason: s.endReason,
      playerColor: s.playerColor,
      botElo: s.botElo,
      timeControl: s.timeControl,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      analyzed: false,
    };
    saveGame(saved);
  }, []);

  // Handle player move
  const handleMove = useCallback(
    (from: string, to: string, promotion = 'q'): boolean => {
      const s = useGameStore.getState();
      if (s.phase !== 'playing') return false;
      if (s.turn !== s.playerColor) return false;
      if (isThinkingRef.current) return false;

      const ok = store.makeMove(from, to, promotion);
      if (!ok) return false;

      const state = useGameStore.getState();
      const chess = new Chess();
      state.moves.forEach((m) => {
        try { chess.move({ from: m.uci.slice(0,2), to: m.uci.slice(2,4), promotion: m.uci[4] }); } catch {}
      });
      // Reconstruct last move san
      const history = chess.history({ verbose: true });
      const lastMove = history[history.length - 1];
      if (!lastMove) return true;

      const record: MoveRecord = {
        san: lastMove.san,
        uci: from + to + (promotion !== 'q' ? promotion : ''),
        fen: chess.fen(),
        evalCp: null,
        evalMate: null,
        classification: null,
        bestMoveSan: null,
        bestMoveUci: null,
        timeTakenMs: 0,
        moveNumber: Math.ceil(state.moves.length / 2),
        color: lastMove.color,
      };
      store.addMoveRecord(record);

      // Check game end
      if (chess.isCheckmate()) {
        store.endGame(state.turn === 'w' ? 'black' : 'white', 'checkmate');
        return true;
      }
      if (chess.isDraw()) {
        const reason = chess.isStalemate() ? 'stalemate'
          : chess.isInsufficientMaterial() ? 'insufficient_material'
          : 'fifty_moves';
        store.endGame('draw', reason);
        return true;
      }

      // Bot move
      triggerBotMove();
      return true;
    },
    [store]
  );

  const triggerBotMove = useCallback(async () => {
    const s = useGameStore.getState();
    if (s.phase !== 'playing') return;
    if (isThinkingRef.current) return;
    isThinkingRef.current = true;

    try {
      const sf = getStockfishService();
      await sf.waitReady();

      const profile = getBotProfile(s.botElo);
      const uciMoves = s.moves.map((m) => m.uci);

      const result = await sf.getBestMove(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        uciMoves,
        profile.movetime,
        profile.depth ?? undefined
      );

      // Update live eval
      if (result.score) {
        const cp = result.score.type === 'cp' ? result.score.value : null;
        const mate = result.score.type === 'mate' ? result.score.value : null;
        useGameStore.getState().setLiveEval(cp, mate);
      }

      const botUci = result.move;
      if (!botUci || botUci === '(none)') return;

      const from = botUci.slice(0, 2);
      const to = botUci.slice(2, 4);
      const promo = botUci[4] ?? 'q';

      const ok = useGameStore.getState().makeMove(from, to, promo);
      if (!ok) return;

      const newState = useGameStore.getState();
      const chess2 = new Chess();
      newState.moves.forEach((m) => {
        try { chess2.move({ from: m.uci.slice(0,2), to: m.uci.slice(2,4), promotion: m.uci[4] }); } catch {}
      });
      const hist2 = chess2.history({ verbose: true });
      const botLastMove = hist2[hist2.length - 1];
      if (!botLastMove) return;

      const botRecord: MoveRecord = {
        san: botLastMove.san,
        uci: botUci,
        fen: chess2.fen(),
        evalCp: result.score?.type === 'cp' ? result.score.value : null,
        evalMate: result.score?.type === 'mate' ? result.score.value : null,
        classification: null,
        bestMoveSan: null,
        bestMoveUci: null,
        timeTakenMs: profile.movetime,
        moveNumber: Math.ceil(newState.moves.length / 2),
        color: botLastMove.color,
      };
      useGameStore.getState().addMoveRecord(botRecord);

      if (chess2.isCheckmate()) {
        useGameStore.getState().endGame(newState.turn === 'w' ? 'black' : 'white', 'checkmate');
      } else if (chess2.isDraw()) {
        const reason = chess2.isStalemate() ? 'stalemate' : 'fifty_moves';
        useGameStore.getState().endGame('draw', reason);
      }
    } finally {
      isThinkingRef.current = false;
    }
  }, []);

  // Redirect if no game
  useEffect(() => {
    if (store.phase === 'setup') navigate('/play', { replace: true });
  }, [store.phase, navigate]);

  const chess = new Chess(store.fen);
  const isInCheck = chess.inCheck();
  let kingCheckSquare: string | null = null;
  if (isInCheck) {
    const board = chess.board();
    const turnColor = store.turn;
    for (const row of board) {
      for (const sq of row) {
        if (sq && sq.type === 'k' && sq.color === turnColor) {
          kingCheckSquare = sq.square;
        }
      }
    }
  }

  const lastMoveSquares = store.moves.length > 0
    ? [store.moves[store.moves.length - 1]!.uci.slice(0, 2), store.moves[store.moves.length - 1]!.uci.slice(2, 4)] as [string, string]
    : null;

  const opponentColor = store.playerColor === 'w' ? 'b' : 'w';
  const opponentTimeMs = opponentColor === 'w' ? store.whiteTimeMs : store.blackTimeMs;
  const playerTimeMs = store.playerColor === 'w' ? store.whiteTimeMs : store.blackTimeMs;

  const endResultText = () => {
    if (!store.result) return 'Partie terminée';
    const playerWon = (store.result === 'white' && store.playerColor === 'w') || (store.result === 'black' && store.playerColor === 'b');
    const isDraw = store.result === 'draw';
    if (isDraw) return 'Nulle !';
    return playerWon ? 'Vous avez gagné !' : 'Vous avez perdu';
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-chess-bg overflow-hidden">
      {/* Sidebar layout on desktop, stacked on mobile */}
      <div className="flex flex-1 overflow-hidden">
        {/* Board area */}
        <div className="flex-1 flex flex-col items-center justify-center p-2 gap-1">
          {/* Opponent info */}
          <div className="w-full max-w-md flex items-center justify-between px-1">
            <PlayerCard
              name={`Bot ${store.botElo}`}
              elo={store.botElo}
              isBot
              isActive={store.turn === opponentColor && store.phase === 'playing'}
            />
            <ChessClock
              timeMs={opponentTimeMs}
              isActive={store.turn === opponentColor && store.phase === 'playing'}
            />
          </div>

          {/* Board + eval bar */}
          <div className="flex items-center gap-1" ref={boardContainerRef}>
            <EvalBar
              evalCp={store.liveEvalCp}
              evalMate={store.liveEvalMate}
              flipped={store.boardFlipped}
              className="self-stretch"
            />
            <ChessBoard
              fen={store.fen}
              onMove={handleMove}
              boardFlipped={store.boardFlipped}
              interactive={store.phase === 'playing' && store.turn === store.playerColor}
              lastMoveSquares={lastMoveSquares}
              kingCheckSquare={kingCheckSquare}
              width={boardWidth}
            />
          </div>

          {/* Player info */}
          <div className="w-full max-w-md flex items-center justify-between px-1">
            <PlayerCard
              name="Vous"
              elo={1200}
              isActive={store.turn === store.playerColor && store.phase === 'playing'}
            />
            <ChessClock
              timeMs={playerTimeMs}
              isActive={store.turn === store.playerColor && store.phase === 'playing'}
            />
          </div>
        </div>

        {/* Side panel — hidden on very small screens, shown on md+ */}
        <div className="hidden md:flex flex-col w-56 bg-chess-surface border-l border-chess-border p-2 gap-2">
          <MoveList moves={store.moves} />
          <GameControls
            phase={store.phase}
            onResign={store.resign}
            onFlip={store.flipBoard}
            onAnalyze={() => {
              const s = useGameStore.getState();
              const id = s.id;
              navigate(`/analysis?gameId=${id}`);
            }}
          />
        </div>
      </div>

      {/* Mobile move list bar */}
      <div className="md:hidden h-12 bg-chess-surface border-t border-chess-border flex items-center gap-2 px-2">
        <MoveList moves={store.moves} compact />
        <GameControls
          phase={store.phase}
          onResign={store.resign}
          onFlip={store.flipBoard}
        />
      </div>

      {/* End game modal */}
      <Modal open={showEndModal} title={endResultText()}>
        <div className="space-y-3">
          <p className="text-chess-text-secondary text-sm">
            {store.endReason === 'checkmate' && 'Échec et mat'}
            {store.endReason === 'timeout' && 'Temps écoulé'}
            {store.endReason === 'resignation' && 'Abandon'}
            {store.endReason === 'stalemate' && 'Pat'}
            {store.endReason === 'insufficient_material' && 'Matériel insuffisant'}
          </p>
          <div className="flex gap-2">
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setShowEndModal(false);
                const id = useGameStore.getState().id;
                navigate(`/analysis?gameId=${id}`);
              }}
            >
              Analyser
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setShowEndModal(false);
                store.reset();
                navigate('/play');
              }}
            >
              Rejouer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
