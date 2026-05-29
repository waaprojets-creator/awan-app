import { create } from 'zustand';
import type { SavedGame, MoveRecord, EvalPoint, Arrow } from '@/types/chess';
import { scoreToPercent } from '@/constants/classification';
import { getStockfishService } from '@/services/stockfishService';
import { analyzeGame } from '@/services/analysisService';
import { saveGame } from '@/services/gameStorageService';

interface AnalysisStore {
  game: SavedGame | null;
  currentMoveIndex: number;
  isAnalyzing: boolean;
  analysisProgress: number;
  moves: MoveRecord[];
  graphData: EvalPoint[];
  currentFen: string;
  currentArrows: Arrow[];

  loadGame: (game: SavedGame) => void;
  startAnalysis: () => Promise<void>;
  goToMove: (index: number) => void;
  nextMove: () => void;
  prevMove: () => void;
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function fenAtMove(moves: MoveRecord[], index: number): string {
  if (index < 0) return START_FEN;
  return moves[index]?.fen ?? START_FEN;
}

function arrowsAtMove(moves: MoveRecord[], index: number): Arrow[] {
  if (index < 0 || index >= moves.length) return [];
  const m = moves[index];
  if (!m?.bestMoveUci) return [];
  return [
    {
      from: m.bestMoveUci.slice(0, 2),
      to: m.bestMoveUci.slice(2, 4),
      color: 'rgba(0,180,0,0.7)',
    },
  ];
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  game: null,
  currentMoveIndex: -1,
  isAnalyzing: false,
  analysisProgress: 0,
  moves: [],
  graphData: [],
  currentFen: START_FEN,
  currentArrows: [],

  loadGame(game) {
    const moves = game.moves;
    set({
      game,
      moves,
      graphData: moves.map((m, i) => ({
        moveIndex: i,
        san: m.san,
        evalPercent: scoreToPercent(m.evalCp, m.evalMate),
        evalCp: m.evalCp,
        evalMate: m.evalMate,
        color: m.color,
      })),
      currentMoveIndex: moves.length - 1,
      currentFen: fenAtMove(moves, moves.length - 1),
      currentArrows: arrowsAtMove(moves, moves.length - 1),
      isAnalyzing: false,
      analysisProgress: 0,
    });
  },

  async startAnalysis() {
    const { game } = get();
    if (!game || get().isAnalyzing) return;

    set({ isAnalyzing: true, analysisProgress: 0 });
    try {
      const sf = getStockfishService();
      await sf.waitReady();

      const { moves, graphData } = await analyzeGame(
        game,
        sf,
        (idx, total) => set({ analysisProgress: idx / total })
      );

      const updatedGame: SavedGame = { ...game, moves, analyzed: true };
      saveGame(updatedGame);

      set({
        game: updatedGame,
        moves,
        graphData,
        isAnalyzing: false,
        analysisProgress: 1,
        currentArrows: arrowsAtMove(moves, get().currentMoveIndex),
      });
    } catch (err) {
      console.error('[Analysis]', err);
      set({ isAnalyzing: false });
    }
  },

  goToMove(index) {
    const { moves } = get();
    const clamped = Math.max(-1, Math.min(moves.length - 1, index));
    set({
      currentMoveIndex: clamped,
      currentFen: fenAtMove(moves, clamped),
      currentArrows: arrowsAtMove(moves, clamped),
    });
  },

  nextMove() {
    get().goToMove(get().currentMoveIndex + 1);
  },

  prevMove() {
    get().goToMove(get().currentMoveIndex - 1);
  },
}));
