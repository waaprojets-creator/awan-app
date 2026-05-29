import { Chess } from 'chess.js';
import type { MoveRecord, EvalPoint, PieceColor, SavedGame } from '@/types/chess';
import { classifyMove, scoreToPercent } from '@/constants/classification';
import type { StockfishService } from './stockfishService';

export async function analyzeGame(
  game: SavedGame,
  stockfish: StockfishService,
  onProgress?: (idx: number, total: number) => void
): Promise<{ moves: MoveRecord[]; graphData: EvalPoint[] }> {
  const chess = new Chess();
  const moves = game.moves.map((m) => ({ ...m }));
  const graphData: EvalPoint[] = [];
  const uciMoves: string[] = [];

  // Starting position eval
  const startEval = await stockfish.analyzePosition(
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    [],
    14
  );

  let prevEvalCpWhite =
    startEval.score?.type === 'cp'
      ? startEval.score.value
      : startEval.score?.type === 'mate'
      ? startEval.score.value > 0
        ? 15000
        : -15000
      : 0;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    uciMoves.push(move.uci);

    onProgress?.(i + 1, moves.length);

    const result = await stockfish.analyzePosition(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      uciMoves,
      14
    );

    const score = result.score;
    const evalCp = score?.type === 'cp' ? score.value : null;
    const evalMate = score?.type === 'mate' ? score.value : null;
    const evalCpWhite =
      evalCp !== null
        ? evalCp
        : evalMate !== null
        ? evalMate > 0
          ? 15000
          : -15000
        : 0;

    // cp loss from moving player's perspective
    const movingColor: PieceColor = move.color;
    const prevFromSide = movingColor === 'w' ? prevEvalCpWhite : -prevEvalCpWhite;
    const afterFromSide = movingColor === 'w' ? evalCpWhite : -evalCpWhite;
    const cpLoss = prevFromSide - afterFromSide;

    // Best move from previous position
    const prevAnalysis = await stockfish.analyzePosition(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      uciMoves.slice(0, i),
      14
    );
    const bestUci = prevAnalysis.pv[0] ?? '';

    // Convert best UCI to SAN
    const chessForSan = new Chess(move.fen.split(' ').slice(0, -1).join(' ') || chess.fen());
    let bestMoveSan: string | null = null;
    try {
      if (bestUci) {
        const from = bestUci.slice(0, 2);
        const to = bestUci.slice(2, 4);
        const promotion = bestUci[4];
        const m = chessForSan.move({ from, to, promotion });
        bestMoveSan = m?.san ?? null;
      }
    } catch {}

    const classification = classifyMove(
      prevFromSide / 100,
      afterFromSide / 100,
      move.uci,
      bestUci
    );

    moves[i] = {
      ...move,
      evalCp,
      evalMate,
      classification,
      bestMoveSan,
      bestMoveUci: bestUci,
    };

    graphData.push({
      moveIndex: i,
      san: move.san,
      evalPercent: scoreToPercent(evalCp, evalMate),
      evalCp,
      evalMate,
      color: movingColor,
    });

    prevEvalCpWhite = evalCpWhite;
  }

  return { moves, graphData };
}
