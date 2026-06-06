import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';

const SvgCircle = Circle as any;
const SvgPath = Path as any;

const FREE_KEY = '_free';

interface ActivityEntry { key: string; value: number; color: string; label: string }
interface ActivityTabProps { data: ActivityEntry[] }

export function ActivityTab({ data }: ActivityTabProps) {
  const theme = useTheme();
  const activeMinutes = data.reduce((acc, d) => d.key !== FREE_KEY ? acc + d.value : acc, 0);
  const freeMinutes = data.find(d => d.key === FREE_KEY)?.value ?? 0;

  return (
    <View style={{ gap: 32 }}>
      <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
        <PieChart data={data} size={220} />
        <View style={{ marginTop: 40, width: '100%' }}>
          <Legend data={data} />
        </View>
      </Card>

      <View style={s.grid2}>
        <Card variant="flat" style={[{ flex: 1 }, { borderColor: 'rgba(212,175,55,0.30)', backgroundColor: 'rgba(212,175,55,0.05)' }]}>
          <Text style={[s.label, { color: theme.selected, marginBottom: 8 }]}>Flux Actif</Text>
          <View style={s.row}>
            <Text style={[s.bigNum, { color: theme.title }]}>{Math.round(activeMinutes / 60)}</Text>
            <Text style={[s.unit, { color: theme.mute }]}>H</Text>
          </View>
        </Card>
        <Card variant="flat" style={{ flex: 1 }}>
          <Text style={[s.label, { color: theme.mute, marginBottom: 8 }]}>Veille System</Text>
          <View style={s.row}>
            <Text style={[s.bigNum, { color: theme.title }]}>{Math.round(freeMinutes / 60)}</Text>
            <Text style={[s.unit, { color: theme.mute }]}>H</Text>
          </View>
        </Card>
      </View>
    </View>
  );
}

function PieChart({ data, size = 180 }: { data: ActivityEntry[]; size?: number }) {
  const theme = useTheme();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const cx = size / 2; const cy = size / 2; const r = size / 2 - 15;

  if (total === 0) {
    return <Svg width={size} height={size}><SvgCircle cx={cx} cy={cy} r={r} fill={theme.borderSoft} /></Svg>;
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
  const theme = useTheme();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <View style={{ gap: 16, paddingHorizontal: 16 }}>
      {data.filter(d => d.value > 0).slice(0, 6).map(d => (
        <View key={d.key} style={[s.legendRow, { borderBottomColor: 'rgba(255,255,255,0.05)' }]}>
          <View style={s.legendLeft}>
            <View style={[s.dot, { backgroundColor: d.color }]} />
            <Text style={[s.label, { color: theme.title }]}>{d.label}</Text>
          </View>
          <View style={s.legendRight}>
            <Text style={[s.labelMono, { color: theme.selected }]}>{Math.round(d.value / 60)}H</Text>
            <View style={[s.bar, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
              <View style={{ height: '100%', width: `${(d.value / total) * 100}%`, backgroundColor: theme.selected, opacity: 0.5 }} />
            </View>
            <Text style={[s.pct, { color: theme.mute }]}>{Math.round((d.value / total) * 100)}%</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid2: { flexDirection: 'row', gap: 16 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bigNum: { fontFamily: FontMono, fontSize: 30, fontWeight: Fw.display },
  unit: { fontFamily: FontMono, fontSize: Fs.sm },
  label: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.body_033 },
  labelMono: { fontFamily: FontMono, fontSize: Fs.md },
  pct: { fontFamily: FontMono, fontSize: Fs.sm, width: 32, textAlign: 'right' },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingBottom: 8 },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legendRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bar: { width: 48, height: 4, borderRadius: 2, overflow: 'hidden' },
});
