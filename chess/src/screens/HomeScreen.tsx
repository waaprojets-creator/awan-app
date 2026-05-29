import { useNavigate } from 'react-router-dom';
import { getStats, loadGames } from '@/services/gameStorageService';
import { Button } from '@/components/ui/Button';
import { usePuzzleStore } from '@/store/puzzleStore';

export default function HomeScreen() {
  const navigate = useNavigate();
  const stats = getStats();
  const recentGames = loadGames().slice(0, 5);
  const puzzleRating = usePuzzleStore((s) => s.playerRating);

  const winRate = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;

  return (
    <div className="screen-enter p-4 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-chess-text-primary">♟ Chess</h1>
        <p className="text-chess-text-muted text-sm mt-0.5">Jouez · Analysez · Progressez</p>
      </div>

      {/* Quick Play */}
      <Button
        fullWidth
        size="lg"
        onClick={() => navigate('/play')}
        className="text-base font-bold"
      >
        Jouer une partie
      </Button>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Parties" value={stats.total} />
        <StatCard label="Victoires" value={`${winRate}%`} color="#769656" />
        <StatCard label="Puzzles" value={puzzleRating} color="#f0c15c" />
      </div>

      {/* Win/Loss breakdown */}
      {stats.total > 0 && (
        <div className="bg-chess-surface rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-chess-text-secondary uppercase tracking-wider">Bilan</h2>
          <div className="flex gap-3">
            <ResultBar label="V" count={stats.wins} total={stats.total} color="#769656" />
            <ResultBar label="N" count={stats.draws} total={stats.total} color="#a0a0a0" />
            <ResultBar label="D" count={stats.losses} total={stats.total} color="#cc3232" />
          </div>
        </div>
      )}

      {/* Recent games */}
      {recentGames.length > 0 && (
        <div className="bg-chess-surface rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-chess-text-secondary uppercase tracking-wider">Dernières parties</h2>
            <button onClick={() => navigate('/history')} className="text-xs text-chess-accent hover:underline">
              Voir tout
            </button>
          </div>
          <div className="space-y-1">
            {recentGames.map((g) => {
              const playerWon =
                (g.result === 'white' && g.playerColor === 'w') ||
                (g.result === 'black' && g.playerColor === 'b');
              const playerLost =
                (g.result === 'white' && g.playerColor === 'b') ||
                (g.result === 'black' && g.playerColor === 'w');
              const resultStr = playerWon ? '✓' : playerLost ? '✗' : '=';
              const resultColor = playerWon ? 'text-chess-win' : playerLost ? 'text-chess-loss' : 'text-chess-draw';

              return (
                <div
                  key={g.id}
                  className="flex items-center justify-between py-1.5 border-b border-chess-border/50 last:border-0 cursor-pointer hover:bg-chess-surface-alt/50 rounded px-1"
                  onClick={() => navigate(`/analysis?gameId=${g.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${resultColor}`}>{resultStr}</span>
                    <span className="text-chess-text-secondary text-sm">
                      vs Bot {g.botElo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-chess-text-muted">
                    <span>{g.timeControl.label}</span>
                    <span>{new Date(g.startedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-chess-surface rounded-xl p-3 text-center">
      <div className="text-xl font-bold" style={{ color: color ?? '#e8e6e3' }}>{value}</div>
      <div className="text-xs text-chess-text-muted mt-0.5">{label}</div>
    </div>
  );
}

function ResultBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex-1 text-center">
      <div className="h-2 rounded-full bg-chess-surface-alt overflow-hidden mb-1">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="text-xs font-semibold" style={{ color }}>{label}</div>
      <div className="text-xs text-chess-text-muted">{count}</div>
    </div>
  );
}
