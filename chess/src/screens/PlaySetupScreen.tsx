import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/Button';
import { TIME_CONTROLS } from '@/constants/timeControls';
import { BOT_PROFILES, ELO_MIN, ELO_MAX } from '@/constants/elo';
import type { PieceColor, TimeControl } from '@/types/chess';

export default function PlaySetupScreen() {
  const navigate = useNavigate();
  const startGame = useGameStore((s) => s.startGame);

  const [color, setColor] = useState<PieceColor | 'random'>('white' as unknown as PieceColor);
  const [elo, setElo] = useState(1200);
  const [tc, setTc] = useState<TimeControl>(TIME_CONTROLS[6]!);

  const nearestProfile = BOT_PROFILES.reduce((p, c) =>
    Math.abs(c.elo - elo) < Math.abs(p.elo - elo) ? c : p
  );

  function handleStart() {
    let chosenColor: PieceColor;
    if (color === 'random' as unknown as PieceColor) {
      chosenColor = Math.random() < 0.5 ? 'w' : 'b';
    } else {
      chosenColor = color === ('white' as unknown as PieceColor) ? 'w' : 'b';
    }
    startGame(chosenColor, elo, tc);
    navigate('/game');
  }

  return (
    <div className="screen-enter p-4 space-y-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-chess-text-primary pt-2">Nouvelle partie</h1>

      {/* Color selection */}
      <div className="space-y-2">
        <label className="text-sm text-chess-text-secondary font-medium">Couleur</label>
        <div className="grid grid-cols-3 gap-2">
          {(['white', 'random', 'black'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setColor(c as unknown as PieceColor)}
              className={`py-3 rounded-lg border transition-colors text-sm font-medium
                ${color === (c as unknown as PieceColor)
                  ? 'border-chess-accent bg-chess-accent/10 text-chess-accent'
                  : 'border-chess-border bg-chess-surface text-chess-text-secondary hover:border-chess-accent/50'}
              `}
            >
              {c === 'white' ? '♔ Blanc' : c === 'black' ? '♚ Noir' : '🎲 Aléat.'}
            </button>
          ))}
        </div>
      </div>

      {/* ELO Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm text-chess-text-secondary font-medium">Niveau bot</label>
          <div className="flex items-center gap-2">
            <span className="text-chess-text-primary font-bold text-lg">{elo}</span>
            <span className="text-xs text-chess-text-muted bg-chess-surface-alt px-2 py-0.5 rounded">
              {nearestProfile.label}
            </span>
          </div>
        </div>
        <input
          type="range"
          min={ELO_MIN}
          max={ELO_MAX}
          step={50}
          value={elo}
          onChange={(e) => setElo(parseInt(e.target.value))}
          className="w-full accent-chess-accent cursor-pointer"
        />
        <div className="flex justify-between text-xs text-chess-text-muted">
          <span>400</span>
          <span>1200</span>
          <span>2000</span>
          <span>3000</span>
        </div>
      </div>

      {/* Time control */}
      <div className="space-y-2">
        <label className="text-sm text-chess-text-secondary font-medium">Cadence</label>
        <div className="grid grid-cols-2 gap-2">
          {TIME_CONTROLS.map((t) => (
            <button
              key={t.label}
              onClick={() => setTc(t)}
              className={`py-2 px-3 rounded-lg border transition-colors text-sm text-left
                ${tc.label === t.label
                  ? 'border-chess-accent bg-chess-accent/10 text-chess-accent'
                  : 'border-chess-border bg-chess-surface text-chess-text-secondary hover:border-chess-accent/50'}
              `}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Button fullWidth size="lg" onClick={handleStart}>
        Lancer la partie
      </Button>
    </div>
  );
}
