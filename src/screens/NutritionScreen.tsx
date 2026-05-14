import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, TextInput as RNTextInput, Modal, Alert } from 'react-native';

const TextInput = RNTextInput as React.ComponentType<any>;
import {
  Info,
  X,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Plus,
  Search,
  UtensilsCrossed,
  ShieldAlert,
  Camera,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageWrapper } from '../components/Animated';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useAppState } from '../context/AppStateContext';
import { useDaily } from '../context/DailyContext';
import { ds, uid } from '../utils/storage';
import { DailyCanvas } from '../components/DailyCanvas';
import { LocalAIService } from '../services/localAIService';
import { useMealStore } from '../hooks/useMealStore';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';
import {
  loadFoodDatabase,
  searchFoods,
  type FoodEntry,
} from '../utils/nutritionData';

// ─── Nutrition Profile (TDEE) ─────────────────────────────────────────────────

type Activity =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'veryActive';
type Goal = 'lose' | 'maintain' | 'gain';

interface NutritionProfile {
  weightKg: number;
  heightCm: number;
  age: number;
  activity: Activity;
  goal: Goal;
  targetKcal: number;
  targetP: number;
  targetC: number;
  targetF: number;
}

const PROFILE_KEY = 'awan.nutrition.profile';

const ACTIVITY_FACTORS: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

function computeProfile(
  weightKg: number,
  heightCm: number,
  age: number,
  activity: Activity,
  goal: Goal,
): NutritionProfile {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const tdee = bmr * ACTIVITY_FACTORS[activity];
  const goalDelta = goal === 'gain' ? 300 : goal === 'lose' ? -300 : 0;
  const targetKcal = Math.round(tdee + goalDelta);
  const targetP = Math.round(weightKg * 1.8);
  const targetC = Math.round((targetKcal * 0.45) / 4);
  const targetF = Math.round((targetKcal * 0.25) / 9);
  return {
    weightKg,
    heightCm,
    age,
    activity,
    goal,
    targetKcal,
    targetP,
    targetC,
    targetF,
  };
}

function loadProfile(): NutritionProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NutritionProfile;
  } catch {
    return null;
  }
}

function saveProfile(p: NutritionProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function statusColor(actual: number, target: number): string {
  if (target <= 0) return 'var(--color-awan-status-warn)';
  const ratio = actual / target;
  const delta = Math.abs(ratio - 1);
  if (delta <= 0.1) return 'var(--color-awan-status-ok)';
  if (delta <= 0.2) return 'var(--color-awan-status-warn)';
  return 'var(--color-awan-status-error)';
}

interface ProgressBarProps {
  label: string;
  actual: number;
  target: number;
  unit: string;
  accent?: string | undefined;
}

function ProgressBar({ label, actual, target, unit, accent }: ProgressBarProps) {
  const color = statusColor(actual, target);
  const pct = target > 0 ? Math.min((actual / target) * 100, 120) : 0;
  return (
    <div className="bg-black/40 p-3 rounded-xl border border-white/5">
      <div className="flex flex-row justify-between items-baseline mb-2">
        <span
          className="text-[8px] font-black uppercase tracking-widest"
          style={{ color: accent ?? color }}
        >
          {label}
        </span>
        <span className="text-[10px] font-mono font-bold text-awan-tx-mute">
          <span style={{ color }} className="font-bold">
            {Math.round(actual)}
          </span>
          {` / ${target}${unit}`}
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(pct, 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

// ─── Onboarding Modal ─────────────────────────────────────────────────────────

interface OnboardingProps {
  onComplete: (profile: NutritionProfile) => void;
}

function OnboardingModal({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [weight, setWeight] = useState('75');
  const [height, setHeight] = useState('175');
  const [age, setAge] = useState('25');
  const [activity, setActivity] = useState<Activity>('moderate');
  const [goal, setGoal] = useState<Goal>('maintain');

  const handleSubmit = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age, 10);
    if (!w || !h || !a) {
      Alert.alert('Erreur', 'Valeurs invalides');
      return;
    }
    const profile = computeProfile(w, h, a, activity, goal);
    saveProfile(profile);
    onComplete(profile);
  };

  const canNext1 = !!weight && !!height && !!age;

  return (
    <Modal visible={true} transparent animationType="fade">
      <div
        className="flex-1 flex justify-center items-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full bg-awan-surface rounded-t-3xl border-t border-white/10 overflow-hidden"
          style={{ maxHeight: '85vh' }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-6 pb-4 border-b border-white/5">
            <span className="awan-label text-awan-gold mb-1 block">
              CALIBRATION MÉTABOLIQUE · ÉTAPE {step}/3
            </span>
            <span className="text-xl font-bold text-awan-tx uppercase tracking-tight">
              {step === 1 && 'PROFIL BIOMÉTRIQUE'}
              {step === 2 && 'NIVEAU D’ACTIVITÉ'}
              {step === 3 && 'OBJECTIF ÉNERGÉTIQUE'}
            </span>
          </div>

          <ScrollView
            style={{ maxHeight: 480 }}
            contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
          >
            {/* Step 1: Biometric */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div>
                  <span className="awan-label mb-2 block">POIDS (KG)</span>
                  <TextInput
                    className="bg-awan-bg border border-white/5 rounded-awan-xl px-5 py-4 text-sm font-bold text-awan-tx"
                    placeholder="75"
                    placeholderTextColor="#6C665E"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                  />
                </div>
                <div>
                  <span className="awan-label mb-2 block">TAILLE (CM)</span>
                  <TextInput
                    className="bg-awan-bg border border-white/5 rounded-awan-xl px-5 py-4 text-sm font-bold text-awan-tx"
                    placeholder="175"
                    placeholderTextColor="#6C665E"
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                  />
                </div>
                <div>
                  <span className="awan-label mb-2 block">ÂGE (ANS)</span>
                  <TextInput
                    className="bg-awan-bg border border-white/5 rounded-awan-xl px-5 py-4 text-sm font-bold text-awan-tx"
                    placeholder="25"
                    placeholderTextColor="#6C665E"
                    value={age}
                    onChangeText={setAge}
                    keyboardType="numeric"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Activity */}
            {step === 2 && (
              <div className="flex flex-col gap-3">
                {(
                  [
                    { k: 'sedentary', l: 'SÉDENTAIRE', d: 'Peu ou pas d’exercice' },
                    { k: 'light', l: 'LÉGER', d: '1-3 sessions / semaine' },
                    { k: 'moderate', l: 'MODÉRÉ', d: '3-5 sessions / semaine' },
                    { k: 'active', l: 'ACTIF', d: '6-7 sessions / semaine' },
                    { k: 'veryActive', l: 'TRÈS ACTIF', d: 'Quotidien + physique' },
                  ] as Array<{ k: Activity; l: string; d: string }>
                ).map((opt) => (
                  <Touch
                    key={opt.k}
                    onPress={() => setActivity(opt.k)}
                    className={`p-4 rounded-awan-xl border ${
                      activity === opt.k
                        ? 'bg-awan-gold/15 border-awan-gold/40'
                        : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <div className="flex flex-row justify-between items-center">
                      <div className="flex flex-col">
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                            activity === opt.k ? 'text-awan-gold' : 'text-awan-tx-mute'
                          }`}
                        >
                          {opt.l}
                        </span>
                        <span className="text-xs font-bold text-awan-tx opacity-80">
                          {opt.d}
                        </span>
                      </div>
                      {activity === opt.k && (
                        <CheckCircle size={18} className="text-awan-gold" />
                      )}
                    </div>
                  </Touch>
                ))}
              </div>
            )}

            {/* Step 3: Goal */}
            {step === 3 && (
              <div className="flex flex-col gap-3">
                {(
                  [
                    { k: 'lose', l: 'PERTE', d: '−300 kcal / jour' },
                    { k: 'maintain', l: 'MAINTIEN', d: 'TDEE équilibré' },
                    { k: 'gain', l: 'PRISE', d: '+300 kcal / jour' },
                  ] as Array<{ k: Goal; l: string; d: string }>
                ).map((opt) => (
                  <Touch
                    key={opt.k}
                    onPress={() => setGoal(opt.k)}
                    className={`p-4 rounded-awan-xl border ${
                      goal === opt.k
                        ? 'bg-awan-gold/15 border-awan-gold/40'
                        : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <div className="flex flex-row justify-between items-center">
                      <div className="flex flex-col">
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                            goal === opt.k ? 'text-awan-gold' : 'text-awan-tx-mute'
                          }`}
                        >
                          {opt.l}
                        </span>
                        <span className="text-xs font-bold text-awan-tx opacity-80">
                          {opt.d}
                        </span>
                      </div>
                      {goal === opt.k && (
                        <CheckCircle size={18} className="text-awan-gold" />
                      )}
                    </div>
                  </Touch>
                ))}
              </div>
            )}
          </ScrollView>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/5 flex flex-row gap-3">
            {step > 1 && (
              <Touch
                onPress={() => setStep((step - 1) as 1 | 2 | 3)}
                className="flex-1 h-12 bg-white/5 border border-white/10 rounded-awan-xl flex items-center justify-center"
              >
                <span className="text-[10px] font-black text-awan-tx-mute uppercase tracking-widest">
                  RETOUR
                </span>
              </Touch>
            )}
            {step < 3 ? (
              <Touch
                onPress={() => {
                  if (step === 1 && !canNext1) return;
                  setStep((step + 1) as 1 | 2 | 3);
                }}
                className="flex-1 h-12 bg-awan-gold rounded-awan-xl flex items-center justify-center"
              >
                <span className="text-[10px] font-black text-black uppercase tracking-widest">
                  CONTINUER
                </span>
              </Touch>
            ) : (
              <Touch
                onPress={handleSubmit}
                className="flex-1 h-12 bg-awan-gold rounded-awan-xl flex items-center justify-center"
              >
                <span className="text-[10px] font-black text-black uppercase tracking-widest">
                  CALCULER & CONTINUER
                </span>
              </Touch>
            )}
          </div>
        </motion.div>
      </div>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NutritionScreen() {
  useAppState();
  const { addEntry, moveEntry } = useDaily();

  const [inputText, setInputText] = useState('');
  const [auditText, setAuditText] = useState('');
  const [auditResult, setAuditResult] = useState<{
    status: string;
    message: string;
  } | null>(null);
  const today = ds(new Date());

  const mealStore = useMealStore(today);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodEntry | null>(null);
  const [foodsReady, setFoodsReady] = useState(false);
  const [profile, setProfile] = useState<NutritionProfile | null>(() =>
    loadProfile(),
  );
  const [showOnboarding, setShowOnboarding] = useState(() => !loadProfile());

  // Load foods on mount
  useEffect(() => {
    loadFoodDatabase()
      .then(() => setFoodsReady(true))
      .catch(() => setFoodsReady(true));
  }, []);

  const searchResults = useMemo<FoodEntry[]>(() => {
    if (!foodsReady) return [];
    if (!searchQuery.trim()) return [];
    return searchFoods(searchQuery);
  }, [searchQuery, foodsReady]);

  const handleAudit = () => {
    if (!auditText.trim()) return;
    const res = LocalAIService.auditHalalIngredients(auditText);
    setAuditResult(res);
  };

  const handleAddFromDb = (item: FoodEntry) => {
    const now = Date.now();
    const entryId = uid();
    mealStore.add({
      v: 1,
      id: entryId,
      date: today,
      name: item.n,
      kcal: item.kcal,
      p: item.p,
      c: item.c,
      f: item.f,
      timestamp: now,
      source: 'db',
    });
    addEntry(today, {
      id: entryId,
      timestamp: now,
      module: 'nutrition',
      rawText: `${item.n} ${item.kcal}kcal`,
      tokens: [
        { label: 'Aliment', value: item.n, icon: 'utensils' },
        { label: 'Énergie', value: `${item.kcal}kcal`, icon: 'flame' },
      ],
    });
    setSearchQuery('');
  };

  const handleDeleteMeal = (id: string) => {
    mealStore.remove(id);
  };

  const handleScan = () => {
    Alert.alert('Bientôt', 'Scanner disponible sur mobile');
  };

  const handleAddEntry = () => {
    if (!inputText.trim()) return;
    const now = Date.now();
    const entryId = uid();
    const parts = inputText.split(' ');
    const tokens = parts.map((part) => {
      let icon = 'utensils';
      let label = 'Aliment';
      if (part.match(/\d+g|\d+kg/i)) {
        icon = 'scale';
        label = 'Quantité';
      }
      if (part.match(/\d+kcal|\d+cal/i)) {
        icon = 'flame';
        label = 'Énergie';
      }
      return { label, value: part, icon };
    });

    mealStore.add({
      v: 1,
      id: entryId,
      date: today,
      name: parts[0] ?? inputText,
      kcal: 0,
      p: 0,
      c: 0,
      f: 0,
      timestamp: now,
      source: 'quick',
    });

    addEntry(today, {
      id: entryId,
      timestamp: now,
      module: 'nutrition',
      rawText: inputText,
      tokens,
    });
    setInputText('');
  };

  const nutritionTotals = mealStore.totals;

  // Show onboarding before screen
  if (showOnboarding) {
    return (
      <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
        <View style={{ flex: 1 }} />
        <OnboardingModal
          onComplete={(p) => {
            setProfile(p);
            setShowOnboarding(false);
          }}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <div className="px-6 pt-4 pb-4">
          <ScreenHeader tag="BODY · NUTRITION" title="NUTRITION" />
        </div>

        {/* Biometric Summary Matrix */}
        <Card className="mb-8 p-6 bg-awan-surface/20 border-awan-gold/10 shadow-[0_0_40px_rgba(212,175,55,0.05)]">
          <div className="flex justify-between items-center mb-8">
            <div className="flex flex-col">
              <span className="awan-label text-awan-gold">INDEX CALORIQUE</span>
              <div className="flex flex-row items-baseline gap-2">
                <span className="text-4xl font-bold font-mono tracking-tighter text-awan-tx">
                  {nutritionTotals.kcal}
                </span>
                {profile && (
                  <span className="text-sm font-mono font-bold text-awan-tx-mute">
                    / {profile.targetKcal}
                  </span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 bg-awan-gold/10 rounded-2xl flex items-center justify-center border border-awan-gold/20">
              <UtensilsCrossed size={20} className="text-awan-gold" />
            </div>
          </div>

          {profile && (
            <div className="mb-4">
              <ProgressBar
                label="ÉNERGIE"
                actual={nutritionTotals.kcal}
                target={profile.targetKcal}
                unit="kcal"
                accent="var(--color-awan-gold)"
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {profile ? (
              <>
                <ProgressBar
                  label="PROTÉINES"
                  actual={nutritionTotals.p}
                  target={profile.targetP}
                  unit="g"
                />
                <ProgressBar
                  label="GLUCIDES"
                  actual={nutritionTotals.c}
                  target={profile.targetC}
                  unit="g"
                />
                <ProgressBar
                  label="LIPIDES"
                  actual={nutritionTotals.f}
                  target={profile.targetF}
                  unit="g"
                />
              </>
            ) : (
              <>
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 items-center">
                  <span className="text-[8px] font-black text-awan-status-error uppercase tracking-widest mb-1">
                    PROTÉINES
                  </span>
                  <span className="text-lg font-bold font-mono text-awan-tx">
                    {nutritionTotals.p}g
                  </span>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 items-center">
                  <span className="text-[8px] font-black text-awan-status-ok uppercase tracking-widest mb-1">
                    GLUCIDES
                  </span>
                  <span className="text-lg font-bold font-mono text-awan-tx">
                    {nutritionTotals.c}g
                  </span>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 items-center">
                  <span className="text-[8px] font-black text-awan-status-warn uppercase tracking-widest mb-1">
                    LIPIDES
                  </span>
                  <span className="text-lg font-bold font-mono text-awan-tx">
                    {nutritionTotals.f}g
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5">
            <p className="text-[10px] text-awan-tx-mute font-medium italic opacity-70">
              Séquençage IA actif : flux métabolique en état stable.
            </p>
          </div>
        </Card>

        {/* Database Unit */}
        <div className="mb-10">
          <Heading level={4} mono subtitle="Base alimentaire">
            ARCHIVES LOCALES
          </Heading>
          <Card className="p-0 border-white/5 bg-white/5 overflow-hidden mb-6">
            <div className="flex flex-row items-center px-4 py-1 gap-2">
              <Search size={16} className="text-awan-tx-mute" />
              <TextInput
                className="flex-1 h-12 text-sm font-bold text-awan-tx outline-none bg-transparent"
                placeholder="RECHERCHER ALIMENT..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <Touch
                onPress={handleScan}
                className="h-9 px-3 rounded-xl bg-awan-gold/10 border border-awan-gold/20 flex flex-row items-center gap-2"
              >
                <Camera size={14} className="text-awan-gold" />
                <span className="text-[9px] font-black uppercase tracking-widest text-awan-gold">
                  SCAN
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-awan-tx-mute">
                  MOBILE
                </span>
              </Touch>
            </div>
          </Card>

          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="gap-3 mt-4"
              >
                {searchResults.map((item) => (
                  <Card
                    key={item.id}
                    className="flex-row items-center gap-4 py-4 px-5 bg-white/10"
                    variant="flat"
                  >
                    <div className="flex-1">
                      <span className="text-sm font-bold text-awan-tx uppercase tracking-tight">
                        {item.n}
                      </span>
                      <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-widest mt-1 block">
                        {item.kcal} KCAL · P{item.p} · G{item.c} · L{item.f}
                      </span>
                    </div>
                    <div className="flex flex-row gap-2">
                      <Touch
                        onPress={() => setSelectedFood(item)}
                        className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10"
                      >
                        <Info size={16} className="text-awan-tx-mute" />
                      </Touch>
                      <Touch
                        onPress={() => handleAddFromDb(item)}
                        className="w-9 h-9 rounded-xl bg-awan-gold/20 flex items-center justify-center border border-awan-gold/30"
                      >
                        <Plus size={18} className="text-awan-gold" />
                      </Touch>
                    </div>
                  </Card>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Unit */}
        <div className="mb-10">
          <Heading level={4} mono subtitle="Capture Libre">
            FLUX NUTRITIF
          </Heading>
          <div className="flex flex-row gap-3 items-center">
            <TextInput
              className="flex-1 bg-awan-bg border border-white/5 rounded-awan-xl px-5 py-4 text-sm font-bold text-awan-tx"
              placeholder="Rédiger un apport organique..."
              placeholderTextColor="#6C665E"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleAddEntry}
            />
            <Touch
              onPress={handleAddEntry}
              className="w-14 h-14 bg-awan-gold rounded-2xl flex items-center justify-center shadow-lg shadow-awan-gold/10"
            >
              <Plus size={24} color="black" strokeWidth={3} />
            </Touch>
          </div>
        </div>

        {/* Audit Unit */}
        <div className="mb-10">
          <Heading level={4} mono subtitle="Vigilance Halal">
            INSPECTEUR INGRÉDIENTS
          </Heading>
          <div className="flex flex-col gap-3">
            <TextInput
              className="bg-awan-bg border border-white/5 rounded-awan-xl px-5 py-4 text-sm font-bold text-awan-tx min-h-[100px]"
              placeholder="CONSTITUANTS À ANALYSER..."
              placeholderTextColor="#6C665E"
              value={auditText}
              onChangeText={setAuditText}
              multiline
            />
            <Touch
              onPress={handleAudit}
              className="h-14 bg-white/5 border border-white/10 rounded-awan-xl flex items-center justify-center bg-awan-gold/5"
            >
              <div className="flex flex-row items-center gap-3">
                <ShieldAlert size={18} className="text-awan-gold" />
                <span className="awan-label text-awan-gold">
                  LANCER L'AUDIT IA
                </span>
              </div>
            </Touch>
          </div>

          <AnimatePresence>
            {auditResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-5 rounded-awan-xl border ${
                  auditResult.status === 'haram'
                    ? 'bg-awan-status-error/10 border-awan-status-error/30'
                    : auditResult.status === 'douteux'
                      ? 'bg-awan-status-warn/10 border-awan-status-warn/30'
                      : 'bg-awan-status-ok/10 border-awan-status-ok/30'
                }`}
              >
                <div className="flex flex-row items-center gap-3 mb-2">
                  {auditResult.status === 'haram' ? (
                    <X size={20} className="text-awan-status-error" />
                  ) : auditResult.status === 'douteux' ? (
                    <AlertTriangle size={20} className="text-awan-status-warn" />
                  ) : (
                    <ShieldCheck size={20} className="text-awan-status-ok" />
                  )}
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      auditResult.status === 'haram'
                        ? 'text-awan-status-error'
                        : auditResult.status === 'douteux'
                          ? 'text-awan-status-warn'
                          : 'text-awan-status-ok'
                    }`}
                  >
                    RÉSULTAT DE L'INFÉRENCE :{' '}
                    {auditResult.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-bold text-awan-tx leading-relaxed opacity-90">
                  {auditResult.message}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Meals Today */}
        {mealStore.meals.length > 0 && (
          <div className="mb-10">
            <Heading level={4} mono subtitle="Apports enregistrés">
              REPAS DU JOUR
            </Heading>
            <div className="flex flex-col gap-3">
              {mealStore.meals.map((meal) => (
                <Card
                  key={meal.id}
                  className="flex-row items-center gap-4 py-4 px-5"
                  variant="flat"
                >
                  <div className="flex-1">
                    <span className="text-sm font-bold text-awan-tx uppercase tracking-tight block">
                      {meal.name}
                    </span>
                    <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-widest mt-1 block">
                      {meal.kcal} KCAL · P{meal.p} · G{meal.c} · L{meal.f}
                    </span>
                  </div>
                  <Touch
                    onPress={() => handleDeleteMeal(meal.id)}
                    className="w-9 h-9 rounded-xl bg-awan-status-error/10 flex items-center justify-center border border-awan-status-error/20"
                  >
                    <Trash2 size={15} className="text-awan-status-error" />
                  </Touch>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Journal Unit */}
        <div className="mb-10">
          <Heading level={4} mono subtitle="Séquence Tactique">
            HISTORIQUE DU JOUR
          </Heading>
          <div className="bg-awan-bg/40 p-4 rounded-awan-xl border border-white/5 min-h-[150px]">
            <DailyCanvas
              dateId={today}
              filterModule="nutrition"
              onReorder={(activeId: string, overId: string) =>
                moveEntry(today, activeId, overId)
              }
            />
          </div>
        </div>
      </ScrollView>

      {/* Food Info Modal */}
      <Modal visible={!!selectedFood} transparent animationType="fade">
        <div className="flex-1 flex justify-center items-center bg-black/90 backdrop-blur-md p-6">
          <Touch
            className="absolute inset-0"
            onPress={() => setSelectedFood(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-awan-surface rounded-awan-3xl border border-white/10 shadow-2xl overflow-hidden"
          >
            {selectedFood && (
              <>
                <div className="p-8 border-b border-white/10 bg-white/5 relative">
                  <span className="awan-label mb-2 text-awan-gold">
                    COMPOSANT ORGANIQUE
                  </span>
                  <Heading level={2} className="mb-0">
                    {selectedFood.n}
                  </Heading>
                  <Touch
                    onPress={() => setSelectedFood(null)}
                    className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
                  >
                    <X size={20} className="text-awan-tx-mute" />
                  </Touch>
                </div>

                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <span className="awan-label">MACROS (100G)</span>
                    <div className="flex gap-3">
                      <div className="items-center">
                        <span className="text-[10px] font-black text-awan-status-error mb-1 block">
                          P
                        </span>
                        <span className="text-xs font-mono font-bold">
                          {selectedFood.p}g
                        </span>
                      </div>
                      <div className="items-center">
                        <span className="text-[10px] font-black text-awan-status-ok mb-1 block">
                          G
                        </span>
                        <span className="text-xs font-mono font-bold">
                          {selectedFood.c}g
                        </span>
                      </div>
                      <div className="items-center">
                        <span className="text-[10px] font-black text-awan-status-warn mb-1 block">
                          L
                        </span>
                        <span className="text-xs font-mono font-bold">
                          {selectedFood.f}g
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <span className="awan-label">ÉNERGIE (100G)</span>
                    <span className="text-sm font-mono font-bold text-awan-tx">
                      {selectedFood.kcal} kcal
                    </span>
                  </div>

                  <Card className="bg-white/5 border-awan-gold/20 p-5 mt-4">
                    <div className="flex flex-row items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-awan-gold/10 flex items-center justify-center">
                        {selectedFood.halal ? (
                          <ShieldCheck size={16} className="text-awan-gold" />
                        ) : (
                          <AlertTriangle
                            size={16}
                            className="text-awan-status-error"
                          />
                        )}
                      </div>
                      <span className="text-sm font-bold uppercase tracking-tight">
                        Vérification Halal :{' '}
                        {selectedFood.halal ? 'CONFORME' : 'NON-CONFORME'}
                      </span>
                    </div>
                  </Card>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
