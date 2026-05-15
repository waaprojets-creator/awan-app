import React, { useState, useMemo, useEffect } from 'react';
import {
 View,
 ScrollView,
 TextInput as RNTextInput,
 FlatList as RNFlatList,
 Modal,
 Alert,
} from 'react-native';

const TextInput = RNTextInput as React.ComponentType<any>;
const FlatList = RNFlatList as React.ComponentType<any>;
import {
 X,
 CheckCircle,
 Plus,
 Search,
 UtensilsCrossed,
 Trash2,
 Pencil,
 ChevronLeft,
 ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageWrapper } from '../components/Animated';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useAppState } from '../context/AppStateContext';
import { useDaily } from '../context/DailyContext';
import { ds, uid } from '../utils/storage';
import { useMealStore } from '../hooks/useMealStore';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';
import {
 loadFoodDatabase,
 searchFoods,
 getRecentFoods,
 recordRecentFood,
 type FoodEntry,
} from '../utils/nutritionData';
import type {
 MealEntryLatest,
 MealType,
} from '../data/schemas/nutrition/mealEntry';

// ─── Nutrition Profile (TDEE) ─────────────────────────────────────────────────

type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MEAL_TYPES: ReadonlyArray<{ key: MealType; label: string }> = [
 { key: 'suhoor', label: 'SUHOOR' },
 { key: 'dejeuner', label: 'DÉJEUNER' },
 { key: 'diner', label: 'DÎNER' },
 { key: 'collation', label: 'COLLATION' },
];

const MONTHS_FR: ReadonlyArray<string> = [
 'JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN',
 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC',
];

function shiftDate(date: string, deltaDays: number): string {
 const d = new Date(`${date}T00:00:00`);
 d.setDate(d.getDate() + deltaDays);
 return ds(d);
}

function formatDayLabel(date: string): string {
 const today = ds(new Date());
 const yesterday = shiftDate(today, -1);
 if (date === today) return "AUJOURD'HUI";
 if (date === yesterday) return 'HIER';
 const d = new Date(`${date}T00:00:00`);
 const month = MONTHS_FR[d.getMonth()] ?? '';
 return `${d.getDate()} ${month}`;
}

function calcMacros(
 food: { kcal: number; p: number; c: number; f: number },
 grams: number,
): { kcal: number; p: number; c: number; f: number } {
 const ratio = grams / 100;
 return {
 kcal: Math.round(food.kcal * ratio),
 p: Math.round(food.p * ratio * 10) / 10,
 c: Math.round(food.c * ratio * 10) / 10,
 f: Math.round(food.f * ratio * 10) / 10,
 };
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
 <div className="bg-awan-surface p-3 border border-white/5">
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
 <div className="h-1.5 bg-white/5 overflow-hidden">
 <div
 className="h-full transition-all duration-500"
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
 <div className="flex justify-center pt-3 pb-1">
 <div className="w-10 h-1 bg-white/20 " />
 </div>

 <div className="px-6 pb-4 border-b border-white/5">
 <span className="awan-label text-awan-gold mb-1 block">
 CALIBRATION MÉTABOLIQUE · ÉTAPE {step}/3
 </span>
 <span className="text-xl font-bold text-awan-tx uppercase tracking-tight">
 {step === 1 && 'PROFIL BIOMÉTRIQUE'}
 {step === 2 && "NIVEAU D'ACTIVITÉ"}
 {step === 3 && 'OBJECTIF ÉNERGÉTIQUE'}
 </span>
 </div>

 <ScrollView
 style={{ maxHeight: 480 }}
 contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
 >
 {step === 1 && (
 <div className="flex flex-col gap-4">
 <div>
 <span className="awan-label mb-2 block">POIDS (KG)</span>
 <TextInput
 className="bg-awan-bg border border-white/5 px-5 py-4 text-sm font-bold text-awan-tx"
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
 className="bg-awan-bg border border-white/5 px-5 py-4 text-sm font-bold text-awan-tx"
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
 className="bg-awan-bg border border-white/5 px-5 py-4 text-sm font-bold text-awan-tx"
 placeholder="25"
 placeholderTextColor="#6C665E"
 value={age}
 onChangeText={setAge}
 keyboardType="numeric"
 />
 </div>
 </div>
 )}

 {step === 2 && (
 <div className="flex flex-col gap-3">
 {(
 [
 { k: 'sedentary', l: 'SÉDENTAIRE', d: "Peu ou pas d'exercice" },
 { k: 'light', l: 'LÉGER', d: '1-3 sessions / semaine' },
 { k: 'moderate', l: 'MODÉRÉ', d: '3-5 sessions / semaine' },
 { k: 'active', l: 'ACTIF', d: '6-7 sessions / semaine' },
 { k: 'veryActive', l: 'TRÈS ACTIF', d: 'Quotidien + physique' },
 ] as Array<{ k: Activity; l: string; d: string }>
 ).map((opt) => (
 <Touch
 key={opt.k}
 onPress={() => setActivity(opt.k)}
 className={`p-4 border ${
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
 className={`p-4 border ${
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

 <div className="px-6 py-4 border-t border-white/5 flex flex-row gap-3">
 {step > 1 && (
 <Touch
 onPress={() => setStep((step - 1) as 1 | 2 | 3)}
 className="flex-1 h-12 bg-white/5 border border-white/10 flex items-center justify-center"
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
 className="flex-1 h-12 bg-awan-gold flex items-center justify-center"
 >
 <span className="text-[10px] font-black text-black uppercase tracking-widest">
 CONTINUER
 </span>
 </Touch>
 ) : (
 <Touch
 onPress={handleSubmit}
 className="flex-1 h-12 bg-awan-gold flex items-center justify-center"
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

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

interface AddModalProps {
 visible: boolean;
 meal: MealType;
 foodsReady: boolean;
 onClose: () => void;
 onAdd: (food: FoodEntry, grams: number, timeHHMM: string | undefined) => void;
}

function AddMealModal({
 visible,
 meal,
 foodsReady,
 onClose,
 onAdd,
}: AddModalProps) {
 const [query, setQuery] = useState('');
 const [selected, setSelected] = useState<FoodEntry | null>(null);
 const [grams, setGrams] = useState('100');
 const [time, setTime] = useState('');

 useEffect(() => {
 if (!visible) {
 setQuery('');
 setSelected(null);
 setGrams('100');
 setTime('');
 }
 }, [visible]);

 const results = useMemo<FoodEntry[]>(() => {
 if (!foodsReady) return [];
 if (!query.trim()) return getRecentFoods().slice(0, 10);
 return searchFoods(query).slice(0, 30);
 }, [query, foodsReady]);

 const gramsNum = parseFloat(grams);
 const preview =
 selected && gramsNum > 0 ? calcMacros(selected, gramsNum) : null;
 const timeValid = !time.trim() || /^\d{2}:\d{2}$/.test(time.trim());

 const handleSubmit = () => {
 if (!selected) return;
 if (!gramsNum || gramsNum <= 0) {
 Alert.alert('Erreur', 'Grammes invalides');
 return;
 }
 if (!timeValid) {
 Alert.alert('Erreur', 'Heure invalide (format HH:MM)');
 return;
 }
 const t = time.trim() ? time.trim() : undefined;
 onAdd(selected, gramsNum, t);
 };

 const mealLabel =
 MEAL_TYPES.find((m) => m.key === meal)?.label ?? meal.toUpperCase();

 return (
 <Modal visible={visible} transparent animationType="fade">
 <div
 className="flex-1 flex justify-center items-end"
 style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
 >
 <motion.div
 initial={{ opacity: 0, y: 40 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.25, ease: 'easeOut' }}
 className="w-full bg-awan-surface rounded-t-3xl border-t border-white/10 overflow-hidden"
 style={{ maxHeight: '90vh' }}
 >
 <div className="flex justify-center pt-3 pb-1">
 <div className="w-10 h-1 bg-white/20 " />
 </div>

 <div className="px-6 pb-4 border-b border-white/5 flex flex-row justify-between items-center">
 <div className="flex flex-col">
 <span className="awan-label text-awan-gold mb-1 block">
 AJOUTER · {mealLabel}
 </span>
 <span className="text-xl font-bold text-awan-tx uppercase tracking-tight">
 {selected ? selected.n : 'CHOISIR ALIMENT'}
 </span>
 </div>
 <Touch
 onPress={onClose}
 className="w-10 h-10 bg-white/5 flex items-center justify-center border border-white/10"
 >
 <X size={18} className="text-awan-tx-mute" />
 </Touch>
 </div>

 {!selected ? (
 <div className="p-6">
 <div className="flex flex-row items-center gap-3 bg-awan-bg border border-white/5 px-4 py-3 mb-4">
 <Search size={16} className="text-awan-tx-mute" />
 <TextInput
 className="flex-1 text-sm font-bold text-awan-tx outline-none bg-transparent"
 placeholder="RECHERCHER ALIMENT..."
 placeholderTextColor="rgba(255,255,255,0.2)"
 value={query}
 onChangeText={setQuery}
 autoFocus
 />
 </div>

 {!foodsReady && (
 <div className="text-center py-8">
 <span className="text-[10px] font-black uppercase tracking-widest text-awan-tx-mute">
 CHARGEMENT BASE...
 </span>
 </div>
 )}

 {foodsReady && !query.trim() && results.length > 0 && (
 <div className="mb-2">
 <span className="text-[8px] font-black uppercase tracking-widest text-awan-gold block mb-1">RÉCENTS</span>
 </div>
 )}
 {foodsReady && !query.trim() && results.length === 0 && (
 <div className="text-center py-8">
 <span className="text-[10px] font-black uppercase tracking-widest text-awan-tx-mute">
 TAPEZ POUR RECHERCHER
 </span>
 </div>
 )}
 {foodsReady && query.trim() && results.length === 0 && (
 <div className="text-center py-8">
 <span className="text-[10px] font-black uppercase tracking-widest text-awan-tx-mute">
 AUCUN RÉSULTAT
 </span>
 </div>
 )}

 <FlatList
 data={results}
 keyExtractor={(item: FoodEntry) => item.id}
 style={{ maxHeight: 360 }}
 renderItem={({ item }: { item: FoodEntry }) => (
 <Touch
 onPress={() => setSelected(item)}
 className="w-full mb-2 text-left"
 >
 <div className="bg-white/5 border border-white/5 px-4 py-3 flex flex-row items-center justify-between">
 <div className="flex-1">
 <span className="text-sm font-bold text-awan-tx uppercase tracking-tight block">
 {item.n}
 </span>
 <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest mt-1 block font-mono">
 {item.kcal} KCAL · P{item.p} · G{item.c} · L{item.f}
 {' '}/ 100G
 </span>
 </div>
 <div className="w-8 h-8 bg-awan-gold/15 border border-awan-gold/20 flex items-center justify-center">
 <Plus size={16} className="text-awan-gold" />
 </div>
 </div>
 </Touch>
 )}
 />
 </div>
 ) : (
 <ScrollView
 style={{ maxHeight: 520 }}
 contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
 >
 <div className="flex flex-col gap-4">
 <div>
 <span className="awan-label mb-2 block">QUANTITÉ (G)</span>
 <TextInput
 className="bg-awan-bg border border-white/5 px-5 py-4 text-sm font-bold text-awan-tx font-mono"
 placeholder="100"
 placeholderTextColor="#6C665E"
 value={grams}
 onChangeText={setGrams}
 keyboardType="decimal-pad"
 />
 </div>

 <div>
 <span className="awan-label mb-2 block">
 HEURE (OPTIONNEL)
 </span>
 <TextInput
 className="bg-awan-bg border border-white/5 px-5 py-4 text-sm font-bold text-awan-tx font-mono"
 placeholder="13:30"
 placeholderTextColor="#6C665E"
 value={time}
 onChangeText={setTime}
 />
 </div>

 {preview && (
 <Card className="bg-white/5 border-awan-gold/20 p-5">
 <span className="awan-label text-awan-gold mb-3 block">
 APERÇU MACROS
 </span>
 <div className="grid grid-cols-4 gap-2">
 <div className="bg-awan-surface p-2 border border-white/5 text-center">
 <span className="text-[8px] font-black text-awan-gold uppercase tracking-widest block mb-1">
 KCAL
 </span>
 <span className="text-sm font-mono font-bold text-awan-tx">
 {preview.kcal}
 </span>
 </div>
 <div className="bg-awan-surface p-2 border border-white/5 text-center">
 <span className="text-[8px] font-black text-awan-tx-mute uppercase tracking-widest block mb-1">
 P
 </span>
 <span className="text-sm font-mono font-bold text-awan-tx">
 {preview.p}
 </span>
 </div>
 <div className="bg-awan-surface p-2 border border-white/5 text-center">
 <span className="text-[8px] font-black text-awan-tx-mute uppercase tracking-widest block mb-1">
 G
 </span>
 <span className="text-sm font-mono font-bold text-awan-tx">
 {preview.c}
 </span>
 </div>
 <div className="bg-awan-surface p-2 border border-white/5 text-center">
 <span className="text-[8px] font-black text-awan-tx-mute uppercase tracking-widest block mb-1">
 L
 </span>
 <span className="text-sm font-mono font-bold text-awan-tx">
 {preview.f}
 </span>
 </div>
 </div>
 </Card>
 )}

 <Touch
 onPress={() => setSelected(null)}
 className="h-10 bg-white/5 border border-white/10 flex items-center justify-center"
 >
 <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest">
 ← CHANGER D'ALIMENT
 </span>
 </Touch>
 </div>
 </ScrollView>
 )}

 {selected && (
 <div className="px-6 py-4 border-t border-white/5">
 <Touch
 onPress={handleSubmit}
 className="h-12 bg-awan-gold flex items-center justify-center"
 >
 <span className="text-[10px] font-black text-black uppercase tracking-widest">
 AJOUTER
 </span>
 </Touch>
 </div>
 )}
 </motion.div>
 </div>
 </Modal>
 );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
 visible: boolean;
 entry: MealEntryLatest | null;
 onClose: () => void;
 onUpdate: (
 entry: MealEntryLatest,
 grams: number,
 timeHHMM: string | undefined,
 ) => void;
}

function EditMealModal({ visible, entry, onClose, onUpdate }: EditModalProps) {
 const [grams, setGrams] = useState('');
 const [time, setTime] = useState('');

 useEffect(() => {
 if (entry) {
 setGrams(String(entry.grams ?? 100));
 setTime(entry.timeHHMM ?? '');
 }
 }, [entry]);

 if (!entry) {
 return (
 <Modal visible={visible} transparent animationType="fade">
 <View />
 </Modal>
 );
 }

 const gramsNum = parseFloat(grams);
 // Reverse-engineer per-100g values from existing entry if grams known
 const base100 = entry.grams && entry.grams > 0
 ? {
 kcal: (entry.kcal / entry.grams) * 100,
 p: (entry.p / entry.grams) * 100,
 c: (entry.c / entry.grams) * 100,
 f: (entry.f / entry.grams) * 100,
 }
 : { kcal: entry.kcal, p: entry.p, c: entry.c, f: entry.f };
 const preview = gramsNum > 0 ? calcMacros(base100, gramsNum) : null;
 const timeValid = !time.trim() || /^\d{2}:\d{2}$/.test(time.trim());

 const handleSubmit = () => {
 if (!gramsNum || gramsNum <= 0) {
 Alert.alert('Erreur', 'Grammes invalides');
 return;
 }
 if (!timeValid) {
 Alert.alert('Erreur', 'Heure invalide (format HH:MM)');
 return;
 }
 const t = time.trim() ? time.trim() : undefined;
 onUpdate(entry, gramsNum, t);
 };

 return (
 <Modal visible={visible} transparent animationType="fade">
 <div
 className="flex-1 flex justify-center items-end"
 style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
 >
 <motion.div
 initial={{ opacity: 0, y: 40 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.25, ease: 'easeOut' }}
 className="w-full bg-awan-surface rounded-t-3xl border-t border-white/10 overflow-hidden"
 style={{ maxHeight: '90vh' }}
 >
 <div className="flex justify-center pt-3 pb-1">
 <div className="w-10 h-1 bg-white/20 " />
 </div>

 <div className="px-6 pb-4 border-b border-white/5 flex flex-row justify-between items-center">
 <div className="flex flex-col">
 <span className="awan-label text-awan-gold mb-1 block">
 MODIFIER ENTRÉE
 </span>
 <span className="text-xl font-bold text-awan-tx uppercase tracking-tight">
 {entry.name}
 </span>
 </div>
 <Touch
 onPress={onClose}
 className="w-10 h-10 bg-white/5 flex items-center justify-center border border-white/10"
 >
 <X size={18} className="text-awan-tx-mute" />
 </Touch>
 </div>

 <ScrollView
 style={{ maxHeight: 520 }}
 contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
 >
 <div className="flex flex-col gap-4">
 <div>
 <span className="awan-label mb-2 block">QUANTITÉ (G)</span>
 <TextInput
 className="bg-awan-bg border border-white/5 px-5 py-4 text-sm font-bold text-awan-tx font-mono"
 placeholder="100"
 placeholderTextColor="#6C665E"
 value={grams}
 onChangeText={setGrams}
 keyboardType="decimal-pad"
 />
 </div>

 <div>
 <span className="awan-label mb-2 block">
 HEURE (OPTIONNEL)
 </span>
 <TextInput
 className="bg-awan-bg border border-white/5 px-5 py-4 text-sm font-bold text-awan-tx font-mono"
 placeholder="13:30"
 placeholderTextColor="#6C665E"
 value={time}
 onChangeText={setTime}
 />
 </div>

 {preview && (
 <Card className="bg-white/5 border-awan-gold/20 p-5">
 <span className="awan-label text-awan-gold mb-3 block">
 APERÇU MACROS
 </span>
 <div className="grid grid-cols-4 gap-2">
 <div className="bg-awan-surface p-2 border border-white/5 text-center">
 <span className="text-[8px] font-black text-awan-gold uppercase tracking-widest block mb-1">
 KCAL
 </span>
 <span className="text-sm font-mono font-bold text-awan-tx">
 {preview.kcal}
 </span>
 </div>
 <div className="bg-awan-surface p-2 border border-white/5 text-center">
 <span className="text-[8px] font-black text-awan-tx-mute uppercase tracking-widest block mb-1">
 P
 </span>
 <span className="text-sm font-mono font-bold text-awan-tx">
 {preview.p}
 </span>
 </div>
 <div className="bg-awan-surface p-2 border border-white/5 text-center">
 <span className="text-[8px] font-black text-awan-tx-mute uppercase tracking-widest block mb-1">
 G
 </span>
 <span className="text-sm font-mono font-bold text-awan-tx">
 {preview.c}
 </span>
 </div>
 <div className="bg-awan-surface p-2 border border-white/5 text-center">
 <span className="text-[8px] font-black text-awan-tx-mute uppercase tracking-widest block mb-1">
 L
 </span>
 <span className="text-sm font-mono font-bold text-awan-tx">
 {preview.f}
 </span>
 </div>
 </div>
 </Card>
 )}
 </div>
 </ScrollView>

 <div className="px-6 py-4 border-t border-white/5">
 <Touch
 onPress={handleSubmit}
 className="h-12 bg-awan-gold flex items-center justify-center"
 >
 <span className="text-[10px] font-black text-black uppercase tracking-widest">
 METTRE À JOUR
 </span>
 </Touch>
 </div>
 </motion.div>
 </div>
 </Modal>
 );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NutritionScreen() {
 useAppState();
 const { addEntry } = useDaily();

 const today = ds(new Date());
 const [selectedDate, setSelectedDate] = useState<string>(today);
 const [selectedMeal, setSelectedMeal] = useState<MealType>('dejeuner');

 const mealStore = useMealStore(selectedDate);

 const [foodsReady, setFoodsReady] = useState(false);
 const [profile, setProfile] = useState<NutritionProfile | null>(() =>
 loadProfile(),
 );
 const [showOnboarding, setShowOnboarding] = useState(() => !loadProfile());
 const [showAdd, setShowAdd] = useState(false);
 const [editEntry, setEditEntry] = useState<MealEntryLatest | null>(null);

 useEffect(() => {
 loadFoodDatabase()
 .then(() => setFoodsReady(true))
 .catch(() => setFoodsReady(true));
 }, []);

 // Skip onboarding if seed data exists — initialize default profile (179cm, 22/09/1996, 82kg)
 useEffect(() => {
 if (!showOnboarding) return;
 import('@/data/storage/storageService').then(({ getStorage }) =>
   getStorage().then(async (storage) => {
     const keys = await storage.list('nutrition.meal');
     if (keys.length > 0) {
       const defaultProfile = computeProfile(82, 179, 29, 'moderate', 'maintain');
       saveProfile(defaultProfile);
       setProfile(defaultProfile);
       setShowOnboarding(false);
     }
   })
 );
 }, [showOnboarding]);

 const canGoNext = selectedDate < today;

 const handlePrevDay = () => setSelectedDate(shiftDate(selectedDate, -1));
 const handleNextDay = () => {
 if (canGoNext) setSelectedDate(shiftDate(selectedDate, 1));
 };

 const dayEntries = mealStore.meals;
 const mealEntries = useMemo(
 () => dayEntries.filter((e) => (e.meal ?? 'dejeuner') === selectedMeal),
 [dayEntries, selectedMeal],
 );
 const totals = mealStore.totals;

 const handleAdd = (
 food: FoodEntry,
 grams: number,
 timeHHMM: string | undefined,
 ) => {
 const macros = calcMacros(food, grams);
 const now = Date.now();
 const entryId = uid();
 const entry: MealEntryLatest = {
 v: 1,
 id: entryId,
 date: selectedDate,
 name: food.n,
 kcal: macros.kcal,
 p: macros.p,
 c: macros.c,
 f: macros.f,
 timestamp: now,
 source: 'db',
 meal: selectedMeal,
 grams,
 foodId: food.id,
 ...(timeHHMM !== undefined ? { timeHHMM } : {}),
 };
 void mealStore.add(entry);
 recordRecentFood(food.id);
 addEntry(selectedDate, {
 id: entryId,
 timestamp: now,
 module: 'nutrition',
 rawText: `${food.n} ${grams}g ${macros.kcal}kcal`,
 tokens: [
 { label: 'Aliment', value: food.n, icon: 'utensils' },
 { label: 'Quantité', value: `${grams}g`, icon: 'scale' },
 { label: 'Énergie', value: `${macros.kcal}kcal`, icon: 'flame' },
 ],
 });
 setShowAdd(false);
 };

 const handleUpdate = (
 entry: MealEntryLatest,
 grams: number,
 timeHHMM: string | undefined,
 ) => {
 const base100 = entry.grams && entry.grams > 0
 ? {
 kcal: (entry.kcal / entry.grams) * 100,
 p: (entry.p / entry.grams) * 100,
 c: (entry.c / entry.grams) * 100,
 f: (entry.f / entry.grams) * 100,
 }
 : { kcal: entry.kcal, p: entry.p, c: entry.c, f: entry.f };
 const macros = calcMacros(base100, grams);
 const updated: MealEntryLatest = {
 v: 1,
 id: entry.id,
 date: entry.date,
 name: entry.name,
 kcal: macros.kcal,
 p: macros.p,
 c: macros.c,
 f: macros.f,
 timestamp: entry.timestamp,
 source: entry.source,
 meal: entry.meal ?? selectedMeal,
 grams,
 ...(entry.foodId !== undefined ? { foodId: entry.foodId } : {}),
 ...(timeHHMM !== undefined ? { timeHHMM } : {}),
 };
 void mealStore.update(updated);
 setEditEntry(null);
 };

 const handleDelete = (id: string) => {
 if (typeof window !== 'undefined') {
 const ok = window.confirm('Supprimer cette entrée ?');
 if (!ok) return;
 }
 void mealStore.remove(id);
 };

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

 {/* Day Selector */}
 <div className="px-6 mb-6">
 <Card className="p-0 bg-white/5 border-white/5" variant="flat">
 <div className="flex flex-row items-center justify-between px-2 py-2">
 <Touch
 onPress={handlePrevDay}
 className="w-10 h-10 bg-white/5 border border-white/5 flex items-center justify-center"
 >
 <ChevronLeft size={18} className="text-awan-gold" />
 </Touch>
 <div className="flex flex-col items-center">
 <span className="text-[9px] font-black uppercase tracking-widest text-awan-tx-mute font-mono">
 CYCLE
 </span>
 <span className="text-sm font-bold text-awan-gold uppercase tracking-widest font-mono">
 {formatDayLabel(selectedDate)}
 </span>
 </div>
 <Touch
 onPress={handleNextDay}
 disabled={!canGoNext}
 className={`w-10 h-10 border flex items-center justify-center ${
 canGoNext
 ? 'bg-white/5 border-white/5'
 : 'bg-white/5 border-white/5 opacity-30'
 }`}
 >
 <ChevronRight
 size={18}
 className={canGoNext ? 'text-awan-gold' : 'text-awan-tx-mute'}
 />
 </Touch>
 </div>
 </Card>
 </div>

 {/* Meal Selector */}
 <div className="px-6 mb-6">
 <div className="grid grid-cols-4 gap-2">
 {MEAL_TYPES.map((m) => {
 const active = m.key === selectedMeal;
 return (
 <Touch
 key={m.key}
 onPress={() => setSelectedMeal(m.key)}
 className={`px-2 py-3 border flex items-center justify-center ${
 active
 ? 'bg-awan-gold/15 border-awan-gold'
 : 'bg-white/5 border-white/5'
 }`}
 >
 <span
 className={`text-[9px] font-black uppercase tracking-widest ${
 active ? 'text-awan-gold' : 'text-awan-tx-mute'
 }`}
 >
 {m.label}
 </span>
 </Touch>
 );
 })}
 </div>
 </div>

 {/* Day Totals */}
 <div className="px-6 mb-8">
 <Card className="p-6 bg-awan-surface border-awan-gold/20">
 <div className="flex justify-between items-center mb-6">
 <div className="flex flex-col">
 <span className="awan-label text-awan-gold">INDEX CALORIQUE</span>
 <div className="flex flex-row items-baseline gap-2">
 <span className="text-4xl font-bold font-mono tracking-tighter text-awan-tx">
 {totals.kcal}
 </span>
 {profile && (
 <span className="text-sm font-mono font-bold text-awan-tx-mute">
 / {profile.targetKcal}
 </span>
 )}
 </div>
 </div>
 <div className="w-12 h-12 bg-awan-gold/10 flex items-center justify-center border border-awan-gold/20">
 <UtensilsCrossed size={20} className="text-awan-gold" />
 </div>
 </div>

 {profile && (
 <div className="mb-4">
 <ProgressBar
 label="ÉNERGIE"
 actual={totals.kcal}
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
 actual={totals.p}
 target={profile.targetP}
 unit="g"
 />
 <ProgressBar
 label="GLUCIDES"
 actual={totals.c}
 target={profile.targetC}
 unit="g"
 />
 <ProgressBar
 label="LIPIDES"
 actual={totals.f}
 target={profile.targetF}
 unit="g"
 />
 </>
 ) : (
 <>
 <div className="bg-awan-surface p-3 border border-white/5">
 <span className="text-[8px] font-black text-awan-tx-mute uppercase tracking-widest mb-1 block">
 PROTÉINES
 </span>
 <span className="text-lg font-bold font-mono text-awan-tx">
 {totals.p}g
 </span>
 </div>
 <div className="bg-awan-surface p-3 border border-white/5">
 <span className="text-[8px] font-black text-awan-tx-mute uppercase tracking-widest mb-1 block">
 GLUCIDES
 </span>
 <span className="text-lg font-bold font-mono text-awan-tx">
 {totals.c}g
 </span>
 </div>
 <div className="bg-awan-surface p-3 border border-white/5">
 <span className="text-[8px] font-black text-awan-tx-mute uppercase tracking-widest mb-1 block">
 LIPIDES
 </span>
 <span className="text-lg font-bold font-mono text-awan-tx">
 {totals.f}g
 </span>
 </div>
 </>
 )}
 </div>
 </Card>
 </div>

 {/* Meal Entries */}
 <div className="px-6 mb-8">
 <Heading
 level={4}
 mono
 subtitle={
 MEAL_TYPES.find((m) => m.key === selectedMeal)?.label ?? ''
 }
 >
 ENTRÉES DU REPAS
 </Heading>

 {mealEntries.length === 0 ? (
 <Card
 className="p-6 bg-white/5 border-white/5 items-center"
 variant="flat"
 >
 <span className="text-[10px] font-black uppercase tracking-widest text-awan-tx-mute text-center block">
 AUCUNE ENTRÉE
 </span>
 <span className="text-xs font-bold text-awan-tx-mute opacity-70 mt-2 block text-center">
 Ajouter un aliment ci-dessous.
 </span>
 </Card>
 ) : (
 <div className="flex flex-col gap-3">
 <AnimatePresence>
 {mealEntries.map((m) => (
 <motion.div
 key={m.id}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ duration: 0.2 }}
 >
 <Card
 className="flex-row items-center gap-4 py-4 px-5"
 variant="flat"
 >
 <div className="flex-1">
 <div className="flex flex-row items-baseline gap-2">
 <span className="text-sm font-bold text-awan-tx uppercase tracking-tight">
 {m.name}
 </span>
 {m.grams !== undefined && (
 <span className="text-[10px] font-mono font-bold text-awan-gold">
 {m.grams}g
 </span>
 )}
 {m.timeHHMM && (
 <span className="text-[9px] font-mono font-bold text-awan-tx-mute">
 · {m.timeHHMM}
 </span>
 )}
 </div>
 <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest mt-1 block font-mono">
 {m.kcal} KCAL · P{m.p} · G{m.c} · L{m.f}
 </span>
 </div>
 <Touch
 onPress={() => setEditEntry(m)}
 className="w-9 h-9 bg-white/5 flex items-center justify-center border border-white/10"
 >
 <Pencil size={14} className="text-awan-tx-mute" />
 </Touch>
 <Touch
 onPress={() => handleDelete(m.id)}
 className="w-9 h-9 bg-awan-status-error/10 flex items-center justify-center border border-awan-status-error/20"
 >
 <Trash2 size={14} className="text-awan-status-error" />
 </Touch>
 </Card>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 )}
 </div>

 {/* Add Button */}
 <div className="px-6 mb-10">
 <Touch
 onPress={() => setShowAdd(true)}
 className="h-14 bg-awan-gold flex items-center justify-center shadow-lg shadow-awan-gold/10"
 >
 <div className="flex flex-row items-center gap-3">
 <Plus size={18} color="black" strokeWidth={3} />
 <span className="text-[10px] font-black text-black uppercase tracking-widest">
 AJOUTER UN ALIMENT
 </span>
 </div>
 </Touch>
 </div>
 </ScrollView>

 <AddMealModal
 visible={showAdd}
 meal={selectedMeal}
 foodsReady={foodsReady}
 onClose={() => setShowAdd(false)}
 onAdd={handleAdd}
 />

 <EditMealModal
 visible={editEntry !== null}
 entry={editEntry}
 onClose={() => setEditEntry(null)}
 onUpdate={handleUpdate}
 />
 </PageWrapper>
 );
}
