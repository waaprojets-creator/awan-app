import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, ScrollView, TextInput as RNTextInput, Alert } from 'react-native';

const TextInput = RNTextInput as React.ComponentType<any>;
import { motion, AnimatePresence } from 'motion/react';
import { useAppState } from '../context/AppStateContext';
import { useDaily } from '../context/DailyContext';
import { ds, uid } from '../utils/storage';
import { BiometricsService } from '../services/biometricsService';
import { analyzeSymmetry, asymmetryToHeatmapValue } from '../services/symmetryService';
import { safeStorage } from '../utils/safeStorage';
import { useWeightStore } from '../hooks/useWeightStore';
import { useMeasurementStore } from '../hooks/useMeasurementStore';
import { BodyMeasureSvg, BODY_MEASURES } from '../components/BodyMeasureSvg';
import { BodySvg } from '../components/BodySvg';
import type { MuscleId } from '../components/BodySvg';
import { Planner } from '../modules/planning/api';
import { getStorage } from '../data/storage/storageService';
import { ChevronLeft, ChevronRight, Target, Plus, X, Database, AlertTriangle } from 'lucide-react';
import { PageWrapper } from '../components/Animated';
import { DailyCanvas } from '../components/DailyCanvas';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';

// ISAK Level 1 skinfold sites (bilateral where applicable)
const SKINFOLD_SITES = [
  { key: 'triceps',         label: 'Triceps',        bilateral: true },
  { key: 'subscapular',     label: 'Sous-scapulaire', bilateral: false },
  { key: 'biceps',          label: 'Biceps',          bilateral: false },
  { key: 'suprailiac',      label: 'Supra-iliaque',   bilateral: false },
  { key: 'supraspinal',     label: 'Supra-épineux',   bilateral: false },
  { key: 'abdominal',       label: 'Abdominal',       bilateral: false },
  { key: 'thigh_anterior',  label: 'Cuisse antérieure', bilateral: false },
  { key: 'calf_medial',     label: 'Mollet médial',    bilateral: false },
] as const;

// Bilateral circumference pairs
const BILATERAL_MEASURES = [
  { base: 'arm',     label: 'BRAS',      leftKey: 'arm_left',     rightKey: 'arm_right' },
  { base: 'forearm', label: 'AVANT-BRAS', leftKey: 'forearm_left', rightKey: 'forearm_right' },
  { base: 'thigh',   label: 'CUISSE',    leftKey: 'thigh_left',   rightKey: 'thigh_right' },
  { base: 'calf',    label: 'MOLLET',    leftKey: 'calf_left',    rightKey: 'calf_right' },
] as const;

export default function MensurationScreen() {
  const { navigate } = useAppState() as any;
  const { getEntriesByDate, addEntry, removeEntry, moveEntry } = useDaily();

  const measureStore = useMeasurementStore();
  const weightStore = useWeightStore();
  const [weightInput, setWeightInput] = useState('');

  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [gender, setGender] = useState('man');
  const [age, setAge] = useState('30');

  // A7: profile completeness check
  const profileIncomplete = useMemo(() => {
    try {
      const raw = safeStorage.get('awan.nutrition.profile');
      if (!raw) return true;
      const p = JSON.parse(raw) as Record<string, unknown>;
      return !p.heightCm || !p.age || !p.gender;
    } catch { return true; }
  }, []);

  // A6: create recurring anthropo planning tasks (idempotent)
  useEffect(() => {
    getStorage().then(storage => {
      const planner = new Planner(storage);
      void planner.createSystemTask({
        id: 'anthropo.biweekly',
        title: 'Mesures bimensuelles',
        domain: 'anthropo',
        durationMin: 15,
        recurringDays: 14,
        priority: 1,
      });
      void planner.createSystemTask({
        id: 'anthropo.quarterly',
        title: 'Bilan trimestriel complet',
        domain: 'anthropo',
        durationMin: 45,
        recurringDays: 90,
        priority: 2,
      });
    });
  }, []);

  // Date navigation
  const todayStr = ds(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const shiftDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    const next = ds(d);
    if (next <= todayStr) setSelectedDate(next);
  };

  const allEntries = getEntriesByDate(selectedDate);
  const [inputText, setInputText] = useState('');

  const blankEntry = {
    date: selectedDate, bpm_rest: 0, body_fat_pct: 0,
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

  // Helper : poids le plus récent ≤ date (depuis weightStore)
  const getWeightKg = useMemo(() => (date: string): number => {
    const sorted = weightStore.entries.filter(e => e.date <= date).sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0]?.weightKg ?? 0;
  }, [weightStore.entries]);

  // S2.1 — Données du graphique filtrées par fenêtre temporelle
  const weightSeries = useMemo(() => {
    const cutoff = Date.now() - weightFilter * 24 * 60 * 60 * 1000;
    return weightStore.entries
      .filter(e => new Date(e.date).getTime() >= cutoff)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [weightStore.entries, weightFilter]);

  // S2.2 — Tendance hebdomadaire (delta sur ~7 jours)
  const weeklyTrend = useMemo(() => {
    const series = weightStore.entries.slice().sort((a, b) => a.date.localeCompare(b.date));
    if (series.length < 1) return null;
    const last = series[series.length - 1];
    if (!last) return null;
    const lastTs = new Date(last.date).getTime();
    const sevenDaysAgo = lastTs - 7 * 24 * 60 * 60 * 1000;
    let baseline = series[0];
    for (const e of series) {
      if (new Date(e.date).getTime() <= sevenDaysAgo) baseline = e;
    }
    if (!baseline || baseline.date === last.date) return null;
    return { delta: last.weightKg - baseline.weightKg, current: last.weightKg };
  }, [weightStore.entries]);

  // S2.3 — Progression vers le poids cible
  const goalProgress = useMemo(() => {
    const target = parseFloat(targetWeightKg.replace(',', '.'));
    const current = getWeightKg(selectedDate) || weeklyTrend?.current || 0;
    if (!current || isNaN(target) || target <= 0) return null;
    const diff = Math.abs(current - target);
    const ratio = diff / target;
    let status: 'ok' | 'warn' | 'error' = 'error';
    if (ratio <= 0.02) status = 'ok';
    else if (ratio <= 0.10) status = 'warn';
    const pct = Math.min(100, Math.max(0, (1 - ratio) * 100));
    return { target, current, status, pct, diff };
  }, [targetWeightKg, getWeightKg, selectedDate, weeklyTrend]);

  // Indices corporels (FFMI, WHR, WHtR, Navy BF%, IMC, FFMI normalisé, BF% fourchette)
  const indices = useMemo(() => {
    const sorted = measureStore.history.slice().sort((a, b) => b.date.localeCompare(a.date));
    const last = sorted[0];
    if (!last) return null;
    const profileRaw = safeStorage.get('awan.nutrition.profile');
    const profile = profileRaw ? (() => { try { return JSON.parse(profileRaw); } catch { return {}; } })() : {};
    const heightCm: number = typeof profile.heightCm === 'number' ? profile.heightCm : 0;
    if (!heightCm) return null;
    const ageYears: number = typeof profile.age === 'number' ? profile.age : 30;
    const sex: 'male' | 'female' = profile.gender === 'woman' ? 'female' : 'male';
    const hm = heightCm / 100;
    const waist: number | undefined = last.measurements?.['waist'] ?? last.measurements?.['taille'];
    const hip: number | undefined = last.measurements?.['hip'] ?? last.measurements?.['hanches'];
    const neck: number | undefined = last.measurements?.['neck'] ?? last.measurements?.['cou'];
    const weight: number = getWeightKg(last.date);
    const bfPct: number = last.body_fat_pct;
    const lbm = (weight > 0 && bfPct > 0) ? weight * (1 - bfPct / 100) : null;
    const ffmi = lbm ? parseFloat((lbm / (hm * hm)).toFixed(1)) : null;
    const whr = (waist && hip) ? parseFloat((waist / hip).toFixed(2)) : null;
    const whtr = waist ? parseFloat((waist / heightCm).toFixed(2)) : null;
    const navyBF = (neck && waist && !isNaN(BiometricsService.navyBFPct({ heightCm, waistCm: waist, neckCm: neck, sex })))
      ? BiometricsService.navyBFPct({ heightCm, waistCm: waist, neckCm: neck, sex })
      : null;
    // A4: IMC + FFMI normalisé
    const imcVal = weight > 0 ? BiometricsService.imc(weight, heightCm) : null;
    const ffmiNorm = (lbm !== null && bfPct > 0) ? BiometricsService.ffmiNormalized(weight, heightCm, bfPct, sex) : null;
    // A3: BF% fourchette multi-méthodes
    const bfMethods: { method: string; value: number }[] = [];
    if (navyBF !== null) bfMethods.push({ method: 'Navy', value: navyBF });
    if (bfPct > 0) bfMethods.push({ method: 'JP3', value: bfPct });
    const sk = last.skinfolds ?? {};
    const jp7Sites = ['chest', 'midaxilla', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh_anterior'];
    if (jp7Sites.every(k => (sk[k] ?? 0) > 0)) {
      const jp7 = BiometricsService.jacksonPollock7(sk['chest']!, sk['midaxilla']!, sk['triceps']!, sk['subscapular']!, sk['abdominal']!, sk['suprailiac']!, sk['thigh_anterior']!, ageYears, sex);
      bfMethods.push({ method: 'JP7', value: jp7 });
    }
    const dw4Sites = ['biceps', 'triceps', 'subscapular', 'suprailiac'];
    if (dw4Sites.every(k => (sk[k] ?? 0) > 0)) {
      const dw = BiometricsService.durninWomersley4(sk['biceps']!, sk['triceps']!, sk['subscapular']!, sk['suprailiac']!, ageYears, sex);
      bfMethods.push({ method: 'Durnin', value: dw });
    }
    const bfRange = bfMethods.length > 1 ? BiometricsService.bfPctRange(bfMethods) : null;
    return { ffmi, whr, whtr, navyBF, lbm, imcVal, ffmiNorm, bfRange };
  }, [measureStore.history]);

  // Dernière pesée connue (quand pas d'entrée WeightEntry pour la date sélectionnée)
  const lastKnownWeight = useMemo(() => {
    const todayWeight = weightStore.entries.find(e => e.date === selectedDate);
    if (todayWeight) return null;
    const sorted = weightStore.entries
      .filter(e => e.date < selectedDate)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (!sorted.length || !sorted[0]) return null;
    const last = sorted[0];
    const diffMs = new Date(selectedDate).getTime() - new Date(last.date).getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
    return { weight: last.weightKg, daysAgo: diffDays };
  }, [weightStore.entries, selectedDate]);

  // S2.4 — Suppression mesure
  const handleDeleteMeasurement = (date: string) => {
    Alert.alert('Suppression', `Supprimer la mesure du ${date} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => { void measureStore.remove(date); } },
    ]);
  };

  // Load entry for selected date
  useEffect(() => {
    if (!measureStore.loading) {
      const entry = measureStore.getByDate(selectedDate);
      setCurrentEntry(entry ?? { ...blankEntry, date: selectedDate });
    }
  }, [measureStore.loading, selectedDate]);

  const persistEntry = (entry: typeof blankEntry) => {
    const profileRaw = safeStorage.get('awan.nutrition.profile');
    const profileHeight = profileRaw ? (() => { try { return (JSON.parse(profileRaw) as any)?.heightCm as number | undefined; } catch { return undefined; } })() : undefined;
    const waist = entry.measurements?.['waist'];
    const hip = entry.measurements?.['hip'];
    const whtr = waist && profileHeight ? waist / profileHeight : undefined;
    const whr = waist && hip ? waist / hip : undefined;
    measureStore.save({
      v: 2 as const, id: uid(), savedAt: Date.now(), ...entry, date: selectedDate,
      ...(whtr !== undefined ? { whtr } : {}),
      ...(whr !== undefined ? { whr } : {}),
    });
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
    if (selectedPart === partId) { setSelectedPart(null); return; }
    setSelectedPart(partId);
    setInputValue(currentEntry.measurements[partId]?.toString() || '');
  };

  const saveMeasurement = () => {
    if (!selectedPart) return;
    const val = parseFloat(inputValue.replace(',', '.'));
    if (isNaN(val) || val <= 0) { setSelectedPart(null); return; }
    const newEntry = { ...currentEntry };
    newEntry.measurements = { ...newEntry.measurements, [selectedPart]: val };
    setCurrentEntry(newEntry);
    persistEntry(newEntry);
    setSelectedPart(null);
    setInputValue('');
  };

  const updateWeight = (val: string) => {
    const w = parseFloat(val.replace(',', '.'));
    if (isNaN(w) || w <= 0) return;
    const existing = weightStore.entries.find(e => e.date === selectedDate);
    if (existing) {
      void weightStore.update({ ...existing, weightKg: w });
    } else {
      void weightStore.add({ v: 1 as const, id: uid(), date: selectedDate, timestamp: Date.now(), weightKg: w });
    }
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
    const sex = gender === 'man' ? 'male' as const : 'female' as const;

    // Try JP7 first (all 7 sites available), fallback to JP3
    const jp7Sites = ['chest', 'midaxilla', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh_anterior'];
    const hasAllJP7 = jp7Sites.every(k => (s[k] ?? 0) > 0);
    let bf: number;
    if (hasAllJP7) {
      bf = BiometricsService.jacksonPollock7(
        s['chest'] ?? 0, s['midaxilla'] ?? 0, s['triceps'] ?? 0,
        s['subscapular'] ?? 0, s['abdominal'] ?? 0, s['suprailiac'] ?? 0,
        s['thigh_anterior'] ?? 0, a, sex,
      );
    } else if (sex === 'male') {
      bf = BiometricsService.jacksonPollock3Men(s['chest'] ?? 0, s['abdominal'] ?? 0, s['thigh_anterior'] ?? 0, a);
    } else {
      bf = BiometricsService.jacksonPollock3Women(s['triceps'] ?? 0, s['suprailiac'] ?? 0, s['thigh_anterior'] ?? 0, a);
    }
    newEntry.body_fat_pct = parseFloat(bf.toFixed(2));
    setCurrentEntry(newEntry);
    persistEntry(newEntry);
  };


  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <div className="px-6 pt-4 pb-2">
        <ScreenHeader tag="BODY · MENSURATION" title="DÉTAILS PHYSIQUES" />
        {/* A7: Non-blocking profile alert */}
        {profileIncomplete && (
          <Touch
            onPress={() => navigate?.('settings')}
            className="flex flex-row items-center gap-3 mt-3 px-4 py-3 border"
            style={{ borderColor: 'var(--color-awan-status-warn)', backgroundColor: 'var(--color-awan-status-warn)14' }}
          >
            <AlertTriangle size={14} style={{ color: 'var(--color-awan-status-warn)' }} />
            <span className="text-awan-xs font-black tracking-widest uppercase flex-1" style={{ color: 'var(--color-awan-status-warn)' }}>
              PROFIL INITIAL À COMPLÉTER →
            </span>
          </Touch>
        )}
      </div>
      
      <div className="flex flex-row justify-between bg-awan-surface p-5  border border-white/5 shadow-inner mx-6 mb-6">
         <div className="flex-1 items-center border-r border-white/5">
            <span className="text-awan-sm font-black text-awan-gold tracking-widest uppercase mb-2">Poids</span>
            <div className="flex flex-row items-baseline gap-1">
              <TextInput
                className="text-3xl font-black text-awan-tx font-mono w-20 text-center outline-none"
                keyboardType="numeric"
                value={weightStore.entries.find(e => e.date === selectedDate)?.weightKg?.toString() ?? ''}
                onChangeText={updateWeight}
                placeholder={lastKnownWeight ? lastKnownWeight.weight.toString() : '00.0'}
                placeholderTextColor={lastKnownWeight ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)'}
              />
              <span className="text-awan-md font-bold text-awan-tx-mute font-mono">KG</span>
            </div>
            {lastKnownWeight && (
              <span className="text-awan-xs font-black text-awan-tx-mute tracking-widest uppercase mt-1">
                DERNIÈRE PESÉE — J-{lastKnownWeight.daysAgo}
              </span>
            )}
         </div>
         <div className="flex-1 items-center border-r border-white/5">
            <span className="text-awan-sm font-black text-awan-gold tracking-widest uppercase mb-2">BPM Repos</span>
            <div className="flex flex-row items-baseline gap-1">
              <TextInput 
                className="text-3xl font-black text-awan-tx font-mono w-16 text-center outline-none"
                keyboardType="numeric" 
                value={currentEntry.bpm_rest?.toString()} 
                onChangeText={updateBpm}
                placeholder="00"
                placeholderTextColor="rgba(128,128,128,0.5)"
              />
               <span className="text-awan-md font-bold text-awan-tx-mute font-mono">BPM</span>
            </div>
         </div>
         <div className="flex-1 items-center">
            <span className="text-awan-sm font-black text-awan-gold tracking-widest uppercase mb-2">Grasse</span>
            <div className="flex flex-row items-baseline gap-1">
              <span className="text-3xl font-black text-awan-tx font-mono">{currentEntry.body_fat_pct || '--.-'}</span>
              <span className="text-awan-md font-bold text-awan-tx-mute font-mono">%</span>
            </div>
         </div>
      </div>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
        <div className="p-6">
          {/* S2.1 — Évolution du poids (SVG inline) */}
          <div className="mb-10">
            <div className="flex flex-row justify-between items-end mb-4 px-1">
              <Heading level={4} mono subtitle="Courbe temporelle" className="mb-0">ÉVOLUTION DU POIDS</Heading>
              <div className="bg-awan-surface p-1  border border-white/5 flex flex-row gap-1">
                {([30, 90, 365] as const).map(d => (
                  <Touch
                    key={d}
                    onPress={() => setWeightFilter(d)}
                    className={`px-3 py-1.5  transition-all ${weightFilter === d ? 'bg-awan-gold' : ''}`}
                  >
                    <span className={`text-awan-sm font-black uppercase tracking-widest ${weightFilter === d ? 'text-black' : 'text-awan-tx-mute'}`}>
                      {d === 365 ? '1AN' : `${d}J`}
                    </span>
                  </Touch>
                ))}
              </div>
            </div>
            <Card className="p-5 bg-white/3 border-white/5" variant="flat">
              {weightSeries.length < 2 ? (
                <div className="h-[100px] flex items-center justify-center">
                  <span className="text-awan-md font-black text-awan-tx-mute tracking-widest uppercase">Pas assez de données</span>
                </div>
              ) : (() => {
                const ws = weightSeries;
                const xs = ws.map(e => new Date(e.date).getTime());
                const ys = ws.map(e => e.weightKg);
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
                      <span className="text-awan-sm font-bold text-awan-tx-mute font-mono">MIN {minY.toFixed(1)} KG</span>
                      <span className="text-awan-sm font-bold text-awan-tx-mute font-mono">MAX {maxY.toFixed(1)} KG</span>
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
                        <span className="text-awan-sm font-black text-awan-tx-mute tracking-widest uppercase">Tendance 7J</span>
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
                <span className="text-awan-sm font-black text-awan-gold tracking-widest mb-2 block uppercase">Poids cible</span>
                <div className="flex flex-row items-baseline gap-2">
                  <TextInput
                    className="text-2xl font-black text-awan-tx font-mono flex-1 outline-none"
                    keyboardType="numeric"
                    value={targetWeightKg}
                    onChangeText={setTargetWeightKg}
                    placeholder="00.0"
                    placeholderTextColor="rgba(128,128,128,0.5)"
                  />
                  <span className="text-awan-md font-bold text-awan-tx-mute font-mono">KG</span>
                </div>
              </Card>
              <Card className="p-4 bg-white/5 border-white/5" variant="flat">
                <span className="text-awan-sm font-black text-awan-gold tracking-widest mb-2 block uppercase">% Graisse cible</span>
                <div className="flex flex-row items-baseline gap-2">
                  <TextInput
                    className="text-2xl font-black text-awan-tx font-mono flex-1 outline-none"
                    keyboardType="numeric"
                    value={targetBodyFatPct}
                    onChangeText={setTargetBodyFatPct}
                    placeholder="00.0"
                    placeholderTextColor="rgba(128,128,128,0.5)"
                  />
                  <span className="text-awan-md font-bold text-awan-tx-mute font-mono">%</span>
                </div>
              </Card>
            </div>
            {goalProgress && (
              <Card className="p-4 bg-white/3 border-white/5" variant="flat">
                <div className="flex flex-row justify-between items-baseline mb-2">
                  <span className="text-awan-sm font-black text-awan-tx-mute tracking-widest uppercase">Progression poids</span>
                  <span className="text-awan-md font-mono font-bold text-awan-tx">
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
                  className="text-awan-xs font-mono font-bold mt-2 block uppercase tracking-widest"
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

          {/* Log poids quotidien */}
          <div className="mb-10">
            <Heading level={4} mono subtitle="Suivi quotidien" className="mb-6">POIDS DU JOUR</Heading>
            <Card className="p-5 bg-white/3 border-white/5" variant="flat">
              <div className="flex flex-row items-center gap-4 mb-4">
                <TextInput
                  className="text-3xl font-black text-awan-tx font-mono w-24 outline-none"
                  keyboardType="numeric"
                  value={weightInput}
                  onChangeText={setWeightInput}
                  placeholder={weightStore.todayEntry ? String(weightStore.todayEntry.weightKg) : '00.0'}
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
                <span className="text-awan-md font-bold text-awan-tx-mute font-mono">KG</span>
                <Touch
                  onPress={async () => {
                    const w = parseFloat(weightInput.replace(',', '.'));
                    if (isNaN(w) || w <= 0) return;
                    const today = ds(new Date());
                    const existing = weightStore.todayEntry;
                    const entry = existing
                      ? { ...existing, weightKg: w, timestamp: Date.now() }
                      : { v: 1 as const, id: uid(), date: today, timestamp: Date.now(), weightKg: w };
                    await weightStore.add(entry);
                    setWeightInput('');
                  }}
                  className="bg-awan-gold px-4 py-2"
                >
                  <span className="text-awan-md font-black text-black uppercase tracking-widest">ENREGISTRER</span>
                </Touch>
              </div>
              {weightStore.avg7d > 0 && (
                <div className="pt-3 border-t border-white/5">
                  <div className="flex flex-row justify-between items-center">
                    <span className="text-awan-sm font-black text-awan-tx-mute tracking-widest uppercase">Moyenne 7j</span>
                    <span className="text-sm font-mono font-bold text-awan-tx">{weightStore.avg7d.toFixed(1)} kg</span>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Indices corporels */}
          {indices && (
            <div className="mb-10">
              <Heading level={4} mono subtitle="Métriques dérivées" className="mb-6">INDICES</Heading>
              <div className="grid grid-cols-2 gap-3">
                {indices.imcVal !== null && (
                  <Card className="p-4 bg-white/3 border-white/5" variant="flat">
                    <span className="text-awan-sm font-black text-awan-gold tracking-widest mb-1 block uppercase">IMC</span>
                    <span className="text-2xl font-black text-awan-tx font-mono">{indices.imcVal}</span>
                    <span className="text-awan-xs font-bold text-awan-tx-mute block mt-1 uppercase tracking-widest">
                      {indices.imcVal < 18.5 ? 'Insuffisance pondérale' : indices.imcVal < 25 ? 'Poids normal' : indices.imcVal < 30 ? 'Surpoids' : 'Obésité'}
                    </span>
                  </Card>
                )}
                {indices.ffmiNorm !== null ? (
                  <Card className="p-4 bg-white/3 border-white/5" variant="flat">
                    <span className="text-awan-sm font-black text-awan-gold tracking-widest mb-1 block uppercase">FFMI NORM.</span>
                    <span className="text-2xl font-black text-awan-tx font-mono">{indices.ffmiNorm}</span>
                    <span className="text-awan-xs font-bold text-awan-tx-mute block mt-1 uppercase tracking-widest">
                      {indices.ffmiNorm >= 25 ? 'Plafond naturel atteint' : indices.ffmiNorm >= 22 ? 'Très musclé' : indices.ffmiNorm >= 18 ? 'Athlétique' : 'Standard'}
                    </span>
                  </Card>
                ) : indices.ffmi !== null ? (
                  <Card className="p-4 bg-white/3 border-white/5" variant="flat">
                    <span className="text-awan-sm font-black text-awan-gold tracking-widest mb-1 block uppercase">FFMI</span>
                    <span className="text-2xl font-black text-awan-tx font-mono">{indices.ffmi}</span>
                    <span className="text-awan-xs font-bold text-awan-tx-mute block mt-1 uppercase tracking-widest">plafond naturel 25,0</span>
                  </Card>
                ) : null}
                {indices.bfRange !== null ? (
                  <Card className="p-4 bg-white/3 border-white/5" variant="flat">
                    <span className="text-awan-sm font-black text-awan-gold tracking-widest mb-1 block uppercase">BF% FOURCHETTE</span>
                    <span className="text-2xl font-black text-awan-tx font-mono">{indices.bfRange.low}–{indices.bfRange.high}<span className="text-sm ml-1 text-awan-tx-mute">%</span></span>
                    <span className="text-awan-xs font-bold text-awan-tx-mute block mt-1 uppercase tracking-widest">{indices.bfRange.methods.join(' + ')}</span>
                  </Card>
                ) : indices.navyBF !== null ? (
                  <Card className="p-4 bg-white/3 border-white/5" variant="flat">
                    <span className="text-awan-sm font-black text-awan-gold tracking-widest mb-1 block uppercase">BF% Navy</span>
                    <span className="text-2xl font-black text-awan-tx font-mono">{indices.navyBF}<span className="text-sm ml-1 text-awan-tx-mute">%</span></span>
                    <span className="text-awan-xs font-bold text-awan-tx-mute block mt-1 uppercase tracking-widest">Formule US Navy</span>
                  </Card>
                ) : null}
                {indices.whtr !== null && (
                  <Card className="p-4 bg-white/3 border-white/5" variant="flat">
                    <span className="text-awan-sm font-black text-awan-gold tracking-widest mb-1 block uppercase">WHtR</span>
                    <span className="text-2xl font-black font-mono"
                      style={{ color: indices.whtr < 0.50 ? 'var(--color-awan-status-ok)' : indices.whtr < 0.55 ? 'var(--color-awan-status-warn)' : 'var(--color-awan-status-error)' }}>
                      {indices.whtr}
                    </span>
                    <span className="text-awan-xs font-bold text-awan-tx-mute block mt-1 uppercase tracking-widest">cible &lt; 0,50</span>
                  </Card>
                )}
                {indices.whr !== null && (
                  <Card className="p-4 bg-white/3 border-white/5" variant="flat">
                    <span className="text-awan-sm font-black text-awan-gold tracking-widest mb-1 block uppercase">WHR</span>
                    <span className="text-2xl font-black font-mono"
                      style={{ color: indices.whr < 0.90 ? 'var(--color-awan-status-ok)' : indices.whr < 0.95 ? 'var(--color-awan-status-warn)' : 'var(--color-awan-status-error)' }}>
                      {indices.whr}
                    </span>
                    <span className="text-awan-xs font-bold text-awan-tx-mute block mt-1 uppercase tracking-widest">cible &lt; 0,90</span>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Quick Log Input */}
          <div className="mb-10">
            <Card className="flex-row items-center gap-4 bg-white/5 border-white/10 p-5" variant="flat">
               <div className="bg-awan-surface border border-white/5  flex-1 px-4 py-2 flex flex-row items-center">
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
               <Touch onPress={handleAddEntry} className="w-12 h-12 bg-white/5  items-center justify-center border border-white/10">
                  <Plus size={20} className="text-awan-gold" />
               </Touch>
            </Card>
          </div>

          {/* A5 — Jumeau numérique + asymétrie heatmap */}
          {indices && (
            <div className="mb-10">
              <Heading level={4} mono subtitle="Musculature 12 semaines" className="mb-4">JUMEAU NUMÉRIQUE</Heading>
              <BodySvg
                mode="heatmap"
                muscleValues={(() => {
                  const last = measureStore.history.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
                  if (!last?.skinfolds) return {};
                  const sym = analyzeSymmetry(last.measurements ?? {});
                  const result: Partial<Record<MuscleId, number>> = {};
                  for (const s of sym) {
                    const val = asymmetryToHeatmapValue(s.diffPct);
                    if (s.muscleKey === 'arm') { result['biceps_left'] = val; result['biceps_right'] = val; }
                    else if (s.muscleKey === 'forearm') { result['forearms_left'] = val; result['forearms_right'] = val; }
                    else if (s.muscleKey === 'thigh') { result['quads_left'] = val; result['quads_right'] = val; result['hamstrings_left'] = val; result['hamstrings_right'] = val; }
                    else if (s.muscleKey === 'calf') { result['calves_left'] = val; result['calves_right'] = val; }
                  }
                  return result;
                })() as Record<MuscleId, number>}
              />
            </div>
          )}

          {/* ─── CARTOGRAPHIE CORPORELLE ─── */}
          <div className="mb-10">
            {/* Date selector */}
            <div className="flex flex-row items-center justify-between mb-5 px-1">
              <Heading level={4} mono subtitle="Cliquer une ligne pour saisir" className="mb-0">MENSURATIONS</Heading>
              <div className="flex flex-row items-center gap-2 bg-awan-surface border border-white/5 px-2 py-1">
                <Touch onPress={() => shiftDate(-1)} className="w-6 h-6 items-center justify-center">
                  <ChevronLeft size={14} className="text-awan-tx-mute" />
                </Touch>
                <span className="text-awan-sm font-black font-mono text-awan-gold tracking-widest">
                  {selectedDate === todayStr ? 'AUJOURD\'HUI' : selectedDate.split('-').slice(1).join('/')}
                </span>
                <Touch
                  onPress={() => shiftDate(1)}
                  className="w-6 h-6 items-center justify-center"
                  style={{ opacity: selectedDate === todayStr ? 0.2 : 1 }}
                >
                  <ChevronRight size={14} className="text-awan-tx-mute" />
                </Touch>
              </div>
            </div>

            {/* SVG body + inline input panel */}
            <div className="bg-awan-surface border border-white/8 p-4 mb-4">
              <BodyMeasureSvg
                measurements={currentEntry.measurements}
                selectedKey={selectedPart}
                onSelect={handlePartPress}
              />
            </div>

            {/* Inline input panel — slides in when a line is selected */}
            <AnimatePresence>
              {selectedPart && (() => {
                const measure = BODY_MEASURES.find(m => m.key === selectedPart);
                return (
                  <motion.div
                    key={selectedPart}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="border border-awan-gold/30 bg-awan-gold/5 p-5 mb-4"
                  >
                    <div className="flex flex-row items-center gap-4">
                      <div className="flex-1">
                        <span className="text-awan-xs font-black text-awan-gold tracking-[0.3em] uppercase block mb-1">
                          {measure?.label ?? selectedPart}
                        </span>
                        <div className="flex flex-row items-baseline gap-2">
                          <TextInput
                            className="text-4xl font-black text-awan-gold font-mono outline-none flex-1"
                            autoFocus
                            keyboardType="decimal-pad"
                            value={inputValue}
                            onChangeText={setInputValue}
                            placeholder="00.0"
                            placeholderTextColor="rgba(212,175,55,0.2)"
                            onSubmitEditing={saveMeasurement}
                          />
                          <span className="text-sm font-black text-awan-gold font-mono opacity-60">CM</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Touch
                          onPress={saveMeasurement}
                          className="w-12 h-12 bg-awan-gold items-center justify-center"
                        >
                          <span className="text-awan-sm font-black text-black font-mono">OK</span>
                        </Touch>
                        <Touch
                          onPress={() => setSelectedPart(null)}
                          className="w-12 h-12 bg-white/5 border border-white/10 items-center justify-center"
                        >
                          <X size={14} className="text-awan-tx-mute" />
                        </Touch>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            {/* Measurement chips — quick overview */}
            <div className="grid grid-cols-3 gap-2">
              {BODY_MEASURES.map(({ key, label }) => {
                const val = currentEntry.measurements[key];
                const active = selectedPart === key;
                const hasVal = val !== undefined && val > 0;
                return (
                  <Touch
                    key={key}
                    onPress={() => handlePartPress(key)}
                    className={`p-3 border transition-all ${active ? 'border-awan-gold bg-awan-gold/10' : hasVal ? 'border-white/10 bg-white/3' : 'border-white/5 bg-transparent'}`}
                  >
                    <span className={`text-awan-xxs font-black tracking-widest uppercase block mb-1 ${active ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>{label}</span>
                    <span className={`text-base font-black font-mono ${active ? 'text-awan-gold' : hasVal ? 'text-awan-tx' : 'text-white/15'}`}>
                      {hasVal ? `${val}` : '--'}
                      <span className="text-awan-xs ml-0.5 opacity-60">cm</span>
                    </span>
                  </Touch>
                );
              })}
            </div>
          </div>

          {/* A1 — Mesures bilatérales L/R */}
          <div className="mb-10">
            <Heading level={4} mono subtitle="Symétrie musculaire G/D" className="mb-6">MESURES BILATÉRALES</Heading>
            {(() => {
              const symmetryResults = analyzeSymmetry(currentEntry.measurements);
              const heatmapValues: Partial<Record<MuscleId, number>> = {};
              for (const r of symmetryResults) {
                const id = r.muscleKey as MuscleId;
                heatmapValues[id] = asymmetryToHeatmapValue(r.diffPct);
              }
              const hasAsymmetry = symmetryResults.some(r => r.asymmetric);
              return (
                <>
                  {hasAsymmetry && (
                    <div className="mb-4 px-4 py-3 border flex flex-row items-center gap-3"
                      style={{ borderColor: 'var(--color-awan-status-warn)', backgroundColor: 'var(--color-awan-status-warn)14' }}>
                      <AlertTriangle size={14} style={{ color: 'var(--color-awan-status-warn)' }} />
                      <span className="text-awan-xs font-black tracking-widest uppercase" style={{ color: 'var(--color-awan-status-warn)' }}>
                        ASYMÉTRIE DÉTECTÉE (&gt;5%)
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {BILATERAL_MEASURES.map(({ base, label, leftKey, rightKey }) => {
                      const lVal = currentEntry.measurements[leftKey] ?? 0;
                      const rVal = currentEntry.measurements[rightKey] ?? 0;
                      const result = symmetryResults.find(r => r.muscleKey === base);
                      const warn = result?.asymmetric;
                      return (
                        <Card key={base} className="p-4 bg-white/3 border-white/5" variant="flat"
                          style={warn ? { borderColor: 'var(--color-awan-status-warn)' } : {}}>
                          <span className="text-awan-xs font-black tracking-widest uppercase mb-3 block"
                            style={{ color: warn ? 'var(--color-awan-status-warn)' : 'var(--color-awan-gold)' }}>
                            {label} {warn && '⚠'}
                          </span>
                          <div className="flex flex-row gap-3">
                            <div className="flex-1">
                              <span className="text-awan-xxs font-black text-awan-tx-mute tracking-widest block mb-1">GAUCHE</span>
                              <TextInput
                                className="text-xl font-black font-mono text-awan-tx outline-none w-full"
                                keyboardType="decimal-pad"
                                placeholder="--"
                                placeholderTextColor="rgba(255,255,255,0.15)"
                                value={lVal > 0 ? String(lVal) : ''}
                                onChangeText={(v: string) => {
                                  const n = parseFloat(v);
                                  const newEntry = { ...currentEntry };
                                  newEntry.measurements = { ...newEntry.measurements, [leftKey]: isNaN(n) ? 0 : n };
                                  setCurrentEntry(newEntry);
                                  persistEntry(newEntry);
                                }}
                              />
                            </div>
                            <div className="w-px bg-white/5" />
                            <div className="flex-1">
                              <span className="text-awan-xxs font-black text-awan-tx-mute tracking-widest block mb-1">DROITE</span>
                              <TextInput
                                className="text-xl font-black font-mono text-awan-tx outline-none w-full"
                                keyboardType="decimal-pad"
                                placeholder="--"
                                placeholderTextColor="rgba(255,255,255,0.15)"
                                value={rVal > 0 ? String(rVal) : ''}
                                onChangeText={(v: string) => {
                                  const n = parseFloat(v);
                                  const newEntry = { ...currentEntry };
                                  newEntry.measurements = { ...newEntry.measurements, [rightKey]: isNaN(n) ? 0 : n };
                                  setCurrentEntry(newEntry);
                                  persistEntry(newEntry);
                                }}
                              />
                            </div>
                          </div>
                          {result && lVal > 0 && rVal > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/5">
                              <span className="text-awan-xxs font-black tracking-widest"
                                style={{ color: warn ? 'var(--color-awan-status-warn)' : 'var(--color-awan-status-ok)' }}>
                                Δ {result.diffPct.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                  {hasAsymmetry && (
                    <div className="mt-4" style={{ maxWidth: 280, margin: '0 auto' }}>
                      <BodySvg mode="heatmap" muscleValues={heatmapValues} />
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* A2 — Plis cutanés ISAK (caliper requis) */}
          <div className="mb-10">
            <Heading level={4} mono subtitle="Caliper requis (~25–50€)" className="mb-4">PLIS CUTANÉS ISAK</Heading>
            <div className="mb-4 px-4 py-3 border border-white/10 bg-white/3">
              <span className="text-awan-xs text-awan-tx-mute leading-relaxed">
                Saisir les plis en mm. Le % masse grasse est calculé automatiquement (JP7 avec 7 sites, JP3 sinon). Mesurer systématiquement du côté droit, à jeun.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SKINFOLD_SITES.map(({ key, label }) => {
                const val = currentEntry.skinfolds[key] ?? 0;
                return (
                  <Card key={key} className="p-4 bg-white/3 border-white/5" variant="flat">
                    <span className="text-awan-xxs font-black text-awan-gold tracking-widest uppercase block mb-2">{label}</span>
                    <div className="flex flex-row items-baseline gap-2">
                      <TextInput
                        className="text-2xl font-black font-mono text-awan-tx outline-none flex-1"
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                        placeholderTextColor="rgba(255,255,255,0.12)"
                        value={val > 0 ? String(val) : ''}
                        onChangeText={(v: string) => updateSkinfold(key, v)}
                      />
                      <span className="text-awan-xs font-black text-awan-tx-mute font-mono">mm</span>
                    </div>
                  </Card>
                );
              })}
            </div>
            {currentEntry.body_fat_pct > 0 && (
              <Card className="mt-4 p-4 border-awan-gold/30 bg-awan-gold/5" variant="flat">
                <span className="text-awan-xs font-black text-awan-gold tracking-widest uppercase block mb-1">
                  % MASSE GRASSE ESTIMÉE
                </span>
                <span className="text-3xl font-black font-mono text-awan-gold">
                  {currentEntry.body_fat_pct.toFixed(1)}
                  <span className="text-sm ml-1 text-awan-tx-mute">%</span>
                </span>
                <span className="text-awan-xxs text-awan-tx-mute block mt-1 uppercase tracking-widest">
                  {(() => {
                    const jp7Sites = ['chest', 'midaxilla', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh_anterior'];
                    const has7 = jp7Sites.every(k => (currentEntry.skinfolds[k] ?? 0) > 0);
                    return has7 ? 'Jackson-Pollock 7 sites' : 'Jackson-Pollock 3 sites';
                  })()}
                </span>
              </Card>
            )}
          </div>

          <div className="mb-10">
            <Heading level={4} mono subtitle="Récupération Chrono" className="mb-6">HISTORIQUE DES CAPTURES</Heading>
            <div className="space-y-3">
              {measureStore.history.slice(-5).reverse().map((h) => (
                <Card key={h.date} className="flex-row items-center gap-3 p-4 bg-white/3 border-white/5" variant="flat">
                   <div className="w-10 h-10 rounded-full border border-white/10 items-center justify-center">
                      <span className="text-awan-xs font-mono text-awan-tx-mute">{h.date.split('-').slice(1).join('/')}</span>
                   </div>
                   <div className="flex-1">
                      <div className="flex flex-row items-baseline gap-1">
                         <span className="text-xl font-black text-awan-tx font-mono">{getWeightKg(h.date) || '—'}</span>
                         <span className="text-awan-sm font-bold text-awan-tx-mute uppercase">KG</span>
                      </div>
                   </div>
                   <div className="w-px h-8 bg-white/5" />
                   <div className="flex-1 items-end">
                      <div className="flex flex-row items-baseline gap-1">
                         <span className="text-xl font-black text-awan-gold font-mono">{h.body_fat_pct}</span>
                         <span className="text-awan-sm font-bold text-awan-tx-mute uppercase">%</span>
                      </div>
                   </div>
                   <Touch
                     onPress={() => handleDeleteMeasurement(h.date)}
                     className="w-8 h-8  items-center justify-center bg-white/5 border border-white/5"
                   >
                     <X size={14} className="text-awan-tx-mute" />
                   </Touch>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </ScrollView>

    </PageWrapper>
  );
}
