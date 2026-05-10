// @ts-nocheck — legacy screen, sera réécrit Sprint 2+
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { CATS } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { TRANSPORT_ICONS } from '../constants/icons';
import { Navigation as NavIcon, AlertCircle, Zap, Shield } from 'lucide-react';
import { L, DATE_FORMAT_BANNER, TRANSPORT_OPTIONS } from '../constants/labels';
import { useAppState } from '../context/AppStateContext';
import { ds } from '../utils/storage';
import { eventsForDate } from '../utils/recurrence';
import { PageWrapper } from '../components/Animated';
import { GPSLogicService } from '../services/gpsLogicService';
import { TrekAlgorithms } from '../utils/trekAlgorithms';
import { LocalDbService } from '../services/localDbService';
import { SpiritualService } from '../utils/spiritualService';
import { useDaily } from '../context/DailyContext';
import { NutritionService } from '../services/nutritionService';
import { LocalAIService } from '../services/localAIService';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';
import { QuickActions } from '../components/ui/QuickActions';
import { BilanZen } from '../components/BilanZen';
import arabicData from '../assets/data/1.json';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_ORDER = ['islam', 'tasks', 'transport', 'planning', 'trajet', 'analyse', 'mental', 'sport', 'mensuration', 'courses', 'macros', 'week'];

// SmartHeader: Contextual intelligence banner
const SmartHeader = ({ db, tasksLate, travelSoon = false, nextPrayer }: any) => {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => (p + 1) % 2), 2000);
    return () => clearInterval(interval);
  }, []);

  const getAlert = () => {
    if (tasksLate > 0) return { icon: AlertCircle, text: `${tasksLate} VECTEURS EN RETARD`, color: '#FF6B6B' };
    if (travelSoon) return { icon: Zap, text: 'DÉPART IMMINENT PRÉVU', color: '#D4AF37' };
    if (nextPrayer) return { icon: Shield, text: `ALERTE : ${nextPrayer.toUpperCase()}`, color: '#D4AF37' };
    return { icon: Zap, text: 'SYSTÈME NOMADE OPÉRATIONNEL', color: '#D4AF37' };
  };

  const alert = getAlert();
  const Icon = alert.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 p-6 bg-awan-bg-highlight/30 rounded-awan-3xl border border-white/5 flex flex-row items-center gap-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-awan-gold/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
      
      <div className="relative">
        <div className={`w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center bg-white/5 ${pulse ? 'opacity-100' : 'opacity-80'} transition-opacity shadow-inner`}>
          <Icon size={24} color={alert.color} />
        </div>
        {pulse === 1 && (
          <motion.div 
            layoutId="pulse"
            className="absolute inset-0 rounded-2xl border border-awan-gold/40"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.3, opacity: 0 }}
          />
        )}
      </div>
      <div className="flex-1">
        <span className="text-[10px] text-awan-gold font-black block mb-1 tracking-[0.4em] uppercase">STATUT RÉSEAU</span>
        <span className="text-base font-bold tracking-widest uppercase truncate block text-awan-tx font-mono" >{alert.text}</span>
      </div>
    </motion.div>
  );
};

export default function DashboardScreen({ navigate }) {
  const { db, cfg, transportMode, setTransportMode, transportModeSelectedAt, jitFactor } = useAppState();
  const { getEntriesByDate } = useDaily();
  const theme = useTheme();
  const [order] = useState(DEFAULT_ORDER);
  const scrollRef = useRef(null);

  const activeTransportMode = useMemo(() => {
    const TWELVE_HOURS = 12 * 3600 * 1000;
    if (Date.now() - transportModeSelectedAt > TWELVE_HOURS) {
      return cfg?.defaultTransport || 'car';
    }
    return transportMode;
  }, [transportMode, transportModeSelectedAt, cfg?.defaultTransport]);

  const { tasksLate, tasksTotal } = useMemo(() => {
    const allTasks = db?.tasks || [];
    const todayStr = ds(new Date());
    const matchedToday = allTasks.filter(t => !t.done && t.date === todayStr).length;
    const matchedLate = allTasks.filter(t => !t.done && t.date < todayStr).length;
    return { tasksToday: matchedToday, tasksLate: matchedLate, tasksTotal: matchedToday + matchedLate };
  }, [db?.tasks]);

  const todayEvents = useMemo(() => {
    if (!db) return [];
    return eventsForDate(db, ds(new Date())).filter(e => e.time);
  }, [db]);

  if (!db) return <div className="flex-1 flex items-center justify-center bg-awan-bg text-awan-tx-mute font-mono uppercase tracking-widest">{L.state.loading}</div>;

  const renderWidget = (key) => {
    const todayStr = ds(new Date());
    switch (key) {
      case 'tasks':
        return (
          <Card 
            title={L.dash.widgets.tasks} 
            value={tasksTotal}
            subtitle={tasksLate > 0 ? `${tasksLate} EN RETARD` : 'À JOUR'}
            onPress={() => navigate('Tasks')} 
            highlight={tasksLate > 0}
          />
        );
      case 'transport':
        return (
          <Card title={L.dash.widgets.transport}>
            <div className="flex flex-row gap-2 mt-2">
              {TRANSPORT_OPTIONS.map(opt => {
                const Icon = TRANSPORT_ICONS[opt.key];
                const active = activeTransportMode === opt.key;
                return (
                  <Touch 
                    key={opt.key} 
                    className={`flex-1 flex flex-col items-center p-3 rounded-awan-md border transition-all ${active ? 'bg-awan-bg-highlight border-awan-gold-active' : 'bg-awan-bg-soft border-white/5'}`}
                    onPress={() => setTransportMode(opt.key)}
                  >
                    <Icon size={20} color={active ? theme.selected : theme.text} />
                    <span className={`text-[9px] mt-1 uppercase font-bold tracking-widest ${active ? 'text-awan-gold-active' : 'text-awan-tx-mute'}`}>{opt.label}</span>
                  </Touch>
                );
              })}
            </div>
          </Card>
        );
      case 'planning':
        return (
          <Card title={L.dash.widgets.planning} onPress={() => navigate('Planning')}>
            <div className="mt-1 space-y-2">
              {todayEvents.length > 0 ? todayEvents.map(ev => (
                <div key={ev.id} className="flex flex-row items-center gap-3">
                  <div className="w-1 h-4 rounded-full" style={{ backgroundColor: ev.color || theme.title }} />
                  <span className="text-xs font-mono text-awan-tx-dim">{ev.time}</span>
                  <span className="text-sm font-medium flex-1 truncate">{ev.title}</span>
                </div>
              )) : <span className="awan-value text-xs italic opacity-50">{L.state.nothingToday}</span>}
            </div>
          </Card>
        );
      case 'trajet':
        const dist = 8.5; 
        const now = new Date();
        const travelModeKey = activeTransportMode;
        const travelTime = GPSLogicService.estimateTravelTime(dist, now, travelModeKey);
        const eventTime = new Date();
        eventTime.setHours(15, 0, 0);
        const isApiDue = GPSLogicService.shouldUseAPI(eventTime, travelTime, jitFactor);
        const ttl = TrekAlgorithms.calculateTimeToLeave(eventTime, travelTime, 10);
        const chantiers = LocalDbService.getPois().filter(p => p.category === 'CHANTIER');
        const topChantier = chantiers.length > 0 ? chantiers[0] : null;
        const travelHours = travelTime / 60;
        const collationConseil = LocalAIService.predictCollation(travelHours);

        return (
          <Card title="UNITÉ DE LOGISTIQUE" onPress={() => navigate('Trajet')}>
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-row items-center justify-between">
                <div className="flex flex-row items-center gap-3">
                  <NavIcon size={20} color={theme.selected} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold font-mono">{travelTime} MIN</span>
                      <div className={`px-2 py-0.5 rounded-full text-[8px] font-bold border ${isApiDue ? 'bg-awan-gold-active/20 border-awan-gold-active text-awan-gold' : 'bg-white/5 border-white/10 text-awan-tx-mute'}`}>
                        {isApiDue ? 'API LIVE' : 'OFFLINE JIT'}
                      </div>
                    </div>
                    <span className="awan-label text-[9px]">DEST: BUREAU • {travelModeKey}</span>
                  </div>
                </div>
                <div className="bg-awan-gold-active/10 p-3 rounded-awan-lg border border-awan-gold-active/20 items-end flex flex-col min-w-[80px]">
                  <span className="text-[8px] font-bold text-awan-gold-active tracking-tighter mb-1 lowercase">départ tactique</span>
                  <span className="text-xl font-bold font-mono text-awan-gold">
                    {String(ttl.getHours()).padStart(2,'0')}:{String(ttl.getMinutes()).padStart(2,'0')}
                  </span>
                </div>
              </div>

              <div className="bg-awan-bg-soft/50 p-2 rounded-awan-md border border-white/5">
                <span className="text-[10px] text-awan-tx-mute italic leading-tight">
                  <span className="font-bold text-awan-gold mr-1">IA LOGISTIQUE |</span> {collationConseil}
                </span>
              </div>
              
              {topChantier ? (
                <div className="flex flex-row items-center gap-3 bg-awan-status-warn/10 border border-awan-status-warn/20 p-3 rounded-awan-lg">
                  <div className="w-1 h-6 bg-awan-status-warn rounded-full" />
                  <div>
                    <span className="awan-label text-[8px] text-awan-status-warn">{L.dash.widgets.activeMission}</span>
                    <span className="text-xs font-bold block">{topChantier.name.toUpperCase()}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 py-2 px-3 rounded-awan-md flex items-center justify-center opacity-50">
                  <span className="awan-label text-[8px]">{L.dash.widgets.noMission}</span>
                </div>
              )}
            </div>
          </Card>
        );
      case 'analyse':
        const bAll = getEntriesByDate(ds(new Date()));
        const bNut = bAll.filter(e => e.module === 'nutrition');
        const bMacrosTot = NutritionService.calculateDailyTotal(bNut);
        const bHist = db.metrics?.history || [];
        const bWeight = bHist.length > 0 ? parseFloat(bHist[0].weight) : 80;
        const bBmr = NutritionService.calculateBMR(bWeight, 180, 25, 'm');
        const bTdee = NutritionService.calculateTDEE(bBmr, 'active');
        const zenText = LocalAIService.auditPhase(bAll, bMacrosTot.kcal, bTdee);

        return (
          <BilanZen 
            summary={zenText} 
            loading={false} 
            onRefresh={() => {}} 
          />
        );
      case 'sport':
        const todayWorkout = (db.workoutLogs || []).find(l => l.date === todayStr);
        return (
          <Card 
            title={L.dash.widgets.sport} 
            value={todayWorkout ? `${Math.floor(todayWorkout.duration / 60)} MIN` : undefined}
            subtitle={todayWorkout ? todayWorkout.name.toUpperCase() : L.sport.noSess}
            onPress={() => navigate('Sport')} 
          />
        );
      case 'mental':
        return (
          <Card 
            title="ANALYSE COGNITIVE" 
            value="82%"
            subtitle="FOCUS OPTIMAL"
            onPress={() => navigate('Mental')}
          >
            <div className="flex flex-row items-center gap-2 mt-1">
               <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-awan-gold w-[82%] opacity-60" />
               </div>
               <span className="text-[10px] font-mono text-awan-tx-mute">SYNC</span>
            </div>
          </Card>
        );
      case 'mensuration':
        const mHistory = db.metrics?.history || [];
        const latest = mHistory.length > 0 ? mHistory.sort((a,b) => b.date.localeCompare(a.date))[0] : null;
        return (
          <Card title="MESURES" onPress={() => navigate('Mensuration')}>
            {latest ? (
              <div className="flex flex-row justify-between items-end mt-2">
                <div>
                  <span className="text-3xl font-bold font-mono tabular-nums leading-none">{latest.weight}</span>
                  <span className="text-xs font-mono ml-1 text-awan-tx-mute">KG</span>
                  <span className="block text-[10px] text-awan-tx-mute mt-1 font-mono">{latest.date}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold font-mono text-awan-gold-active leading-none">{latest.body_fat_pct}%</span>
                  <span className="block awan-label text-[8px] mt-1">{L.analyse.fatMass}</span>
                </div>
              </div>
            ) : (
              <span className="awan-value text-xs italic">{L.mensuration.noData}</span>
            )}
          </Card>
        );
      case 'macros':
        const macrosToday = ds(new Date());
        const allE = getEntriesByDate(macrosToday);
        const nutE = allE.filter(e => e.module === 'nutrition');
        const macrosTot = NutritionService.calculateDailyTotal(nutE);
        const mHist = db.metrics?.history || [];
        const userWeight = mHist.length > 0 ? parseFloat(mHist[0].weight) : 80;
        const bmr = NutritionService.calculateBMR(userWeight, 180, 25, 'm');
        const tdee = NutritionService.calculateTDEE(bmr, 'active');
        const target = NutritionService.calculateTargetMacros(tdee, 'maintain', userWeight);

        return (
          <Card title={L.dash.widgets.macros} onPress={() => navigate('Nutrition')}>
            <div className="mt-2 space-y-3">
              <div className="flex flex-row justify-between items-end">
                <div className="space-y-1">
                  <span className="text-2xl font-bold font-mono tabular-nums leading-none">{macrosTot.kcal}</span>
                  <span className="text-xs font-mono text-awan-tx-mute ml-1">/ {target.kcal} KCAL</span>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <span className="block text-[10px] font-mono text-awan-tx-mute uppercase tracking-tighter">prot</span>
                    <span className="text-xs font-bold font-mono">{macrosTot.p}<span className="text-[10px] ml-0.5 opacity-50">g</span></span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-mono text-awan-tx-mute uppercase tracking-tighter">gluc</span>
                    <span className="text-xs font-bold font-mono">{macrosTot.c}<span className="text-[10px] ml-0.5 opacity-50">g</span></span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-mono text-awan-tx-mute uppercase tracking-tighter">lip</span>
                    <span className="text-xs font-bold font-mono">{macrosTot.f}<span className="text-[10px] ml-0.5 opacity-50">g</span></span>
                  </div>
                </div>
              </div>
              <div className="h-1.5 bg-awan-bg-soft rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full transition-all duration-500 ${macrosTot.kcal > target.kcal ? 'bg-awan-status-error' : 'bg-awan-gold-active'}`} 
                  style={{ width: `${Math.min(100, (macrosTot.kcal / target.kcal) * 100)}%` }} 
                />
              </div>
            </div>
          </Card>
        );
      case 'islam':
        const pt = SpiritualService.getPrayerTimes();
        const nextPrayerName = SpiritualService.translatePrayer(pt.next);
        const timeDiff = pt.timeForNext ? Math.floor((pt.timeForNext.getTime() - Date.now()) / 60000) : 0;
        const h = Math.floor(timeDiff / 60);
        const m = timeDiff % 60;
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
        const word = arabicData[dayOfYear % arabicData.length];

        return (
          <Card title="UNITÉ SPIRITUELLE" onPress={() => navigate('Islam')} highlight>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="bg-awan-bg-soft/80 p-3 rounded-awan-lg border border-white/5 shadow-inner">
                <span className="awan-label text-[8px] text-awan-gold-active mb-1 block">PROCHAINE : {nextPrayerName}</span>
                <span className="text-xl font-bold font-mono text-awan-gold tabular-nums">{h}H {m}M</span>
              </div>
              <div className="bg-awan-bg-soft/80 p-3 rounded-awan-lg border border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-2xl text-awan-gold-active font-bold leading-tight mb-1">{word.ar}</span>
                <span className="awan-label text-[8px] opacity-70 truncate w-full">{word.fr}</span>
              </div>
            </div>
          </Card>
        );
      case 'week':
        return (
          <Card title={L.dash.widgets.week} onPress={() => navigate('Planning')} className="opacity-80">
            <span className="awan-value text-xs">{L.dash.widgets.weekRemaining}</span>
          </Card>
        );
      default: return null;
    }
  };

  const pt = useMemo(() => SpiritualService.getPrayerTimes(), []);
  const nextPrayerName = useMemo(() => SpiritualService.translatePrayer(pt.next), [pt.next]);

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView 
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <div className="flex justify-between items-end mb-10">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-awan-gold tracking-[0.5em] mb-1">TERMINAL PRINCIPAL</span>
            <Heading 
              level={1} 
              className="mb-0 text-left uppercase" 
              subtitle={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            >
              VECTEUR ALPHA
            </Heading>
          </div>
          <div className="flex flex-col items-end">
             <div className="bg-awan-gold/10 px-2 py-0.5 rounded border border-awan-gold/20 mb-1">
                <span className="text-[8px] font-black text-awan-gold tracking-widest uppercase">SYSTÈME LIVE</span>
             </div>
             <span className="text-[10px] font-mono font-bold text-awan-tx-mute">
               V.{db?.version || '1.0'}
             </span>
          </div>
        </div>

        <SmartHeader 
          db={db} 
          tasksLate={tasksLate} 
          travelSoon={false} 
          nextPrayer={nextPrayerName} 
        />

        <div className="flex flex-col gap-4">
            {order.map(key => (
              <div key={key} className="mb-4">
                {renderWidget(key)}
              </div>
            ))}
        </div>
      </ScrollView>
      <QuickActions onNavigate={navigate} />
    </PageWrapper>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
