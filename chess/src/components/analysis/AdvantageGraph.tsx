import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { EvalPoint } from '@/types/chess';

interface AdvantageGraphProps {
  data: EvalPoint[];
  currentIndex: number;
  onMoveClick: (index: number) => void;
}

export function AdvantageGraph({ data, currentIndex, onMoveClick }: AdvantageGraphProps) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    ...d,
    whiteAdv: d.evalPercent - 50,
    blackAdv: d.evalPercent - 50,
  }));

  return (
    <div className="w-full h-24 bg-chess-surface rounded-lg overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
          onClick={(e) => {
            if (e?.activePayload?.[0]) {
              const idx = e.activePayload[0].payload.moveIndex as number;
              onMoveClick(idx);
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <defs>
            <linearGradient id="white-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f0f0f0" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#f0f0f0" stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="black-area" x1="0" y1="1" x2="0" y2="0">
              <stop offset="5%" stopColor="#444444" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#444444" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <XAxis dataKey="moveIndex" hide />
          <YAxis domain={[-50, 50]} hide />
          <ReferenceLine y={0} stroke="#555" strokeWidth={1} />
          {currentIndex >= 0 && (
            <ReferenceLine
              x={currentIndex}
              stroke="#769656"
              strokeWidth={2}
            />
          )}
          <Area
            type="monotone"
            dataKey="whiteAdv"
            stroke="#f0f0f0"
            strokeWidth={1}
            fill="url(#white-area)"
            baseValue={0}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload as typeof chartData[0];
              const v = d.evalCp !== null ? (d.evalCp / 100).toFixed(1) : d.evalMate !== null ? `M${d.evalMate}` : '0.0';
              return (
                <div className="bg-chess-surface border border-chess-border rounded px-2 py-1 text-xs text-chess-text-primary">
                  {d.san} · {parseFloat(v) > 0 ? '+' : ''}{v}
                </div>
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
