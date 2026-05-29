interface ChessClockProps {
  timeMs: number;
  isActive: boolean;
}

function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (ms < 10_000) {
    // Show tenths when < 10s
    const tenths = Math.floor((ms % 1000) / 100);
    return `${sec}.${tenths}`;
  }
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function ChessClock({ timeMs, isActive }: ChessClockProps) {
  const isLow = timeMs < 10_000;
  const isWarning = timeMs < 30_000;

  return (
    <div
      className={`
        font-mono text-xl font-bold px-3 py-1 rounded-lg min-w-[5rem] text-center
        transition-colors duration-300
        ${isActive
          ? 'bg-chess-text-primary text-chess-bg'
          : 'bg-chess-surface-alt text-chess-text-secondary'}
        ${isLow && isActive ? 'clock-low text-chess-clock-low bg-chess-surface-alt' : ''}
        ${isWarning && !isLow && isActive ? 'text-chess-clock-warning' : ''}
      `}
    >
      {formatTime(timeMs)}
    </div>
  );
}
