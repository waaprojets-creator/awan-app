export interface BotProfile {
  elo: number;
  label: string;
  uciElo: number;
  skillLevel: number;
  movetime: number;
  depth: number | null;
}

export const BOT_PROFILES: BotProfile[] = [
  { elo: 400,  label: 'Débutant',     uciElo: 400,  skillLevel: 0,  movetime: 50,   depth: 1  },
  { elo: 600,  label: 'Novice',       uciElo: 600,  skillLevel: 1,  movetime: 100,  depth: 2  },
  { elo: 800,  label: 'Élémentaire',  uciElo: 800,  skillLevel: 3,  movetime: 150,  depth: 3  },
  { elo: 1000, label: 'Intermédiaire',uciElo: 1000, skillLevel: 5,  movetime: 200,  depth: 5  },
  { elo: 1200, label: 'Club',         uciElo: 1200, skillLevel: 8,  movetime: 300,  depth: 7  },
  { elo: 1400, label: 'Avancé',       uciElo: 1400, skillLevel: 10, movetime: 500,  depth: 9  },
  { elo: 1600, label: 'Expert',       uciElo: 1600, skillLevel: 12, movetime: 800,  depth: 11 },
  { elo: 1800, label: 'Maître',       uciElo: 1800, skillLevel: 14, movetime: 1200, depth: 13 },
  { elo: 2000, label: 'Maître Int.',  uciElo: 2000, skillLevel: 16, movetime: 2000, depth: 15 },
  { elo: 2200, label: 'Grand Maître', uciElo: 2200, skillLevel: 18, movetime: 3000, depth: null },
  { elo: 2500, label: 'Super GM',     uciElo: 2500, skillLevel: 19, movetime: 5000, depth: null },
  { elo: 3000, label: 'Stockfish Max',uciElo: 3200, skillLevel: 20, movetime: 8000, depth: null },
];

export function getBotProfile(elo: number): BotProfile {
  return BOT_PROFILES.reduce((prev, curr) =>
    Math.abs(curr.elo - elo) < Math.abs(prev.elo - elo) ? curr : prev
  );
}

export function getBotLabel(elo: number): string {
  return getBotProfile(elo).label;
}

export const ELO_MIN = 400;
export const ELO_MAX = 3000;
export const ELO_STEP = 50;
