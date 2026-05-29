import type { SavedGame } from '@/types/chess';

const KEY = 'chess:games';

export function saveGame(game: SavedGame): void {
  const games = loadGames();
  const idx = games.findIndex((g) => g.id === game.id);
  if (idx >= 0) {
    games[idx] = game;
  } else {
    games.unshift(game);
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(games.slice(0, 100)));
  } catch {}
}

export function loadGames(): SavedGame[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedGame[];
  } catch {
    return [];
  }
}

export function getGameById(id: string): SavedGame | undefined {
  return loadGames().find((g) => g.id === id);
}

export function deleteGame(id: string): void {
  const games = loadGames().filter((g) => g.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(games));
  } catch {}
}

export function getStats(): { total: number; wins: number; losses: number; draws: number } {
  const games = loadGames();
  return games.reduce(
    (acc, g) => {
      acc.total++;
      if (g.result === null) return acc;
      const playerWon =
        (g.result === 'white' && g.playerColor === 'w') ||
        (g.result === 'black' && g.playerColor === 'b');
      const playerLost =
        (g.result === 'white' && g.playerColor === 'b') ||
        (g.result === 'black' && g.playerColor === 'w');
      if (playerWon) acc.wins++;
      else if (playerLost) acc.losses++;
      else acc.draws++;
      return acc;
    },
    { total: 0, wins: 0, losses: 0, draws: 0 }
  );
}
