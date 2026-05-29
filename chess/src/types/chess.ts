export type PieceColor = 'w' | 'b';

export interface TimeControl {
  minutes: number;
  increment: number;
  label: string;
}

export type GamePhase = 'setup' | 'playing' | 'ended';

export type GameResult = 'white' | 'black' | 'draw' | null;

export type GameEndReason =
  | 'checkmate'
  | 'stalemate'
  | 'timeout'
  | 'resignation'
  | 'draw_agreement'
  | 'insufficient_material'
  | 'threefold_repetition'
  | 'fifty_moves';

export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'forced'
  | 'book';

export interface MoveRecord {
  san: string;
  uci: string;
  fen: string;
  evalCp: number | null;
  evalMate: number | null;
  classification: MoveClassification | null;
  bestMoveSan: string | null;
  bestMoveUci: string | null;
  timeTakenMs: number;
  moveNumber: number;
  color: PieceColor;
}

export interface Arrow {
  from: string;
  to: string;
  color?: string;
}

export interface GameState {
  id: string;
  phase: GamePhase;
  fen: string;
  moves: MoveRecord[];
  turn: PieceColor;
  result: GameResult;
  endReason: GameEndReason | null;
  playerColor: PieceColor;
  botElo: number;
  timeControl: TimeControl;
  whiteTimeMs: number;
  blackTimeMs: number;
  startedAt: number;
  endedAt: number | null;
  boardFlipped: boolean;
}

export interface SavedGame {
  id: string;
  pgn: string;
  moves: MoveRecord[];
  result: GameResult;
  endReason: GameEndReason | null;
  playerColor: PieceColor;
  botElo: number;
  timeControl: TimeControl;
  startedAt: number;
  endedAt: number | null;
  analyzed: boolean;
}

export interface PuzzleEntry {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
}

export interface EvalPoint {
  moveIndex: number;
  san: string;
  evalPercent: number;
  evalCp: number | null;
  evalMate: number | null;
  color: PieceColor;
}
