interface PlayerCardProps {
  name: string;
  elo: number;
  isBot?: boolean;
  isActive?: boolean;
  capturedPieces?: string[];
}

const PIECE_UNICODE: Record<string, string> = {
  wP: '♙', wN: '♘', wB: '♗', wR: '♖', wQ: '♕',
  bP: '♟', bN: '♞', bB: '♝', bR: '♜', bQ: '♛',
};

export function PlayerCard({ name, elo, isBot = false, isActive = false, capturedPieces = [] }: PlayerCardProps) {
  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
      isActive ? 'bg-chess-surface' : ''
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold
        ${isBot ? 'bg-chess-accent text-white' : 'bg-chess-surface-alt text-chess-text-primary'}`}
      >
        {isBot ? '🤖' : name[0]?.toUpperCase() ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-chess-text-primary truncate">{name}</span>
          <span className="text-xs text-chess-text-muted">({elo})</span>
        </div>
        {capturedPieces.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-0.5">
            {capturedPieces.map((p, i) => (
              <span key={i} className="text-xs leading-none opacity-70">
                {PIECE_UNICODE[p] ?? ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
