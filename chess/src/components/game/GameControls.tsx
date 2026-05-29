import { Button } from '@/components/ui/Button';

interface GameControlsProps {
  onResign: () => void;
  onFlip: () => void;
  onAnalyze?: () => void;
  phase: 'playing' | 'ended' | 'setup';
}

export function GameControls({ onResign, onFlip, onAnalyze, phase }: GameControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onFlip}
        title="Retourner l'échiquier"
        className="w-8 h-8 flex items-center justify-center rounded text-chess-text-muted hover:text-chess-text-primary hover:bg-chess-surface-alt transition-colors"
      >
        ⇅
      </button>
      {phase === 'playing' && (
        <Button variant="danger" size="sm" onClick={onResign}>
          Abandonner
        </Button>
      )}
      {phase === 'ended' && onAnalyze && (
        <Button variant="primary" size="sm" onClick={onAnalyze}>
          Analyser
        </Button>
      )}
    </div>
  );
}
