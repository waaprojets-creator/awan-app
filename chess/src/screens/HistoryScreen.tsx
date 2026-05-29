import { useNavigate } from 'react-router-dom';
import { loadGames, deleteGame } from '@/services/gameStorageService';
import { useState } from 'react';
import type { SavedGame } from '@/types/chess';

export default function HistoryScreen() {
  const navigate = useNavigate();
  const [games, setGames] = useState<SavedGame[]>(() => loadGames());

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    deleteGame(id);
    setGames(loadGames());
  }

  if (games.length === 0) {
    return (
      <div className="screen-enter p-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-chess-text-primary pt-2 mb-6">Parties</h1>
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-chess-text-muted">
          <span className="text-4xl">♟</span>
          <p className="text-sm">Aucune partie enregistrée</p>
          <button
            onClick={() => navigate('/play')}
            className="text-chess-accent text-sm hover:underline"
          >
            Jouer une partie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-enter p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-chess-text-primary pt-2 mb-4">
        Parties <span className="text-chess-text-muted text-base font-normal">({games.length})</span>
      </h1>

      <div className="space-y-2">
        {games.map((g) => {
          const playerWon =
            (g.result === 'white' && g.playerColor === 'w') ||
            (g.result === 'black' && g.playerColor === 'b');
          const playerLost =
            (g.result === 'white' && g.playerColor === 'b') ||
            (g.result === 'black' && g.playerColor === 'w');
          const isDraw = g.result === 'draw';

          const resultLabel = playerWon ? 'Victoire' : playerLost ? 'Défaite' : isDraw ? 'Nulle' : '?';
          const resultColor = playerWon ? 'text-chess-win' : playerLost ? 'text-chess-loss' : 'text-chess-draw';
          const resultBg = playerWon ? 'bg-chess-win/10' : playerLost ? 'bg-chess-loss/10' : 'bg-chess-draw/10';

          const date = new Date(g.startedAt);
          const duration = g.endedAt ? Math.round((g.endedAt - g.startedAt) / 60_000) : 0;

          return (
            <div
              key={g.id}
              onClick={() => navigate(`/analysis?gameId=${g.id}`)}
              className="bg-chess-surface rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-chess-surface-alt transition-colors"
            >
              {/* Result pill */}
              <div className={`shrink-0 ${resultBg} rounded-lg px-2 py-1 text-center min-w-[60px]`}>
                <div className={`text-sm font-bold ${resultColor}`}>{resultLabel}</div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-chess-text-primary">
                    {g.playerColor === 'w' ? '♔' : '♚'} vs Bot {g.botElo}
                  </span>
                  {g.analyzed && (
                    <span className="text-xs bg-chess-accent/20 text-chess-accent px-1.5 py-0.5 rounded">
                      Analysé
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-chess-text-muted mt-0.5">
                  <span>{g.timeControl.label}</span>
                  <span>·</span>
                  <span>{g.moves.length} coups</span>
                  {duration > 0 && <><span>·</span><span>{duration}m</span></>}
                  <span>·</span>
                  <span>{date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={(e) => handleDelete(g.id, e)}
                className="shrink-0 w-7 h-7 flex items-center justify-center text-chess-text-muted hover:text-chess-blunder transition-colors rounded"
                title="Supprimer"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
