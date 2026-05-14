import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, TextInput as RNTextInput, Modal, Alert, Switch } from 'react-native';

const TextInput = RNTextInput as React.ComponentType<any>;
import { motion, AnimatePresence } from 'motion/react';
import { useAppState } from '../context/AppStateContext';
import { useDaily } from '../context/DailyContext';
import { ds, uid } from '../utils/storage';
import { BiometricsService } from '../services/biometricsService';
import { useMeasurementStore } from '../hooks/useMeasurementStore';
import { HumanAnatomySvg } from '../HumanAnatomySvg';
import { ChevronLeft, Save, Activity, Ruler, MoreVertical, TrendingUp, Info, Zap, Shield, Target, Plus, X, Fingerprint, Database } from 'lucide-react';
import { PageWrapper } from '../components/Animated';
import { DailyCanvas } from '../components/DailyCanvas';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';

export default function MensurationScreen() {
  const { navigate } = useAppState() as any;
  const { getEntriesByDate, addEntry, removeEntry, moveEntry } = useDaily();

  const measureStore = useMeasurementStore();

  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [gender, setGender] = useState('man');
  const [age, setAge] = useState('30');
  const [isScanning, setIsScanning] = useState(false);

  const todayStr = ds(new Date());
  const allEntries = getEntriesByDate(todayStr);
  const mensurationEntries = allEntries.filter((e: any) => e.module === 'mesure');
  const [inputText, setInputText] = useState('');

  const blankEntry = {
    date: todayStr, weight: 0, bpm_rest: 0, body_fat_pct: 0,
    measurements: {} as Record<string, number>, skinfolds: {} as Record<string, number>,
  };

  const [currentEntry, setCurrentEntry] = useState(blankEntry);

  // S2.1 — Filtre fenêtre temporelle pour le graphique
  const [weightFilter, setWeightFilter] = useState<30 | 90 | 365>(30);

  // S2.3 — Objectifs configurables (persistés en localStorage)
  const GOALS_KEY = 'awan.mensuration.goals';
  const [targetWeightKg, setTargetWeightKg] = useState<string>('');
  const [targetBodyFatPct, setTargetBodyFatPct] = useState<string>('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GOALS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { targetWeightKg?: number; targetBodyFatPct?: number };
        if (typeof parsed.targetWeightKg === 'number') setTargetWeightKg(String(parsed.targetWeightKg));
        if (typeof parsed.targetBodyFatPct === 'number') setTargetBodyFatPct(String(parsed.targetBodyFatPct));
      }
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      const payload: { targetWeightKg?: number; targetBodyFatPct?: number } = {};
      const w = parseFloat(targetWeightKg.replace(',', '.'));
      const bf = parseFloat(targetBodyFatPct.replace(',', '.'));
      if (!isNaN(w) && w > 0) payload.targetWeightKg = w;
      if (!isNaN(bf) && bf > 0) payload.targetBodyFatPct = bf;
      try { localStorage.setItem(GOALS_KEY, JSON.stringify(payload)); } catch { /* quota */ }
    }, 800);
    return () => clearTimeout(handle);
  }, [targetWeightKg, targetBodyFatPct]);

  // S2.1 — Données du graphique filtrées par fenêtre temporelle
  const weightSeries = useMemo(() => {
    const cutoff = Date.now() - weightFilter * 24 * 60 * 60 * 1000;
    return measureStore.history
      .filter(e => e.weight > 0)
      .filter(e => new Date(e.date).getTime() >= cutoff)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [measureStore.history, weightFilter]);

  // S2.2 — Tendance hebdomadaire (delta sur ~7 jours)
  const weeklyTrend = useMemo(() => {
    const series = measureStore.history.filter(e => e.weight > 0).slice().sort((a, b) => a.date.localeCompare(b.date));
    if (series.length < 1) return null;
    const last = series[series.length - 1];
    if (!last) return null;
    const lastTs = new Date(last.date).getTime();
    const sevenDaysAgo = lastTs - 7 * 24 * 60 * 60 * 1000;
    // closest entry at-or-before 7d ago
    let baseline = series[0];
    for (const e of series) {
      const ts = new Date(e.date).getTime();
      if (ts <= sevenDaysAgo) baseline = e;
    }
    if (!baseline || baseline.date === last.date) return null;
    return { delta: last.weight - baseline.weight, current: last.weight };
  }, [measureStore.history]);

  // S2.3 — Progression vers le poids cible
  const goalProgress = useMemo(() => {
    const target = parseFloat(targetWeightKg.replace(',', '.'));
    const current = currentEntry.weight || weeklyTrend?.current || 0;
    if (!current || isNaN(target) || target <= 0) return null;
    const diff = Math.abs(current - target);
    const ratio = diff / target;
    let status: 'ok' | 'warn' | 'error' = 'error';
    if (ratio <= 0.02) status = 'ok';
    else if (ratio <= 0.10) status = 'warn';
    const pct = Math.min(100, Math.max(0, (1 - ratio) * 100));
    return { target, current, status, pct, diff };
  }, [targetWeightKg, currentEntry.weight, weeklyTrend]);

  // S2.4 — Suppression mesure
  const handleDeleteMeasurement = (date: string) => {
    Alert.alert('Suppression', `Supprimer la mesure du ${date} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => { void measureStore.remove(date); } },
    ]);
  };

  // load today's entry from store once store is ready
  useEffect(() => {
    if (!measureStore.loading) {
      const todayEntry = measureStore.getByDate(todayStr);
      if (todayEntry) setCurrentEntry(todayEntry);
    }
  }, [measureStore.loading]);

  const persistEntry = (entry: typeof blankEntry) => {
    measureStore.save({ v: 1, id: uid(), savedAt: Date.now(), ...entry });
  };

  const handleAddEntry = () => {
    if (!inputText.trim()) return;
    addEntry(todayStr, {
      id: uid(),
      timestamp: Date.now(),
      module: 'mesure',
      rawText: inputText,
      tokens: [{ label: 'BIO', value: 'CAPTURE', icon: 'dna' }]
    });
    setInputText('');
  };

  const handlePartPress = (partId: string) => {
    setSelectedPart(partId);
    setInputValue(currentEntry.measurements[partId]?.toString() || '');
  };

  const saveMeasurement = () => {
    if (!selectedPart) return;
    const val = parseFloat(inputValue.replace(',', '.'));
    if (isNaN(val)) return Alert.alert('Error', 'Invalid numeric signal.');
    const newEntry = { ...currentEntry };
    newEntry.measurements = { ...newEntry.measurements, [selectedPart]: val };
    setCurrentEntry(newEntry);
    persistEntry(newEntry);
    setSelectedPart(null);
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 1500);
  };

  const updateWeight = (val: string) => {
    const w = parseFloat(val);
    const newEntry = { ...currentEntry, weight: isNaN(w) ? 0 : w };
    setCurrentEntry(newEntry);
    persistEntry(newEntry);
  };

  const updateBpm = (val: string) => {
    const b = parseInt(val);
    const newEntry = { ...currentEntry, bpm_rest: isNaN(b) ? 0 : b };
    setCurrentEntry(newEntry);
    persistEntry(newEntry);
  };

  const updateMeasurement = (part: string, val: string) => {
    const v = parseFloat(val.replace(',', '.'));
    const newEntry = { ...currentEntry };
    if (isNaN(v) || v <= 0) {
      const next = { ...newEntry.measurements };
      delete next[part];
      newEntry.measurements = next;
    } else {
      newEntry.measurements = { ...newEntry.measurements, [part]: v };
    }
    setCurrentEntry(newEntry);
    persistEntry(newEntry);
  };

  const updateSkinfold = (site: string, val: string) => {
    const v = parseFloat(val);
    const newEntry = { ...currentEntry };
    newEntry.skinfolds = { ...newEntry.skinfolds, [site]: isNaN(v) ? 0 : v };
    const s = newEntry.skinfolds;
    const a = parseInt(age);
    const bf = gender === 'man'
      ? BiometricsService.jacksonPollock3Men(s['chest'] ?? 0, s['abdomen'] ?? 0, s['thigh'] ?? 0, a)
      : BiometricsService.jacksonPollock3Women(s['triceps'] ?? 0, s['suprailiac'] ?? 0, s['thigh'] ?? 0, a);
    newEntry.body_fat_pct = parseFloat(bf.toFixed(2));
    setCurrentEntry(newEntry);
    persistEntry(newEntry);
  };

  const updatedParts = Object.keys(currentEntry.measurements);

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <div className="px-6 pt-4 pb-2">
        <ScreenHeader tag="BODY · MENSURATION" title="DÉTAILS PHYSIQUES" />
      </div>
      
      <div className="flex flex-row justify-between bg-black/40 p-5 rounded-awan-3xl border border-white/5 shadow-inner mx-6 mb-6">
         <div className="flex-1 items-center border-r border-white/5">
            <span className="text-[9px] font-black text-awan-gold tracking-widest uppercase mb-2">Poids</span>
            <div className="flex flex-row items-baseline gap-1">
              <TextInput 
                className="text-3xl font-black text-awan-tx font-mono w-20 text-center outline-none"
                keyboardType="numeric" 
                value={currentEntry.weight?.toString()} 
                onChangeText={updateWeight}
                placeholder="00.0"
                placeholderTextColor="rgba(255,255,255,0.1)"
              />
              <span className="text-[10px] font-bold text-awan-tx-mute font-mono">KG</span>
            </div>
         </div>
         <div className="flex-1 items-center border-r border-white/5">
            <span className="text-[9px] font-black text-awan-gold tracking-widest uppercase mb-2">BPM Repos</span>
            <div className="flex flex-row items-baseline gap-1">
              <TextInput 
                className="text-3xl font-black text-awan-tx font-mono w-16 text-center outline-none"
                keyboardType="numeric" 
                value={currentEntry.bpm_rest?.toString()} 
                onChangeText={updateBpm}
                placeholder="00"
                placeholderTextColor="rgba(255,255,255,0.1)"
              />
               <span className="text-[10px] font-bold text-awan-tx-mute font-mono">BPM</span>
            </div>
         </div>
         <div className="flex-1 items-center">
            <span className="text-[9px] font-black text-awan-gold tracking-widest uppercase mb-2">Grasse</span>
            <div className="flex flex-row items-baseline gap-1">
              <span className="text-3xl font-black text-awan-tx font-mono">{currentEntry.body_fat_pct || '--.-'}</span>
              <span className="text-[10px] font-bold text-awan-tx-mute font-mono">%</span>
            </div>
         </div>
      </div>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
        <div className="p-6">
          {/* S2.1 — Évolution du poids (SVG inline) */}
          <div className="mb-10">
            <div className="flex flex-row justify-between items-end mb-4 px-1">
              <Heading level={4} mono subtitle="Courbe temporelle" className="mb-0">ÉVOLUTION DU POIDS</Heading>
              <div className="bg-black/40 p-1 rounded-xl border border-white/5 flex flex-row gap-1">
                {([30, 90, 365] as const).map(d => (
                  <Touch
                    key={d}
                    onPress={() => setWeightFilter(d)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${weightFilter === d ? 'bg-awan-gold' : ''}`}
                  >
                    <span className={`text-[9px] font-black uppercase tracking-widest ${weightFilter === d ? 'text-black' : 'text-awan-tx-mute'}`}>
                      {d === 365 ? '1AN' : `${d}J`}
                    </span>
                  </Touch>
                ))}
              </div>
            </div>
            <Card className="p-5 bg-white/3 border-white/5" variant="flat">
              {weightSeries.length < 2 ? (
                <div className="h-[100px] flex items-center justify-center">
                  <span className="text-[10px] font-black text-awan-tx-mute tracking-widest uppercase">Pas assez de données</span>
                </div>
              ) : (() => {
                const ws = weightSeries;
                const xs = ws.map(e => new Date(e.date).getTime());
                const ys = ws.map(e => e.weight);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);
                const rangeX = maxX - minX || 1;
                const rangeY = maxY - minY || 1;
                const points = ws.map((e, i) => {
                  const x = ((xs[i]! - minX) / rangeX) * 290 + 5;
                  const y = 90 - ((ys[i]! - minY) / rangeY) * 80;
                  return { x, y, v: ys[i]!, date: e.date };
                });
                const polyline = points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
                return (
                  <div>
                    <div className="flex flex-row justify-between items-baseline mb-2">
                      <span className="text-[9px] font-bold text-awan-tx-mute font-mono">MIN {minY.toFixed(1)} KG</span>
                      <span className="text-[9px] font-bold text-awan-tx-mute font-mono">MAX {maxY.toFixed(1)} KG</span>
                    </div>
                    <svg viewBox="0 0 300 100" width="100%" height="100" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke="var(--color-awan-gold)"
                        strokeOpacity={0.7}
                        strokeWidth={1.5}
                        points={polyline}
                      />
                      {points.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--color-awan-gold)" />
                      ))}
                    </svg>
                    {/* S2.2 — Tendance hebdomadaire */}
                    {weeklyTrend && (
                      <div className="mt-4 pt-4 border-t border-white/5 flex flex-row items-center justify-between">
                        <span className="text-[9px] font-black text-awan-tx-mute tracking-widest uppercase">Tendance 7J</span>
                        {(() => {
                          const d = weeklyTrend.delta;
                          if (d === 0) {
                            return (
                              <span className="text-sm font-mono font-bold" style={{ color: 'var(--color-awan-tx-mute)' }}>
                                → Stable
                              </span>
                            );
                          }
                          const isUp = d > 0;
                          const arrow = isUp ? '▲' : '▼';
                          const sign = isUp ? '+' : '−';
                          const color = isUp ? 'var(--color-awan-status-error)' : 'var(--color-awan-status-ok)';
                          return (
                            <span className="text-sm font-mono font-bold" style={{ color }}>
                              {arrow} {sign}{Math.abs(d).toFixed(1)} kg
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })()}
            </Card>
          </div>

          {/* S2.3 — Objectifs configurables */}
          <div className="mb-10">
            <Heading level={4} mono subtitle="Cibles opératives" className="mb-6">OBJECTIFS</Heading>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Card className="p-4 bg-white/5 border-white/5" variant="flat">
                <span className="text-[9px] font-black text-awan-gold tracking-widest mb-2 block uppercase">Poids cible</span>
                <div className="flex flex-row items-baseline gap-2">
                  <TextInput
                    className="text-2xl font-black text-awan-tx font-mono flex-1 outline-none"
                    keyboardType="numeric"
                    value={targetWeightKg}
                    onChangeText={setTargetWeightKg}
                    placeholder="00.0"
                    placeholderTextColor="rgba(255,255,255,0.1)"
                  />
                  <span className="text-[10px] font-bold text-awan-tx-mute font-mono">KG</span>
                </div>
              </Card>
              <Card className="p-4 bg-white/5 border-white/5" variant="flat">
                <span className="text-[9px] font-black text-awan-gold tracking-widest mb-2 block uppercase">% Graisse cible</span>
                <div className="flex flex-row items-baseline gap-2">
                  <TextInput
                    className="text-2xl font-black text-awan-tx font-mono flex-1 outline-none"
                    keyboardType="numeric"
                    value={targetBodyFatPct}
                    onChangeText={setTargetBodyFatPct}
                    placeholder="00.0"
                    placeholderTextColor="rgba(255,255,255,0.1)"
                  />
                  <span className="text-[10px] font-bold text-awan-tx-mute font-mono">%</span>
                </div>
              </Card>
            </div>
            {goalProgress && (
              <Card className="p-4 bg-white/3 border-white/5" variant="flat">
                <div className="flex flex-row justify-between items-baseline mb-2">
                  <span className="text-[9px] font-black text-awan-tx-mute tracking-widest uppercase">Progression poids</span>
                  <span className="text-[10px] font-mono font-bold text-awan-tx">
                    {goalProgress.current.toFixed(1)} / {goalProgress.target.toFixed(1)} KG
                  </span>
                </div>
                <div className="h-[4px] bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${goalProgress.pct}%`,
                      backgroundColor:
                        goalProgress.status === 'ok' ? 'var(--color-awan-status-ok)'
                        : goalProgress.status === 'warn' ? 'var(--color-awan-status-warn)'
                        : 'var(--color-awan-status-error)',
                    }}
                  />
                </div>
                <span
                  className="text-[8px] font-mono font-bold mt-2 block uppercase tracking-widest"
                  style={{
                    color:
                      goalProgress.status === 'ok' ? 'var(--color-awan-status-ok)'
                      : goalProgress.status === 'warn' ? 'var(--color-awan-status-warn)'
                      : 'var(--color-awan-status-error)',
                  }}
                >
                  Δ {goalProgress.diff.toFixed(1)} KG
                </span>
              </Card>
            )}
          </div>

          {/* Quick Log Input */}
          <div className="mb-10">
            <Card className="flex-row items-center gap-4 bg-white/5 border-white/10 p-5" variant="flat">
               <div className="bg-black/40 border border-white/5 rounded-2xl flex-1 px-4 py-2 flex flex-row items-center">
                  <Database size={14} className="text-awan-gold mr-3 opacity-50" />
                  <TextInput
                    className="flex-1 h-10 text-sm font-bold text-awan-tx outline-none"
                    placeholder="BIO-LOG: CAPTURE..."
                    placeholderTextColor="rgba(255,255,255,0.15)"
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleAddEntry}
                  />
               </div>
               <Touch onPress={handleAddEntry} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center border border-white/10">
                  <Plus size={20} className="text-awan-gold" />
               </Touch>
            </Card>
          </div>

          <div className="flex flex-row gap-6 mb-10">
             {/* Anatomical Map */}
             <div className="flex-[3]">
                <div className="flex flex-row justify-between items-end mb-4 px-1">
                  <Heading level={4} mono subtitle="Zone de Scan" className="mb-0">CARTOGRAPHIE</Heading>
                  <div className="flex flex-row gap-1">
                    <div className="w-1 h-1 bg-awan-gold rounded-full" />
                    <div className="w-1 h-1 bg-white/10 rounded-full" />
                  </div>
                </div>
                <div className="bg-awan-surface/30 rounded-awan-3xl border border-white/10 p-6 relative overflow-hidden shadow-2xl">
                   {isScanning && (
                      <motion.div 
                        initial={{ top: -20 }}
                        animate={{ top: '120%' }}
                        transition={{ duration: 1.5, ease: "linear" }}
                        className="absolute left-0 right-0 h-0.5 bg-awan-gold shadow-[0_0_15px_#D4AF37] z-10 pointer-events-none"
                      />
                   )}
                   <HumanAnatomySvg onPartPress={handlePartPress} updatedParts={updatedParts as any} />
                   <div className="mt-6 p-3 bg-black/40 rounded-xl border border-white/5 flex flex-row items-center gap-3">
                      <Target size={14} className="text-awan-gold" />
                      <span className="text-[10px] font-black text-awan-tx-mute uppercase tracking-widest leading-tight">Toucher une zone pour injection biométrique</span>
                   </div>
                </div>
             </div>

             {/* Caliper & Tools */}
             <div className="flex-[2] space-y-6">
                <div>
                   <span className="text-[10px] font-black text-awan-gold tracking-[0.4em] mb-3 block uppercase opacity-50">Config</span>
                   <div className="bg-black/40 p-1.5 rounded-2xl border border-white/5 flex flex-col gap-2">
                      <Touch 
                        className={`py-3 items-center rounded-xl transition-all ${gender === 'man' ? 'bg-awan-gold' : ''}`}
                        onPress={() => setGender('man')}
                      >
                         <span className={`text-[9px] font-black uppercase tracking-widest ${gender === 'man' ? 'text-black' : 'text-awan-tx-mute'}`}>HOMME</span>
                      </Touch>
                      <Touch 
                        className={`py-3 items-center rounded-xl transition-all ${gender === 'woman' ? 'bg-awan-gold' : ''}`}
                        onPress={() => setGender('woman')}
                      >
                         <span className={`text-[9px] font-black uppercase tracking-widest ${gender === 'woman' ? 'text-black' : 'text-awan-tx-mute'}`}>FEMME</span>
                      </Touch>
                   </div>
                </div>

                <Card className="p-4 bg-white/3 border-white/5" variant="flat">
                   <span className="text-[9px] font-black text-awan-gold tracking-widest mb-2 block uppercase">ÂGE SYS</span>
                   <TextInput 
                     className="text-2xl font-black text-awan-tx font-mono outline-none"
                     keyboardType="numeric" 
                     value={age} 
                     onChangeText={setAge}
                   />
                </Card>

                <div>
                   <span className="text-[10px] font-black text-awan-gold tracking-[0.4em] mb-3 block uppercase opacity-50">Scanner Pli</span>
                   <div className="space-y-3">
                    {(gender === 'man' ? ['chest', 'abdomen', 'thigh'] : ['triceps', 'suprailiac', 'thigh']).map(site => (
                      <Card key={site} className="p-4 bg-white/5 border-white/5" variant="flat">
                        <span className="text-[8px] font-black text-awan-tx-mute uppercase tracking-widest mb-1.5 block">{site}</span>
                        <div className="flex flex-row items-baseline gap-2">
                          <TextInput
                             className="text-xl font-black text-awan-tx font-mono flex-1 outline-none"
                             keyboardType="numeric"
                             value={currentEntry.skinfolds[site]?.toString() || ''}
                             onChangeText={(v: string) => updateSkinfold(site, v)}
                             placeholder="00.0"
                             placeholderTextColor="rgba(255,255,255,0.1)"
                          />
                          <span className="text-[9px] font-bold text-awan-gold font-mono">MM</span>
                        </div>
                      </Card>
                    ))}
                   </div>
                </div>
             </div>
          </div>

          {/* Mesures corporelles manuelles (saisie complète) */}
          <div className="mb-10">
            <Heading level={4} mono subtitle="Mesures circonférentielles (cm)" className="mb-6">MENSURATIONS</Heading>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: 'neck', label: 'COU' },
                { key: 'shoulders', label: 'ÉPAULES' },
                { key: 'chest', label: 'POITRINE' },
                { key: 'waist', label: 'TOUR DE TAILLE' },
                { key: 'hips', label: 'HANCHES' },
                { key: 'arm_left', label: 'BRAS G.' },
                { key: 'arm_right', label: 'BRAS D.' },
                { key: 'forearm_left', label: 'AVANT-BRAS G.' },
                { key: 'forearm_right', label: 'AVANT-BRAS D.' },
                { key: 'thigh_left', label: 'CUISSE G.' },
                { key: 'thigh_right', label: 'CUISSE D.' },
                { key: 'calf_left', label: 'MOLLET G.' },
                { key: 'calf_right', label: 'MOLLET D.' },
              ] as const).map(({ key, label }) => (
                <Card key={key} className="p-4 bg-white/5 border-white/5" variant="flat">
                  <span className="awan-label mb-2 block">{label}</span>
                  <div className="flex flex-row items-baseline gap-2">
                    <TextInput
                      className="text-xl font-mono font-bold text-awan-tx flex-1 outline-none bg-transparent"
                      keyboardType="decimal-pad"
                      value={currentEntry.measurements[key] !== undefined ? String(currentEntry.measurements[key]) : ''}
                      onChangeText={(v: string) => updateMeasurement(key, v)}
                      placeholder="00.0"
                      placeholderTextColor="rgba(255,255,255,0.1)"
                    />
                    <span className="text-[9px] font-bold text-awan-gold font-mono">CM</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="mb-10">
            <Heading level={4} mono subtitle="Récupération Chrono" className="mb-6">HISTORIQUE DES CAPTURES</Heading>
            <div className="space-y-3">
              {measureStore.history.slice(-5).reverse().map((h) => (
                <Card key={h.date} className="flex-row items-center gap-6 p-5 bg-white/3 border-white/5" variant="flat">
                   <div className="w-10 h-10 rounded-full border border-white/10 items-center justify-center">
                      <span className="text-[8px] font-mono text-awan-tx-mute">{h.date.split('-').slice(1).join('/')}</span>
                   </div>
                   <div className="flex-1">
                      <div className="flex flex-row items-baseline gap-1">
                         <span className="text-xl font-black text-awan-tx font-mono">{h.weight}</span>
                         <span className="text-[9px] font-bold text-awan-tx-mute uppercase">KG</span>
                      </div>
                   </div>
                   <div className="w-px h-8 bg-white/5" />
                   <div className="flex-1 items-end">
                      <div className="flex flex-row items-baseline gap-1">
                         <span className="text-xl font-black text-awan-gold font-mono">{h.body_fat_pct}</span>
                         <span className="text-[9px] font-bold text-awan-tx-mute uppercase">%</span>
                      </div>
                   </div>
                   <Touch
                     onPress={() => handleDeleteMeasurement(h.date)}
                     className="w-8 h-8 rounded-lg items-center justify-center bg-white/5 border border-white/5"
                   >
                     <X size={14} className="text-awan-tx-mute" />
                   </Touch>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </ScrollView>

      {/* Input Modal */}
      <Modal visible={!!selectedPart} transparent animationType="fade">
        <div className="flex-1 bg-black/80 items-center justify-center p-8 backdrop-blur-md">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="w-full max-w-sm bg-awan-bg border border-awan-gold/30 rounded-awan-3xl p-8 shadow-[0_0_50px_rgba(212,175,55,0.2)]"
           >
              <div className="items-center mb-8">
                 <div className="w-16 h-16 rounded-2xl bg-awan-gold/10 flex items-center justify-center mb-4 border border-awan-gold/20">
                    <Target size={32} className="text-awan-gold" />
                 </div>
                 <span className="text-[10px] font-black text-awan-gold tracking-[0.5em] uppercase mb-1">Cible Opérative</span>
                 <Heading level={2} className="mb-0 text-center uppercase tracking-widest">{selectedPart?.replace('_', ' ')}</Heading>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-10 shadow-inner">
                 <span className="text-[10px] font-black text-awan-tx-mute tracking-[0.4em] uppercase mb-3 block text-center">Valeur en CM</span>
                 <TextInput 
                    className="text-5xl font-black text-awan-gold font-mono text-center outline-none"
                    autoFocus 
                    keyboardType="numeric" 
                    value={inputValue} 
                    onChangeText={setInputValue}
                    placeholder="00.0"
                    placeholderTextColor="rgba(212,175,55,0.1)"
                 />
              </div>

              <div className="flex flex-row gap-4">
                 <Touch onPress={() => setSelectedPart(null)} className="flex-1 h-14 rounded-xl items-center justify-center bg-white/5 border border-white/10">
                    <span className="text-xs font-black text-awan-tx-mute tracking-widest uppercase">ANNULER</span>
                 </Touch>
                 <Touch onPress={saveMeasurement} className="flex-[2] h-14 rounded-xl items-center justify-center bg-awan-gold shadow-lg shadow-awan-gold/20">
                    <span className="text-xs font-black text-black tracking-widest uppercase">SYDNC SIGNALS</span>
                 </Touch>
              </div>
           </motion.div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
