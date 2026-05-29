import { create } from 'zustand';
import { Chess } from 'chess.js';
import { PUZZLES } from '@/data/puzzles';
import type { PuzzleEntry } from '@/types/chess';

type PuzzleStatus = 'idle' | 'solving' | 'correct' | 'failed';

interface PuzzleStore {
  puzzles: PuzzleEntry[];
  currentIndex: number;
  currentPuzzle: PuzzleEntry | null;
  status: PuzzleStatus;
  playerRating: number;
  ratingHistory: { date: string; rating: number }[];
  solutionStep: number;
  chess: Chess | null;
  boardFen: string;
  expectedMoves: string[];
  showSolution: boolean;
  streak: number;

  init: () => void;
  loadNextPuzzle: () => void;
  submitMove: (uci: string) => 'correct_step' | 'solved' | 'wrong' | 'ignore';
  giveUp: () => void;
  nextPuzzle: () => void;
}

const PUZZLE_RATING_KEY = 'chess:puzzle_rating';
const PUZZLE_HISTORY_KEY = 'chess:puzzle_rating_history';

function loadRating(): number {
  try { return parseInt(localStorage.getItem(PUZZLE_RATING_KEY) || '1200'); }
  catch { return 1200; }
}

function loadHistory(): { date: string; rating: number }[] {
  try {
    const raw = localStorage.getItem(PUZZLE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRating(r: number, history: { date: string; rating: number }[]): void {
  try {
    localStorage.setItem(PUZZLE_RATING_KEY, String(r));
    localStorage.setItem(PUZZLE_HISTORY_KEY, JSON.stringify(history.slice(-100)));
  } catch {}
}

function ratingDelta(playerRating: number, puzzleRating: number, won: boolean): number {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - playerRating) / 400));
  const score = won ? 1 : 0;
  return Math.round(K * (score - expected));
}

function shufflePuzzles(arr: PuzzleEntry[]): PuzzleEntry[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const usePuzzleStore = create<PuzzleStore>((set, get) => ({
  puzzles: [],
  currentIndex: 0,
  currentPuzzle: null,
  status: 'idle',
  playerRating: loadRating(),
  ratingHistory: loadHistory(),
  solutionStep: 0,
  chess: null,
  boardFen: '',
  expectedMoves: [],
  showSolution: false,
  streak: 0,

  init() {
    const shuffled = shufflePuzzles(PUZZLES);
    set({ puzzles: shuffled, currentIndex: 0 });
    get().loadNextPuzzle();
  },

  loadNextPuzzle() {
    const { puzzles, currentIndex } = get();
    if (!puzzles.length) return;
    const idx = currentIndex % puzzles.length;
    const puzzle = puzzles[idx];
    if (!puzzle) return;

    const chess = new Chess(puzzle.fen);
    // Apply opponent's first move to set the problem position
    const opponentMove = puzzle.moves[0];
    if (opponentMove) {
      try {
        chess.move({ from: opponentMove.slice(0, 2), to: opponentMove.slice(2, 4), promotion: opponentMove[4] });
      } catch {}
    }

    // Expected player solution moves (indices 1, 3, 5, ...)
    const solutionMoves = puzzle.moves.slice(1);

    set({
      currentPuzzle: puzzle,
      status: 'solving',
      solutionStep: 0,
      chess,
      boardFen: chess.fen(),
      expectedMoves: solutionMoves,
      showSolution: false,
    });
  },

  submitMove(uci) {
    const { chess, expectedMoves, solutionStep, currentPuzzle, playerRating, ratingHistory, streak } = get();
    if (!chess || !currentPuzzle) return 'ignore';
    if (get().status !== 'solving') return 'ignore';

    const expected = expectedMoves[solutionStep];
    if (!expected) return 'ignore';

    if (uci !== expected) {
      const delta = ratingDelta(playerRating, currentPuzzle.rating, false);
      const newRating = Math.max(400, playerRating + delta);
      const history = [...ratingHistory, { date: new Date().toISOString(), rating: newRating }];
      saveRating(newRating, history);
      set({ status: 'failed', playerRating: newRating, ratingHistory: history, streak: 0 });
      return 'wrong';
    }

    // Apply player move
    try {
      chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    } catch { return 'wrong'; }

    const nextStep = solutionStep + 1;

    if (nextStep >= expectedMoves.length) {
      // Puzzle solved
      const delta = ratingDelta(playerRating, currentPuzzle.rating, true);
      const newRating = playerRating + delta;
      const history = [...ratingHistory, { date: new Date().toISOString(), rating: newRating }];
      saveRating(newRating, history);
      set({
        status: 'correct',
        boardFen: chess.fen(),
        solutionStep: nextStep,
        playerRating: newRating,
        ratingHistory: history,
        streak: streak + 1,
      });
      return 'solved';
    }

    // Apply opponent's response
    const opponentMove = expectedMoves[nextStep];
    if (opponentMove) {
      try {
        chess.move({
          from: opponentMove.slice(0, 2),
          to: opponentMove.slice(2, 4),
          promotion: opponentMove[4],
        });
      } catch {}
    }

    set({
      solutionStep: nextStep + 1,
      boardFen: chess.fen(),
      expectedMoves,
    });
    return 'correct_step';
  },

  giveUp() {
    const { currentPuzzle, playerRating, ratingHistory } = get();
    if (!currentPuzzle) return;
    const delta = ratingDelta(playerRating, currentPuzzle.rating, false);
    const newRating = Math.max(400, playerRating + delta);
    const history = [...ratingHistory, { date: new Date().toISOString(), rating: newRating }];
    saveRating(newRating, history);
    set({ status: 'failed', showSolution: true, playerRating: newRating, ratingHistory: history, streak: 0 });
  },

  nextPuzzle() {
    set((s) => ({ currentIndex: s.currentIndex + 1 }));
    get().loadNextPuzzle();
  },
}));
