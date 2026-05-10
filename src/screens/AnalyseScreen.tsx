// @ts-nocheck — legacy screen, sera réécrit Sprint 2+
import React, { useMemo, useState, useEffect } from 'react';
import { View, Dimensions, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, G, Line } from 'react-native-svg';
import { 
  startOfDay, endOfDay, subDays, subMonths, subYears, 
  parseISO, format, startOfWeek, eachDayOfInterval 
} from 'date-fns';
import { CATS } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { ds } from '../utils/storage';
import { eventsForDate } from '../utils/recurrence';
import { useAppState } from '../context/AppStateContext';
import { useDaily } from '../context/DailyContext';
import { NutritionService } from '../services/nutritionService';
import { LocalAIService } from '../services/localAIService';
import { PageWrapper, StaggerItem, AnimatePresence } from '../components/Animated';
import { Activity, Dumbbell, Ruler, Flame, TrendingUp, Search, Info, Shield, Zap } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';
import { BilanZen } from '../components/BilanZen';
import { motion } from 'motion/react';

const FREE_KEY = '_free';
const FREE_COLOR = 'rgba(212, 175, 55, 0.05)';
const FREE_LABEL = 'Temps libre';

const TABS = [
  { id: 'activity', label: 'Flux Horaire', Icon: Activity },
  { id: 'nutrition', label: 'Biosphère', Icon: Flame },
  { id: 'muscu', label: 'Projection', Icon: Dumbbell },
  { id: 'measures', label: 'Biométrie', Icon: Ruler },
];

const RANGES = [
  { id: 'day', label: '24H' },
  { id: 'week', label: '07D' },
  { id: 'month', label: '30D' },
];

const SvgLine = Line as any;
const SvgCircle = Circle as any;
const SvgPath = Path as any;
const SvgRect = Rect as any;
const SvgG = G as any;

export default function AnalyseScreen() {
  const insets = useSafeAreaInsets();
  const { db } = useAppState();
  const { getEntriesByDate } = useDaily();
  const theme = useTheme();
  const [tab, setTab] = useState('activity');
  const [range, setRange] = useState('week');
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // ... (useMemos remain correct logic-wise, just need UI refinement)
  const categories = useMemo(() => {
    const base = { ...CATS };
    if (db?.categories) {
      db.categories.forEach((c: any) => { base[c.key] = { l: c.label, c: c.color }; });
    }
    return base;
  }, [db?.categories]);

  const getColorForKey = (key: string) => (key === FREE_KEY ? FREE_COLOR : categories[key]?.c || theme.title);
  const getLabelForKey = (key: string) => (key === FREE_KEY ? FREE_LABEL : categories[key]?.l || key);

  const interval = useMemo(() => {
    const now = new Date();
    let start = startOfDay(now);
    let end = endOfDay(now);
    if (range === 'week') start = startOfWeek(subDays(now, 6), { weekStartsOn: 1 });
    if (range === 'month') start = subMonths(now, 1);
    return { start, end };
  }, [range]);

  const activityData = useMemo(() => {
    if (!db) return [];
    const totals: Record<string, number> = {};
    let totalMinutes = 0;
    const days = eachDayOfInterval(interval);
    days.forEach(day => {
      const dateStr = ds(day);
      const evs = eventsForDate(db, dateStr);
      evs.forEach(ev => {
        if (!ev.time) return;
        totals[ev.category || 'perso'] = (totals[ev.category || 'perso'] || 0) + (ev.duration || 30);
        totalMinutes += (ev.duration || 30);
      });
    });
    totals[FREE_KEY] = Math.max(0, days.length * 1440 - totalMinutes);
    return Object.entries(totals).map(([key, value]) => ({
      key, value, color: getColorForKey(key), label: getLabelForKey(key),
    })).sort((a,b) => b.value - a.value);
  }, [db, categories, interval]);

  const muscuStats = useMemo(() => {
    if (!db?.workoutLogs) return [];
    return (db.workoutLogs || []).filter((log: any) => {
        const d = parseISO(log.date);
        return d >= interval.start && d <= interval.end;
      }).map((log: any) => {
        let weight = 0; let sets = 0;
        log.exercises.forEach((ex: any) => ex.sets.forEach((s: any) => {
          weight += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
          sets += 1;
        }));
        return { label: format(parseISO(log.date), 'dd/MM'), weight, sets };
      });
  }, [db?.workoutLogs, interval]);

  const nutritionStats = useMemo(() => {
    const days = eachDayOfInterval(interval);
    let avgKcal = 0; let avgP = 0; let count = 0;
    const data = days.map(day => {
      const tot = NutritionService.calculateDailyTotal(getEntriesByDate(ds(day)).filter(e => e.module === 'nutrition'));
      if (tot.kcal > 0) { avgKcal += tot.kcal; avgP += tot.p; count++; }
      return { label: format(day, 'dd/MM'), kcal: tot.kcal, p: tot.p };
    });
    return { data, avgKcal: count > 0 ? Math.round(avgKcal/count) : 0, avgP: count > 0 ? Math.round(avgP/count) : 0, count };
  }, [interval, getEntriesByDate]);

  useEffect(() => {
    LocalAIService.generateZenSummary(db).then(setAiSummary);
  }, [db]);

  if (!db) return null;

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
        <div className="px-6 pt-4 pb-4">
           <Heading level={1} subtitle="Intelligence de Situation">ANALYSE TACTIQUE</Heading>
           
           <div className="mt-8">
             <BilanZen 
                summary={aiSummary} 
                loading={aiLoading} 
                onRefresh={() => { setAiLoading(true); LocalAIService.generateZenSummary(db).then(s => {setAiSummary(s); setAiLoading(false);}); }} 
             />
           </div>
        </div>

        {/* Tab Control */}
        <div className="px-6 mb-8">
           <div className="bg-awan-bg-highlight/30 p-1.5 rounded-3xl border border-white/5 flex flex-row shadow-2xl">
              {TABS.map(({ id, label, Icon }) => (
                <Touch 
                  key={id} 
                  className={`flex-1 py-3 items-center justify-center rounded-2xl transition-all ${tab === id ? 'bg-awan-gold shadow-lg' : ''}`}
                  onPress={() => setTab(id)}
                >
                  <Icon size={18} className={tab === id ? 'text-black' : 'text-awan-tx-mute'} />
                  <span className={`text-[8px] font-black uppercase tracking-widest mt-1 ${tab === id ? 'text-black' : 'text-awan-tx-mute'}`}>{label}</span>
                </Touch>
              ))}
           </div>
        </div>

        {/* Range Control */}
        <div className="px-6 mb-8 flex flex-row justify-center gap-3">
           {RANGES.map(r => (
             <Touch 
               key={r.id} 
               className={`px-6 py-1.5 rounded-full border transition-all ${range === r.id ? 'bg-awan-gold-active/20 border-awan-gold' : 'bg-white/5 border-white/5'}`}
               onPress={() => setRange(r.id)}
             >
               <span className={`text-[10px] font-black tracking-[0.2em] ${range === r.id ? 'text-awan-gold' : 'text-white/20'}`}>{r.label}</span>
             </Touch>
           ))}
        </div>

        <AnimatePresence mode="wait">
           <motion.div 
             key={tab + range}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             className="px-6"
           >
             {tab === 'activity' && (
                <div className="space-y-8">
                  <Card className="items-center py-10 relative overflow-hidden bg-white/5 border-white/5">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-awan-gold/5 rounded-full blur-3xl -mr-16 -mt-16" />
                     <PieChart data={activityData} size={220} />
                     <div className="mt-10 w-full">
                        <Legend data={activityData} />
                     </div>
                  </Card>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-awan-gold/30 bg-awan-gold/5 p-6" variant="flat">
                       <span className="text-[10px] font-black text-awan-gold tracking-widest mb-2 block uppercase">Flux Actif</span>
                       <span className="text-3xl font-black text-awan-tx font-mono">{Math.round(activityData.reduce((acc, d) => d.key !== FREE_KEY ? acc+d.value : acc, 0) / 60)}<span className="text-sm ml-1 opacity-50">H</span></span>
                    </Card>
                    <Card className="border-white/5 bg-white/5 p-6" variant="flat">
                       <span className="text-[10px] font-black text-awan-tx-mute tracking-widest mb-2 block uppercase">Veille System</span>
                       <span className="text-3xl font-black text-awan-tx font-mono">{Math.round(activityData.find(d => d.key === FREE_KEY)?.value / 60 || 0)}<span className="text-sm ml-1 opacity-50">H</span></span>
                    </Card>
                  </div>
                </div>
             )}

             {tab === 'nutrition' && (
                <div className="space-y-8">
                   <div className="grid grid-cols-2 gap-4">
                      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
                         <div className="flex flex-row items-center gap-2 mb-3">
                            <Flame size={12} className="text-awan-gold" />
                            <span className="text-[9px] font-black text-awan-gold tracking-widest uppercase">Moy. Kcal</span>
                         </div>
                         <span className="text-3xl font-black text-awan-tx font-mono tracking-tighter">{nutritionStats.avgKcal}</span>
                      </Card>
                      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
                         <div className="flex flex-row items-center gap-2 mb-3">
                            <Activity size={12} className="text-awan-status-error" />
                            <span className="text-[9px] font-black text-awan-status-error tracking-widest uppercase">Moy. Prot</span>
                         </div>
                         <span className="text-3xl font-black text-awan-tx font-mono tracking-tighter">{nutritionStats.avgP}<span className="text-sm ml-1">G</span></span>
                      </Card>
                   </div>

                   <Card className="p-6 bg-white/5 border-white/5" variant="flat">
                      <Heading level={4} mono subtitle="Énergie">FLUX CALORIQUE</Heading>
                      <div className="h-[200px] mt-6">
                         <BarChart data={nutritionStats.data} dataKey="kcal" color={theme.title} />
                      </div>
                   </Card>
                </div>
             )}

             {tab === 'muscu' && (
                <div className="space-y-8">
                   <Card className="p-6 bg-white/5 border-white/5" variant="flat">
                      <Heading level={4} mono subtitle="Force de Projection">VOLUME TOTAL (KG)</Heading>
                      <div className="h-[200px] mt-6">
                         <BarChart data={muscuStats} dataKey="weight" color={theme.title} />
                      </div>
                   </Card>
                   <Card className="p-6 bg-white/5 border-white/5" variant="flat">
                      <Heading level={4} mono subtitle="Densité Opérative">SÉRIES COMPLÉTÉES</Heading>
                      <div className="h-[200px] mt-6">
                         <BarChart data={muscuStats} dataKey="sets" color="#FFF" />
                      </div>
                   </Card>
                </div>
             )}

             {tab === 'measures' && (
                <div className="space-y-4">
                  {(db.mesures || []).slice(-10).reverse().map((m: any, i: number) => (
                    <Card key={i} className="flex-row items-center justify-between p-5 bg-white/5 border-white/5" variant="flat">
                      <div className="flex flex-row items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-awan-gold/10 flex items-center justify-center border border-awan-gold/20">
                           <Ruler size={18} className="text-awan-gold" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-awan-tx-mute uppercase tracking-widest mb-1 block">Capture biometric: {m.date}</span>
                          <span className="text-sm font-black text-awan-tx uppercase tracking-tight">{m.label || 'MESURE'}</span>
                        </div>
                      </div>
                      <div className="flex flex-row items-baseline gap-1">
                        <span className="text-2xl font-black text-awan-gold">{m.value}</span>
                        <span className="text-[10px] font-bold text-awan-tx-mute uppercase font-mono">{m.unit || 'CM'}</span>
                      </div>
                    </Card>
                  ))}
                </div>
             )}
           </motion.div>
        </AnimatePresence>
      </ScrollView>
    </PageWrapper>
  );
}

function BarChart({ data, dataKey, color }: { data: any[], dataKey: string, color: string }) {
  const width = Dimensions.get('window').width - 88;
  const height = 180;
  const padding = 20;
  const barWidth = Math.max(4, Math.min(24, (width - padding * 2) / Math.max(data.length, 1) - 6));
  const maxVal = Math.max(...data.map(d => d[dataKey]), 1);
  
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Svg width={width} height={height}>
        {[0, 0.5, 1].map((v, i) => (
          <SvgLine 
            key={i}
            x1={0}
            y1={height - padding - v * (height - padding * 2)}
            x2={width}
            y2={height - padding - v * (height - padding * 2)}
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="1"
          />
        ))}

        {data.map((d, i) => {
          const barHeight = (d[dataKey] / maxVal) * (height - padding * 2);
          const x = i * (width / data.length) + (width / data.length - barWidth) / 2;
          const y = height - padding - barHeight;
          return (
            <SvgG key={i}>
              <Rect x={x} y={y} width={barWidth} height={barHeight} fill={color} rx={2} />
              {d[dataKey] > 0 && (
                <Rect x={x} y={y} width={barWidth} height={2} fill="#FFF" opacity={0.5} />
              )}
            </SvgG>
          );
        })}
      </Svg>
    </View>
  );
}

function PieChart({ data, size = 180 }: { data: any[], size?: number }) {
  const theme = useTheme();
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2; const cy = size / 2; const r = size / 2 - 15;
  if (total === 0) return <Svg width={size} height={size}><Circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.05)" /></Svg>;
  let cumulative = 0;
  return (
    <Svg width={size} height={size}>
      {/* Glow Effect */}
      <Circle cx={cx} cy={cy} r={r} fill="transparent" stroke={theme.title} strokeWidth="1" opacity={0.05} />
      
      {data.filter(d => d.value > 0).map((d, i) => {
        const start = (cumulative / total) * 2 * Math.PI;
        cumulative += d.value;
        const end = (cumulative / total) * 2 * Math.PI;
        if (data.filter(x => x.value > 0).length === 1) return <SvgCircle key={i} cx={cx} cy={cy} r={r} fill={d.color} />;
        const x1 = cx + r * Math.sin(start); const y1 = cy - r * Math.cos(start);
        const x2 = cx + r * Math.sin(end); const y2 = cy - r * Math.cos(end);
        const large = end - start > Math.PI ? 1 : 0;
        return <SvgPath key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={d.color} stroke={theme.bg} strokeWidth="2" />;
      })}
      <Circle cx={cx} cy={cy} r={r * 0.75} fill={theme.bg} />
      <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
         <span className="text-[10px] font-black text-awan-gold tracking-[0.4em] opacity-30">VECTEUR</span>
      </View>
    </Svg>
  );
}

function Legend({ data }: { data: any[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="grid grid-cols-1 gap-4 px-4">
      {data.filter(d => d.value > 0).slice(0, 6).map(d => (
        <div key={d.key} className="flex flex-row items-center justify-between border-b border-white/5 pb-2">
          <div className="flex flex-row items-center gap-3">
            <div className="w-2 h-2 rounded-full shadow-[0_0_5px_rgba(255,255,255,0.2)]" style={{ backgroundColor: d.color }} />
            <span className="text-[10px] font-black text-awan-tx uppercase tracking-widest">{d.label}</span>
          </div>
          <div className="flex flex-row items-center gap-3">
            <span className="text-[10px] font-mono text-awan-gold">{Math.round(d.value / 60)}H</span>
            <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-awan-gold opacity-50" style={{ width: `${(d.value / total) * 100}%` }} />
            </div>
            <span className="text-[9px] font-mono text-awan-tx-mute w-8 text-right">{Math.round((d.value / total) * 100)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ Icon, label }: { Icon: any, label: string }) {
  return (
    <div className="items-center py-20 opacity-30">
      <Icon size={48} className="text-awan-tx-mute mb-4" />
      <span className="text-xs font-bold uppercase tracking-widest text-awan-tx-mute">{label}</span>
    </div>
  );
}

