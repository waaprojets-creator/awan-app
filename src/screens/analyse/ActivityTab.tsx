import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';

const SvgCircle = Circle as any;
const SvgPath = Path as any;

const FREE_KEY = '_free';

interface ActivityEntry {
  key: string;
  value: number;
  color: string;
  label: string;
}

interface ActivityTabProps {
  data: ActivityEntry[];
}

export function ActivityTab({ data }: ActivityTabProps) {
  const theme = useTheme();
  const activeMinutes = data.reduce((acc, d) => d.key !== FREE_KEY ? acc + d.value : acc, 0);
  const freeMinutes = data.find(d => d.key === FREE_KEY)?.value ?? 0;

  return (
    <div className="space-y-8">
      <Card className="items-center py-10 relative overflow-hidden bg-white/5 border-white/5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-awan-gold/5 rounded-full blur-3xl -mr-16 -mt-16" />
        <PieChart data={data} size={220} />
        <div className="mt-10 w-full">
          <Legend data={data} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-awan-gold/30 bg-awan-gold/5 p-6" variant="flat">
          <span className="text-awan-md font-black text-awan-gold tracking-widest mb-2 block uppercase">Flux Actif</span>
          <span className="text-3xl font-black text-awan-tx font-mono">
            {Math.round(activeMinutes / 60)}<span className="text-sm ml-1 opacity-50">H</span>
          </span>
        </Card>
        <Card className="border-white/5 bg-white/5 p-6" variant="flat">
          <span className="text-awan-md font-black text-awan-tx-mute tracking-widest mb-2 block uppercase">Veille System</span>
          <span className="text-3xl font-black text-awan-tx font-mono">
            {Math.round(freeMinutes / 60)}<span className="text-sm ml-1 opacity-50">H</span>
          </span>
        </Card>
      </div>
    </div>
  );
}

function PieChart({ data, size = 180 }: { data: ActivityEntry[]; size?: number }) {
  const theme = useTheme();
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2; const cy = size / 2; const r = size / 2 - 15;

  if (total === 0) {
    return <Svg width={size} height={size}><SvgCircle cx={cx} cy={cy} r={r} fill="var(--color-awan-border-soft)" /></Svg>;
  }

  let cumulative = 0;
  return (
    <Svg width={size} height={size}>
      <SvgCircle cx={cx} cy={cy} r={r} fill="transparent" stroke={theme.title} strokeWidth="1" opacity={0.05} />
      {data.filter(d => d.value > 0).map((d, i) => {
        const start = (cumulative / total) * 2 * Math.PI;
        cumulative += d.value;
        const end = (cumulative / total) * 2 * Math.PI;
        const filtered = data.filter(x => x.value > 0);
        if (filtered.length === 1) return <SvgCircle key={i} cx={cx} cy={cy} r={r} fill={d.color} />;
        const x1 = cx + r * Math.sin(start); const y1 = cy - r * Math.cos(start);
        const x2 = cx + r * Math.sin(end); const y2 = cy - r * Math.cos(end);
        const large = end - start > Math.PI ? 1 : 0;
        return <SvgPath key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={d.color} stroke={theme.bg} strokeWidth="2" />;
      })}
      <SvgCircle cx={cx} cy={cy} r={r * 0.75} fill={theme.bg} />
    </Svg>
  );
}

function Legend({ data }: { data: ActivityEntry[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="grid grid-cols-1 gap-4 px-4">
      {data.filter(d => d.value > 0).slice(0, 6).map(d => (
        <div key={d.key} className="flex flex-row items-center justify-between border-b border-white/5 pb-2">
          <div className="flex flex-row items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-awan-md font-black text-awan-tx uppercase tracking-widest">{d.label}</span>
          </div>
          <div className="flex flex-row items-center gap-3">
            <span className="text-awan-md font-mono text-awan-gold">{Math.round(d.value / 60)}H</span>
            <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-awan-gold opacity-50" style={{ width: `${(d.value / total) * 100}%` }} />
            </div>
            <span className="text-awan-sm font-mono text-awan-tx-mute w-8 text-right">{Math.round((d.value / total) * 100)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
