import type { WorkerEvent, ScoreInfo } from '@/types/stockfish';
import type { BotProfile } from '@/constants/elo';

type EventHandler = (e: WorkerEvent) => void;

export class StockfishService {
  private worker: Worker;
  private handlers: EventHandler[] = [];
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;

  constructor() {
    this.worker = new Worker('/stockfish/stockfish.worker.js');
    this.readyPromise = new Promise((res) => { this.readyResolve = res; });

    this.worker.onmessage = (e: MessageEvent<WorkerEvent>) => {
      const event = e.data;
      if (event.type === 'ready') {
        this.readyResolve();
      }
      this.handlers.forEach((h) => h(event));
    };

    this.worker.onerror = (err) => {
      console.error('[Stockfish] Worker error', err);
      this.handlers.forEach((h) =>
        h({ type: 'error', message: err.message || 'Worker error' })
      );
    };
  }

  onEvent(handler: EventHandler): () => void {
    this.handlers.push(handler);
    return () => { this.handlers = this.handlers.filter((h) => h !== handler); };
  }

  waitReady(): Promise<void> {
    return this.readyPromise;
  }

  setBotProfile(profile: BotProfile): void {
    this.worker.postMessage({
      type: 'setElo',
      uciElo: profile.uciElo,
      skillLevel: profile.skillLevel,
    });
  }

  setPosition(fen: string, moves: string[] = []): void {
    this.worker.postMessage({ type: 'setPosition', fen, moves });
  }

  go(movetime?: number, depth?: number): void {
    this.worker.postMessage({ type: 'go', movetime, depth });
  }

  stop(): void {
    this.worker.postMessage({ type: 'stop' });
  }

  newGame(): void {
    this.worker.postMessage({ type: 'newgame' });
  }

  getBestMove(
    fen: string,
    moves: string[],
    movetime: number,
    depth?: number
  ): Promise<{ move: string; score: ScoreInfo | null }> {
    return new Promise((resolve) => {
      const off = this.onEvent((e) => {
        if (e.type === 'bestmove') {
          off();
          resolve({ move: e.move, score: e.score });
        }
      });
      this.setPosition(fen, moves);
      this.go(movetime, depth);
    });
  }

  analyzePosition(
    fen: string,
    moves: string[],
    depth = 16
  ): Promise<{ score: ScoreInfo | null; pv: string[] }> {
    return new Promise((resolve) => {
      let lastScore: ScoreInfo | null = null;
      let lastPv: string[] = [];

      const off = this.onEvent((e) => {
        if (e.type === 'info') {
          lastScore = e.score;
          lastPv = e.pv;
        }
        if (e.type === 'bestmove') {
          off();
          resolve({ score: lastScore, pv: lastPv });
        }
      });
      this.setPosition(fen, moves);
      this.go(undefined, depth);
    });
  }

  destroy(): void {
    this.worker.terminate();
  }
}

let instance: StockfishService | null = null;

export function getStockfishService(): StockfishService {
  if (!instance) instance = new StockfishService();
  return instance;
}

export function destroyStockfishService(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}
