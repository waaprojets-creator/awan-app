import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { TRANSPORT_ICONS } from '../constants/icons';
import { AlertCircle, Zap, Shield, CheckCircle2 } from 'lucide-react';
import { L, TRANSPORT_OPTIONS } from '../constants/labels';
import { ds } from '../utils/storage';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';
import { QuickActions } from '../components/ui/QuickActions';
import { BilanZen } from '../components/BilanZen';
import { SpiritualService } from '../utils/spiritualService';
import { LocalAIService } from '../services/localAIService';
import { useMealStore } from '../hooks/useMealStore';
import { useMeasurementStore } from '../hooks/useMeasurementStore';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { usePrayerStore } from '../hooks/usePrayerStore';
import { motion } from 'motion/react';
import type { NavProps } from '../types/nav';
import arabicData from '../assets/data/1.json';

// ── Types ────────────────────────────────────────────────────────────────────

interface PrayerInfo {
  next: string;
  timeForNext: Date | null;
}

// ── SmartHeader ───────────────────────────────────────────────────────────────

interface SmartHeaderProps {
  tasksLate: number;
  nextPrayer: string;
}

function SmartHeader({ tasksLate, nextPrayer }: SmartHeaderProps) {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPulse((p) => (p + 1) % 2), 2000);
    return () => clearInterval(id);
  }, []);

  const getAlert = (): { icon: React.ComponentType<{ size: number; color: string }>; text: string; color: string } => {
    if (tasksLate > 0) return { icon: AlertCircle, text: `${tasksLate} VECTEURS EN RETARD`, color: '#FF6B6B' };
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
        <div
          className={`w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center bg-white/5 transition-opacity shadow-inner ${
            pulse ? 'opacity-100' : 'opacity-80'
          }`}
        >
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
        <span className="text-base font-bold tracking-widest uppercase truncate block text-awan-tx font-mono">
          {alert.text}
        </span>
      </div>
    </motion.div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

const DEFAULT_ORDER = ['islam', 'tasks', 'transport', 'planning', 'sport', 'mensuration', 'macros', 'analyse'];

export default function DashboardScreen({ navigate }: NavProps) {
  const theme = useTheme();
  const today = ds(new Date());
  const [transportMode, setTransportMode] = useState<string>('car');
  const [aiSummary, setAiSummary] = useState('');

  const mealStore = useMealStore(today);
  const measureStore = useMeasurementStore();
  const workoutStore = useWorkoutStore();
  const prayerStore = usePrayerStore(today);

  const prayerInfo = useMemo<PrayerInfo>(() => {
    const pt = SpiritualService.getPrayerTimes() as { next: string; timeForNext: Date | null };
    return { next: pt.next, timeForNext: pt.timeForNext };
  }, []);

  const nextPrayerName = SpiritualService.translatePrayer(prayerInfo.next) as string;

  const timeDiff = prayerInfo.timeForNext
    ? Math.floor((prayerInfo.timeForNext.getTime() - Date.now()) / 60_000)
    : 0;
  const prayerH = Math.floor(timeDiff / 60);
  const prayerM = timeDiff % 60;

  useEffect(() => {
    const latestMeasure = measureStore.history.slice().sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null;
    LocalAIService.generateZenSummary({
      kcalToday: mealStore.totals.kcal,
      prayersDone: prayerStore.doneCount,
      prayersTotal: prayerStore.total,
      lastWorkoutName: workoutStore.sessions.at(-1)?.name ?? null,
      weightKg: latestMeasure?.weight ?? null,
    }).then(setAiSummary);
  }, [mealStore.totals.kcal, prayerStore.doneCount, workoutStore.sessions.length, measureStore.history.length]);

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000);
  const word = (arabicData as Array<{ ar: string; fr: string }>)[dayOfYear % arabicData.length] ?? { ar: '', fr: '' };

  const renderWidget = (key: string): React.ReactNode => {
    switch (key) {
      case 'tasks':
        return (
          <Card
            title={(L as { dash: { widgets: { tasks: string } } }).dash.widgets.tasks}
            value={0}
            subtitle="À JOUR"
            onPress={() => navigate('Tasks')}
          />
        );

      case 'transport':
        return (
          <Card title={(L as { dash: { widgets: { transport: string } } }).dash.widgets.transport}>
            <div className="flex flex-row gap-2 mt-2">
              {(TRANSPORT_OPTIONS as Array<{ key: string; label: string }>).map((opt) => {
                const icons = TRANSPORT_ICONS as Record<string, React.ComponentType<{ size: number; color: string }>>;
                const Icon = icons[opt.key];
                const active = transportMode === opt.key;
                return (
                  <Touch
                    key={opt.key}
                    className={`flex-1 flex flex-col items-center p-3 rounded-awan-md border transition-all ${
                      active ? 'bg-awan-bg-highlight border-awan-gold-active' : 'bg-awan-bg-soft border-white/5'
                    }`}
                    onPress={() => setTransportMode(opt.key)}
                  >
                    {Icon && <Icon size={20} color={active ? theme.selected : theme.text} />}
                    <span
                      className={`text-[9px] mt-1 uppercase font-bold tracking-widest ${
                        active ? 'text-awan-gold-active' : 'text-awan-tx-mute'
                      }`}
                    >
                      {opt.label}
                    </span>
                  </Touch>
                );
              })}
            </div>
          </Card>
        );

      case 'planning':
        return (
          <Card title={(L as { dash: { widgets: { planning: string } } }).dash.widgets.planning} onPress={() => navigate('Planning')}>
            <span className="awan-value text-xs italic opacity-50">
              {(L as { state: { nothingToday: string } }).state.nothingToday}
            </span>
          </Card>
        );

      case 'sport': {
        const lastSession = workoutStore.sessions.at(-1);
        return (
          <Card
            title={(L as { dash: { widgets: { sport: string } } }).dash.widgets.sport}
            subtitle={lastSession ? `${lastSession.name} — ${lastSession.date}` : ((L as { sport: { noSess: string } }).sport?.noSess ?? 'Aucune séance')}
            onPress={() => navigate('Sport')}
          />
        );
      }

      case 'mental':
        return (
          <Card title="ANALYSE COGNITIVE" value="—" subtitle="NON DISPONIBLE" onPress={() => navigate('Mental')} />
        );

      case 'mensuration': {
        const latestM = measureStore.history.slice().sort((a, b) => a.date.localeCompare(b.date)).at(-1);
        return (
          <Card title="MESURES" onPress={() => navigate('Mensuration')}>
            {latestM ? (
              <div className="flex flex-row items-end gap-4 mt-1">
                <div>
                  <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest block mb-0.5">Poids</span>
                  <span className="text-2xl font-black text-awan-gold font-mono tabular-nums">{latestM.weight}<span className="text-xs ml-1 opacity-50">KG</span></span>
                </div>
                {latestM.body_fat_pct != null && (
                  <div>
                    <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest block mb-0.5">MG</span>
                    <span className="text-xl font-black text-awan-tx font-mono tabular-nums">{latestM.body_fat_pct}<span className="text-xs ml-0.5 opacity-50">%</span></span>
                  </div>
                )}
                <span className="text-[9px] font-mono text-awan-tx-mute opacity-50 mb-1">{latestM.date}</span>
              </div>
            ) : (
              <span className="awan-value text-xs italic opacity-50">Aucune mesure</span>
            )}
          </Card>
        );
      }

      case 'macros': {
        const { kcal, p, c, f } = mealStore.totals;
        return (
          <Card title={(L as { dash: { widgets: { macros: string } } }).dash.widgets.macros} onPress={() => navigate('Nutrition')}>
            {kcal > 0 ? (
              <div className="flex flex-row gap-4 mt-1">
                <div>
                  <span className="text-[9px] font-black text-awan-gold uppercase tracking-widest block mb-0.5">KCAL</span>
                  <span className="text-2xl font-black text-awan-gold font-mono tabular-nums">{kcal}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest block mb-0.5">P</span>
                  <span className="text-xl font-black text-awan-tx font-mono">{p}g</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest block mb-0.5">G</span>
                  <span className="text-xl font-black text-awan-tx font-mono">{c}g</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest block mb-0.5">L</span>
                  <span className="text-xl font-black text-awan-tx font-mono">{f}g</span>
                </div>
              </div>
            ) : (
              <span className="awan-value text-xs italic opacity-50">Aucune entrée aujourd'hui</span>
            )}
          </Card>
        );
      }

      case 'analyse':
        return <BilanZen summary={aiSummary || 'Chargement...'} loading={!aiSummary} />;

      case 'islam':
        return (
          <Card title="UNITÉ SPIRITUELLE" onPress={() => navigate('Islam')} highlight>
            <div className="grid grid-cols-3 gap-3 mt-1">
              <div className="bg-awan-bg-soft/80 p-3 rounded-awan-lg border border-white/5 shadow-inner">
                <span className="awan-label text-[8px] text-awan-gold-active mb-1 block">
                  PROCHAINE : {nextPrayerName}
                </span>
                <span className="text-xl font-bold font-mono text-awan-gold tabular-nums">
                  {prayerH}H {prayerM}M
                </span>
              </div>
              <div className="bg-awan-bg-soft/80 p-3 rounded-awan-lg border border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-[8px] font-black text-awan-gold-active tracking-widest uppercase block mb-1">PRIÈRES</span>
                <div className="flex flex-row gap-1 justify-center mb-1">
                  {Array.from({ length: prayerStore.total }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i < prayerStore.doneCount ? 'bg-awan-gold shadow-[0_0_5px_#D4AF37]' : 'bg-white/10'}`} />
                  ))}
                </div>
                <span className="text-xl font-black font-mono text-awan-gold tabular-nums">{prayerStore.doneCount}<span className="text-xs opacity-50">/{prayerStore.total}</span></span>
              </div>
              <div className="bg-awan-bg-soft/80 p-3 rounded-awan-lg border border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-2xl text-awan-gold-active font-bold leading-tight mb-1">{word.ar}</span>
                <span className="awan-label text-[8px] opacity-70 truncate w-full">{word.fr}</span>
              </div>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <ScrollView
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
            subtitle={new Date().toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          >
            VECTEUR ALPHA
          </Heading>
        </div>
        <div className="flex flex-col items-end">
          <div className="bg-awan-gold/10 px-2 py-0.5 rounded border border-awan-gold/20 mb-1">
            <span className="text-[8px] font-black text-awan-gold tracking-widest uppercase">SYSTÈME LIVE</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-awan-tx-mute">{today}</span>
        </div>
      </div>

      <SmartHeader tasksLate={0} nextPrayer={nextPrayerName} />

      <div className="flex flex-col gap-4">
        {DEFAULT_ORDER.map((key) => (
          <div key={key} className="mb-4">
            {renderWidget(key)}
          </div>
        ))}
      </div>
      <QuickActions onNavigate={navigate} />
    </ScrollView>
  );
}
