import { create } from 'zustand';
import { Chess } from 'chess.js';
import { nanoid } from './nanoid';
import type {
  GameState,
  PieceColor,
  TimeControl,
  MoveRecord,
  GameResult,
  GameEndReason,
  Arrow,
} from '@/types/chess';

interface GameStore extends GameState {
  chess: Chess;
  liveEvalCp: number | null;
  liveEvalMate: number | null;
  selectedSquare: string | null;
  arrowOverlays: Arrow[];

  startGame: (playerColor: PieceColor, botElo: number, tc: TimeControl) => void;
  makeMove: (from: string, to: string, promotion?: string) => boolean;
  addMoveRecord: (record: MoveRecord) => void;
  tickClock: () => void;
  setLiveEval: (cp: number | null, mate: number | null) => void;
  resign: () => void;
  endGame: (result: GameResult, reason: GameEndReason) => void;
  flipBoard: () => void;
  setArrows: (arrows: Arrow[]) => void;
  setSelectedSquare: (sq: string | null) => void;
  reset: () => void;
}

const INITIAL: Omit<GameState, 'id' | 'startedAt'> = {
  phase: 'setup',
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moves: [],
  turn: 'w',
  result: null,
  endReason: null,
  playerColor: 'w',
  botElo: 1200,
  timeControl: { minutes: 10, increment: 0, label: 'Rapid 10+0' },
  whiteTimeMs: 600_000,
  blackTimeMs: 600_000,
  endedAt: null,
  boardFlipped: false,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...INITIAL,
  id: '',
  startedAt: 0,
  chess: new Chess(),
  liveEvalCp: null,
  liveEvalMate: null,
  selectedSquare: null,
  arrowOverlays: [],

  startGame(playerColor, botElo, tc) {
    const chess = new Chess();
    set({
      id: nanoid(),
      phase: 'playing',
      fen: chess.fen(),
      moves: [],
      turn: 'w',
      result: null,
      endReason: null,
      playerColor,
      botElo,
      timeControl: tc,
      whiteTimeMs: tc.minutes * 60_000,
      blackTimeMs: tc.minutes * 60_000,
      startedAt: Date.now(),
      endedAt: null,
      boardFlipped: playerColor === 'b',
      chess,
      liveEvalCp: null,
      liveEvalMate: null,
      arrowOverlays: [],
    });
  },

  makeMove(from, to, promotion = 'q') {
    const { chess, phase, turn, timeControl } = get();
    if (phase !== 'playing') return false;

    try {
      const move = chess.move({ from, to, promotion });
      if (!move) return false;

      const newFen = chess.fen();
      const newTurn = chess.turn() as PieceColor;

      set((s) => ({
        fen: newFen,
        turn: newTurn,
        // Apply increment for the side that just moved
        whiteTimeMs:
          turn === 'w'
            ? s.whiteTimeMs + timeControl.increment * 1000
            : s.whiteTimeMs,
        blackTimeMs:
          turn === 'b'
            ? s.blackTimeMs + timeControl.increment * 1000
            : s.blackTimeMs,
      }));

      return true;
    } catch {
      return false;
    }
  },

  addMoveRecord(record) {
    set((s) => ({ moves: [...s.moves, record] }));
  },

  tickClock() {
    const { phase, turn, whiteTimeMs, blackTimeMs } = get();
    if (phase !== 'playing') return;

    const TICK = 100;
    if (turn === 'w') {
      const newTime = whiteTimeMs - TICK;
      if (newTime <= 0) {
        set({ whiteTimeMs: 0 });
        get().endGame('black', 'timeout');
      } else {
        set({ whiteTimeMs: newTime });
      }
    } else {
      const newTime = blackTimeMs - TICK;
      if (newTime <= 0) {
        set({ blackTimeMs: 0 });
        get().endGame('white', 'timeout');
      } else {
        set({ blackTimeMs: newTime });
      }
    }
  },

  setLiveEval(cp, mate) {
    set({ liveEvalCp: cp, liveEvalMate: mate });
  },

  resign() {
    const { playerColor } = get();
    const winner: GameResult = playerColor === 'w' ? 'black' : 'white';
    get().endGame(winner, 'resignation');
  },

  endGame(result, reason) {
    set({ phase: 'ended', result, endReason: reason, endedAt: Date.now() });
  },

  flipBoard() {
    set((s) => ({ boardFlipped: !s.boardFlipped }));
  },

  setArrows(arrows) {
    set({ arrowOverlays: arrows });
  },

  setSelectedSquare(sq) {
    set({ selectedSquare: sq });
  },

  reset() {
    set({ ...INITIAL, id: '', startedAt: 0, chess: new Chess() });
  },
}));
