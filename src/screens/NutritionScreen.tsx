import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
 View,
 Text,
 ScrollView,
 TextInput as RNTextInput,
 FlatList as RNFlatList,
 Modal,
 Alert,
 Platform,
 StyleSheet,
} from 'react-native';
import {
 X,
 CheckCircle,
 Plus,
 Search,
 UtensilsCrossed,
 Trash2,
 Pencil,
 Download,
 BarChart2,
} from 'lucide-react-native';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useAppState } from '../context/AppStateContext';
import { useDaily } from '../context/DailyContext';
import { ds, uid } from '../utils/storage';
import { useMealStore } from '../hooks/useMealStore';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';
import { InstrumentCard } from '../components/ui/InstrumentCard';
import { DateSelectPopup } from '../components/ui/DateSelectPopup';
import type { StatusVariant } from '../components/ui/InstrumentCard';
import { L } from '../constants/labels';
import { FIBER_TARGET_G_PER_DAY, ADHERENCE_OK_THRESHOLD, ADHERENCE_WARN_THRESHOLD } from '../constants/app';
import {
 loadFoodDatabase,
 loadCustomFoods,
 saveCustomFood,
 searchFoods,
 getRecentFoods,
 recordRecentFood,
 type FoodEntry,
} from '../utils/nutritionData';
import { safeStorage } from '../utils/safeStorage';
import type {
 MealEntryLatest,
 MealType,
} from '../data/schemas/nutrition/mealEntry';
import { MEAL_TYPE_TO_SLOT } from '../data/schemas/nutrition/mealEntry';
import { WaterService } from '../services/waterService';
import { buildWeeklyNutritionReport, reportDiagnostic } from '../services/weeklyNutritionReport';
import type { WeeklyNutritionReport } from '../services/weeklyNutritionReport';
import { buildNutritionExport } from '../services/nutritionExportService';
import { estimateAdaptiveTDEE } from '../services/tdeeAdaptiveService';
import { scoreMeal } from '../services/nutritionScoreService';
import { useTheme, type AwanTheme } from '../hooks/useTheme';
import { FontMono } from '../constants/typography';
import { Fs, Fw, Ls, Clr } from '../theme/tokens';

const TextInput = RNTextInput as React.ComponentType<any>;
const FlatList = RNFlatList as React.ComponentType<any>;

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
 return { weightKg, heightCm, age, activity, goal, targetKcal, targetP, targetC, targetF };
}

function loadProfile(): NutritionProfile | null {
 try {
 const raw = safeStorage.get(PROFILE_KEY);
 if (!raw) return null;
 return JSON.parse(raw) as NutritionProfile;
 } catch {
 return null;
 }
}

function saveProfile(p: NutritionProfile): void {
 safeStorage.set(PROFILE_KEY, JSON.stringify(p));
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
void formatDayLabel;

function calcMacros(
 food: { kcal: number; p: number; c: number; f: number; fiberG?: number },
 grams: number,
): { kcal: number; p: number; c: number; f: number; fiberG?: number } {
 const ratio = grams / 100;
 return {
 kcal: Math.round(food.kcal * ratio),
 p: Math.round(food.p * ratio * 10) / 10,
 c: Math.round(food.c * ratio * 10) / 10,
 f: Math.round(food.f * ratio * 10) / 10,
 ...(food.fiberG !== undefined ? { fiberG: Math.round(food.fiberG * ratio * 10) / 10 } : {}),
 };
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function statusColor(actual: number, target: number, t: Pick<AwanTheme, 'statusOk' | 'statusWarn' | 'danger'>): string {
 if (target <= 0) return t.statusWarn;
 const ratio = actual / target;
 const delta = Math.abs(ratio - 1);
 if (delta <= 0.1) return t.statusOk;
 if (delta <= 0.2) return t.statusWarn;
 return t.danger;
}

interface ProgressBarProps {
 label: string;
 actual: number;
 target: number;
 unit: string;
 accent?: string | undefined;
}

function ProgressBar({ label, actual, target, unit, accent }: ProgressBarProps) {
 const theme = useTheme();
 const color = statusColor(actual, target, theme);
 const pct = target > 0 ? Math.min((actual / target) * 100, 120) : 0;
 return (
 <View style={{ backgroundColor: theme.surface, padding: 12, borderWidth: 1, borderColor: Clr.white5 }}>
 <View style={{ marginBottom: 8 }}>
 <Text style={[sn.xs, { color: accent ?? color }]}>{label}</Text>
 <Text style={{ fontSize: Fs.md, fontFamily: FontMono, fontWeight: Fw.value, color: theme.mute }}>
 <Text style={{ color, fontWeight: Fw.value }}>{Math.round(actual)}</Text>{` / ${target}${unit}`}
 </Text>
 </View>
 <View style={{ height: 6, backgroundColor: Clr.white5, overflow: 'hidden' }}>
 <View style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
 </View>
 </View>
 );
}

// ─── Onboarding Modal ─────────────────────────────────────────────────────────

interface OnboardingProps {
 onComplete: (profile: NutritionProfile) => void;
}

function OnboardingModal({ onComplete }: OnboardingProps) {
 const theme = useTheme();
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
 <View style={[sn.sheetOverlay, { backgroundColor: theme.overlay }]}>
 <View style={[sn.sheet, { backgroundColor: theme.surface }]}>
 <View style={sn.grabberWrap}><View style={sn.grabber} /></View>

 <View style={{ paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Clr.white5 }}>
 <Text style={[sn.label, { color: theme.selected, marginBottom: 4 }]}>CALIBRATION MÉTABOLIQUE · ÉTAPE {step}/3</Text>
 <Text style={{ fontSize: 20, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.4 }}>
 {step === 1 && 'PROFIL BIOMÉTRIQUE'}
 {step === 2 && "NIVEAU D'ACTIVITÉ"}
 {step === 3 && 'OBJECTIF ÉNERGÉTIQUE'}
 </Text>
 </View>

 <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ padding: 24, paddingBottom: 32 }}>
 {step === 1 && (
 <View style={{ gap: 16 }}>
 <View>
 <Text style={[sn.label, { color: theme.mute, marginBottom: 8 }]}>POIDS (KG)</Text>
 <TextInput style={[sn.field, { backgroundColor: theme.bg, color: theme.title }]} placeholder="75" placeholderTextColor="#6C665E" value={weight} onChangeText={setWeight} keyboardType="numeric" />
 </View>
 <View>
 <Text style={[sn.label, { color: theme.mute, marginBottom: 8 }]}>TAILLE (CM)</Text>
 <TextInput style={[sn.field, { backgroundColor: theme.bg, color: theme.title }]} placeholder="175" placeholderTextColor="#6C665E" value={height} onChangeText={setHeight} keyboardType="numeric" />
 </View>
 <View>
 <Text style={[sn.label, { color: theme.mute, marginBottom: 8 }]}>ÂGE (ANS)</Text>
 <TextInput style={[sn.field, { backgroundColor: theme.bg, color: theme.title }]} placeholder="25" placeholderTextColor="#6C665E" value={age} onChangeText={setAge} keyboardType="numeric" />
 </View>
 </View>
 )}

 {step === 2 && (
 <View style={{ gap: 12 }}>
 {([
 { k: 'sedentary', l: 'SÉDENTAIRE', d: "Peu ou pas d'exercice" },
 { k: 'light', l: 'LÉGER', d: '1-3 sessions / semaine' },
 { k: 'moderate', l: 'MODÉRÉ', d: '3-5 sessions / semaine' },
 { k: 'active', l: 'ACTIF', d: '6-7 sessions / semaine' },
 { k: 'veryActive', l: 'TRÈS ACTIF', d: 'Quotidien + physique' },
 ] as Array<{ k: Activity; l: string; d: string }>).map((opt) => {
 const active = activity === opt.k;
 return (
 <Touch key={opt.k} onPress={() => setActivity(opt.k)} style={{ padding: 16, borderWidth: 1, backgroundColor: active ? Clr.gold12 : Clr.white5, borderColor: active ? `${theme.selected}66` : Clr.white5 }}>
 <View style={sn.rowBetween}>
 <View>
 <Text style={[sn.md, { color: active ? theme.selected : theme.mute, marginBottom: 4 }]}>{opt.l}</Text>
 <Text style={{ fontSize: 12, fontWeight: Fw.value, color: theme.title, opacity: 0.8 }}>{opt.d}</Text>
 </View>
 {active && <CheckCircle size={18} color={theme.selected} />}
 </View>
 </Touch>
 );
 })}
 </View>
 )}

 {step === 3 && (
 <View style={{ gap: 12 }}>
 {([
 { k: 'lose', l: 'PERTE', d: '−300 kcal / jour' },
 { k: 'maintain', l: 'MAINTIEN', d: 'TDEE équilibré' },
 { k: 'gain', l: 'PRISE', d: '+300 kcal / jour' },
 ] as Array<{ k: Goal; l: string; d: string }>).map((opt) => {
 const active = goal === opt.k;
 return (
 <Touch key={opt.k} onPress={() => setGoal(opt.k)} style={{ padding: 16, borderWidth: 1, backgroundColor: active ? Clr.gold12 : Clr.white5, borderColor: active ? `${theme.selected}66` : Clr.white5 }}>
 <View style={sn.rowBetween}>
 <View>
 <Text style={[sn.md, { color: active ? theme.selected : theme.mute, marginBottom: 4 }]}>{opt.l}</Text>
 <Text style={{ fontSize: 12, fontWeight: Fw.value, color: theme.title, opacity: 0.8 }}>{opt.d}</Text>
 </View>
 {active && <CheckCircle size={18} color={theme.selected} />}
 </View>
 </Touch>
 );
 })}
 </View>
 )}
 </ScrollView>

 <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: Clr.white5, flexDirection: 'row', gap: 12 }}>
 {step > 1 && (
 <Touch onPress={() => setStep((step - 1) as 1 | 2 | 3)} style={{ flex: 1, height: 48, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white10, alignItems: 'center', justifyContent: 'center' }}>
 <Text style={[sn.md, { color: theme.mute }]}>RETOUR</Text>
 </Touch>
 )}
 {step < 3 ? (
 <Touch onPress={() => { if (step === 1 && !canNext1) return; setStep((step + 1) as 1 | 2 | 3); }} style={{ flex: 1, height: 48, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}>
 <Text style={[sn.md, { color: '#000' }]}>CONTINUER</Text>
 </Touch>
 ) : (
 <Touch onPress={handleSubmit} style={{ flex: 1, height: 48, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}>
 <Text style={[sn.md, { color: '#000' }]}>CALCULER & CONTINUER</Text>
 </Touch>
 )}
 </View>
 </View>
 </View>
 </Modal>
 );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

interface AddModalProps {
 visible: boolean;
 mealLabel?: string | undefined;
 foodsReady: boolean;
 onClose: () => void;
 onAdd: (food: FoodEntry, grams: number, timeHHMM: string | undefined) => void;
}

function MacroPreview({ preview }: { preview: { kcal: number; p: number; c: number; f: number } }) {
 const theme = useTheme();
 const cells: Array<[string, number, boolean]> = [
 ['KCAL', preview.kcal, true],
 ['P', preview.p, false],
 ['G', preview.c, false],
 ['L', preview.f, false],
 ];
 return (
 <Card style={{ backgroundColor: Clr.white5, borderColor: Clr.gold20, padding: 20 }}>
 <Text style={[sn.label, { color: theme.selected, marginBottom: 12 }]}>APERÇU MACROS</Text>
 <View style={{ flexDirection: 'row', gap: 8 }}>
 {cells.map(([k, v, gold]) => (
 <View key={k} style={[sn.macroBox, { backgroundColor: theme.surface }]}>
 <Text style={[sn.xs, { color: gold ? theme.selected : theme.mute, marginBottom: 4 }]}>{k}</Text>
 <Text style={{ fontSize: 14, fontFamily: FontMono, fontWeight: Fw.value, color: theme.title }}>{v}</Text>
 </View>
 ))}
 </View>
 </Card>
 );
}

function AddMealModal({ visible, mealLabel: _mealLabel, foodsReady, onClose, onAdd }: AddModalProps) {
 const theme = useTheme();
 const [query, setQuery] = useState('');
 const [selected, setSelected] = useState<FoodEntry | null>(null);
 const [grams, setGrams] = useState('100');
 const [time, setTime] = useState('');
 const [customMode, setCustomMode] = useState(false);
 const [customName, setCustomName] = useState('');
 const [customKcal, setCustomKcal] = useState('');
 const [customP, setCustomP] = useState('');
 const [customC, setCustomC] = useState('');
 const [customF, setCustomF] = useState('');

 useEffect(() => {
 if (!visible) {
 setQuery('');
 setSelected(null);
 setGrams('100');
 setTime('');
 setCustomMode(false);
 setCustomName(''); setCustomKcal(''); setCustomP(''); setCustomC(''); setCustomF('');
 }
 }, [visible]);

 const results = useMemo<FoodEntry[]>(() => {
 if (!foodsReady) return [];
 if (!query.trim()) return getRecentFoods().slice(0, 10);
 return searchFoods(query).slice(0, 30);
 }, [query, foodsReady]);

 const gramsNum = parseFloat(grams);
 const preview = selected && gramsNum > 0 ? calcMacros(selected, gramsNum) : null;
 const timeValid = !time.trim() || /^\d{2}:\d{2}$/.test(time.trim());

 const handleSubmit = () => {
 if (!selected) return;
 if (!gramsNum || gramsNum <= 0) { Alert.alert('Erreur', 'Grammes invalides'); return; }
 if (!timeValid) { Alert.alert('Erreur', 'Heure invalide (format HH:MM)'); return; }
 const t = time.trim() ? time.trim() : undefined;
 onAdd(selected, gramsNum, t);
 };

 const handleCustomSubmit = () => {
 const kcalNum = parseFloat(customKcal);
 if (!customName.trim() || isNaN(kcalNum) || kcalNum <= 0) { Alert.alert('Erreur', 'Nom et kcal requis'); return; }
 const pNum = parseFloat(customP) || 0;
 const cNum = parseFloat(customC) || 0;
 const fNum = parseFloat(customF) || 0;
 const customFood: FoodEntry = {
 id: `custom-${Date.now()}`,
 n: customName.trim().toUpperCase(),
 kcal: Math.round(kcalNum),
 p: Math.round(pNum * 10) / 10,
 c: Math.round(cNum * 10) / 10,
 f: Math.round(fNum * 10) / 10,
 halal: true,
 };
 const t = time.trim() ? time.trim() : undefined;
 void saveCustomFood(customFood);
 onAdd(customFood, 100, t);
 };

 const mealLabel = _mealLabel ?? 'REPAS';

 return (
 <Modal visible={visible} transparent animationType="fade">
 <View style={[sn.sheetOverlay, { backgroundColor: theme.overlay }]}>
 <View style={[sn.sheet, { backgroundColor: theme.surface }]}>
 <View style={sn.grabberWrap}><View style={sn.grabber} /></View>

 <View style={[sn.rowBetween, { paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Clr.white5 }]}>
 <View>
 <Text style={[sn.label, { color: theme.selected, marginBottom: 4 }]}>AJOUTER · {mealLabel}</Text>
 <Text style={{ fontSize: 20, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.4 }}>{selected ? selected.n : 'CHOISIR ALIMENT'}</Text>
 </View>
 <Touch onPress={onClose} style={{ width: 40, height: 40, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Clr.white10 }}>
 <X size={18} color={theme.mute} />
 </Touch>
 </View>

 {!selected ? (
 <View style={{ padding: 24 }}>
 {/* N2: Custom aliment toggle */}
 <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
 <Touch onPress={() => setCustomMode(false)} style={{ flex: 1, paddingVertical: 8, borderWidth: 1, alignItems: 'center', backgroundColor: !customMode ? Clr.gold12 : Clr.white5, borderColor: !customMode ? theme.selected : Clr.white5 }}>
 <Text style={[sn.xs, { color: !customMode ? theme.selected : theme.mute }]}>CATALOGUE</Text>
 </Touch>
 <Touch onPress={() => setCustomMode(true)} style={{ flex: 1, paddingVertical: 8, borderWidth: 1, alignItems: 'center', backgroundColor: customMode ? Clr.gold12 : Clr.white5, borderColor: customMode ? theme.selected : Clr.white5 }}>
 <Text style={[sn.xs, { color: customMode ? theme.selected : theme.mute }]}>ALIMENT CUSTOM</Text>
 </Touch>
 </View>
 {customMode ? (
 <View style={{ gap: 12 }}>
 <TextInput style={[sn.fieldSm, { backgroundColor: theme.bg, color: theme.title }]} placeholder="NOM DE L'ALIMENT" placeholderTextColor="rgba(255,255,255,0.2)" value={customName} onChangeText={setCustomName} />
 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
 <TextInput style={[sn.fieldSm, sn.half, { backgroundColor: theme.bg, color: theme.title, fontFamily: FontMono }]} placeholder="KCAL /100G" placeholderTextColor="rgba(255,255,255,0.2)" value={customKcal} onChangeText={setCustomKcal} keyboardType="decimal-pad" />
 <TextInput style={[sn.fieldSm, sn.half, { backgroundColor: theme.bg, color: theme.title, fontFamily: FontMono }]} placeholder="PROTÉINES G" placeholderTextColor="rgba(255,255,255,0.2)" value={customP} onChangeText={setCustomP} keyboardType="decimal-pad" />
 <TextInput style={[sn.fieldSm, sn.half, { backgroundColor: theme.bg, color: theme.title, fontFamily: FontMono }]} placeholder="GLUCIDES G" placeholderTextColor="rgba(255,255,255,0.2)" value={customC} onChangeText={setCustomC} keyboardType="decimal-pad" />
 <TextInput style={[sn.fieldSm, sn.half, { backgroundColor: theme.bg, color: theme.title, fontFamily: FontMono }]} placeholder="LIPIDES G" placeholderTextColor="rgba(255,255,255,0.2)" value={customF} onChangeText={setCustomF} keyboardType="decimal-pad" />
 </View>
 <TextInput style={[sn.fieldSm, { backgroundColor: theme.bg, color: theme.title, fontFamily: FontMono }]} placeholder="HEURE (OPTIONNEL, ex: 13:30)" placeholderTextColor="rgba(255,255,255,0.2)" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" />
 <Touch onPress={handleCustomSubmit} style={{ height: 56, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}>
 <Text style={[sn.label, { color: '#000' }]}>AJOUTER ALIMENT CUSTOM</Text>
 </Touch>
 </View>
 ) : (
 <>
 <View style={[sn.row, { gap: 12, backgroundColor: theme.bg, borderWidth: 1, borderColor: Clr.white5, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 }]}>
 <Search size={16} color={theme.mute} />
 <TextInput style={{ flex: 1, fontSize: 14, fontWeight: Fw.value, color: theme.title, backgroundColor: 'transparent' }} placeholder="RECHERCHER ALIMENT..." placeholderTextColor="rgba(255,255,255,0.2)" value={query} onChangeText={setQuery} autoFocus />
 </View>

 {!foodsReady && (
 <View style={{ alignItems: 'center', paddingVertical: 32 }}>
 <Text style={[sn.md, { color: theme.mute }]}>CHARGEMENT BASE...</Text>
 </View>
 )}

 {foodsReady && !query.trim() && results.length > 0 && (
 <View style={{ marginBottom: 8 }}>
 <Text style={[sn.xs, { color: theme.selected, marginBottom: 4 }]}>RÉCENTS</Text>
 </View>
 )}
 {foodsReady && !query.trim() && results.length === 0 && (
 <View style={{ alignItems: 'center', paddingVertical: 32 }}>
 <Text style={[sn.md, { color: theme.mute }]}>TAPEZ POUR RECHERCHER</Text>
 </View>
 )}
 {foodsReady && query.trim() && results.length === 0 && (
 <View style={{ alignItems: 'center', paddingVertical: 32 }}>
 <Text style={[sn.md, { color: theme.mute }]}>AUCUN RÉSULTAT</Text>
 </View>
 )}

 <FlatList
 data={results}
 keyExtractor={(item: FoodEntry) => item.id}
 style={{ maxHeight: 360 }}
 renderItem={({ item }: { item: FoodEntry }) => (
 <Touch onPress={() => setSelected(item)} style={{ width: '100%', marginBottom: 8 }}>
 <View style={[sn.rowBetween, { backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5, paddingHorizontal: 16, paddingVertical: 12 }]}>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: 14, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.35 }}>{item.n}</Text>
 <Text style={[sn.sm, { color: theme.mute, marginTop: 4, fontFamily: FontMono, fontWeight: Fw.display }]}>{item.kcal} KCAL · P{item.p} · G{item.c} · L{item.f} / 100G</Text>
 </View>
 <View style={{ width: 32, height: 32, backgroundColor: Clr.gold12, borderWidth: 1, borderColor: Clr.gold20, alignItems: 'center', justifyContent: 'center' }}>
 <Plus size={16} color={theme.selected} />
 </View>
 </View>
 </Touch>
 )}
 />
 </>
 )}
 </View>
 ) : (
 <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 24, paddingBottom: 32 }}>
 <View style={{ gap: 16 }}>
 <View>
 <Text style={[sn.label, { color: theme.mute, marginBottom: 8 }]}>QUANTITÉ (G)</Text>
 <TextInput style={[sn.field, { backgroundColor: theme.bg, color: theme.title, fontFamily: FontMono }]} placeholder="100" placeholderTextColor="#6C665E" value={grams} onChangeText={setGrams} keyboardType="decimal-pad" />
 </View>
 <View>
 <Text style={[sn.label, { color: theme.mute, marginBottom: 8 }]}>HEURE (OPTIONNEL)</Text>
 <TextInput style={[sn.field, { backgroundColor: theme.bg, color: theme.title, fontFamily: FontMono }]} placeholder="13:30" placeholderTextColor="#6C665E" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" />
 </View>
 {preview && <MacroPreview preview={preview} />}
 <Touch onPress={() => setSelected(null)} style={{ height: 40, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white10, alignItems: 'center', justifyContent: 'center' }}>
 <Text style={[sn.sm, { color: theme.mute }]}>← CHANGER D'ALIMENT</Text>
 </Touch>
 </View>
 </ScrollView>
 )}

 {selected && (
 <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: Clr.white5 }}>
 <Touch onPress={handleSubmit} style={{ height: 48, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}>
 <Text style={[sn.md, { color: '#000' }]}>AJOUTER</Text>
 </Touch>
 </View>
 )}
 </View>
 </View>
 </Modal>
 );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
 visible: boolean;
 entry: MealEntryLatest | null;
 onClose: () => void;
 onUpdate: (entry: MealEntryLatest, grams: number, timeHHMM: string | undefined) => void;
}

function EditMealModal({ visible, entry, onClose, onUpdate }: EditModalProps) {
 const theme = useTheme();
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
 const base100 = entry.grams && entry.grams > 0
 ? { kcal: (entry.kcal / entry.grams) * 100, p: (entry.p / entry.grams) * 100, c: (entry.c / entry.grams) * 100, f: (entry.f / entry.grams) * 100 }
 : { kcal: entry.kcal, p: entry.p, c: entry.c, f: entry.f };
 const preview = gramsNum > 0 ? calcMacros(base100, gramsNum) : null;
 const timeValid = !time.trim() || /^\d{2}:\d{2}$/.test(time.trim());

 const handleSubmit = () => {
 if (!gramsNum || gramsNum <= 0) { Alert.alert('Erreur', 'Grammes invalides'); return; }
 if (!timeValid) { Alert.alert('Erreur', 'Heure invalide (format HH:MM)'); return; }
 const t = time.trim() ? time.trim() : undefined;
 onUpdate(entry, gramsNum, t);
 };

 return (
 <Modal visible={visible} transparent animationType="fade">
 <View style={[sn.sheetOverlay, { backgroundColor: theme.overlay }]}>
 <View style={[sn.sheet, { backgroundColor: theme.surface }]}>
 <View style={sn.grabberWrap}><View style={sn.grabber} /></View>

 <View style={[sn.rowBetween, { paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Clr.white5 }]}>
 <View>
 <Text style={[sn.label, { color: theme.selected, marginBottom: 4 }]}>MODIFIER ENTRÉE</Text>
 <Text style={{ fontSize: 20, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.4 }}>{entry.name}</Text>
 </View>
 <Touch onPress={onClose} style={{ width: 40, height: 40, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Clr.white10 }}>
 <X size={18} color={theme.mute} />
 </Touch>
 </View>

 <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 24, paddingBottom: 32 }}>
 <View style={{ gap: 16 }}>
 <View>
 <Text style={[sn.label, { color: theme.mute, marginBottom: 8 }]}>QUANTITÉ (G)</Text>
 <TextInput style={[sn.field, { backgroundColor: theme.bg, color: theme.title, fontFamily: FontMono }]} placeholder="100" placeholderTextColor="#6C665E" value={grams} onChangeText={setGrams} keyboardType="decimal-pad" />
 </View>
 <View>
 <Text style={[sn.label, { color: theme.mute, marginBottom: 8 }]}>HEURE (OPTIONNEL)</Text>
 <TextInput style={[sn.field, { backgroundColor: theme.bg, color: theme.title, fontFamily: FontMono }]} placeholder="13:30" placeholderTextColor="#6C665E" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" />
 </View>
 {preview && <MacroPreview preview={preview} />}
 </View>
 </ScrollView>

 <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: Clr.white5 }}>
 <Touch onPress={handleSubmit} style={{ height: 48, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}>
 <Text style={[sn.md, { color: '#000' }]}>METTRE À JOUR</Text>
 </Touch>
 </View>
 </View>
 </View>
 </Modal>
 );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NutritionScreen() {
 const theme = useTheme();
 useAppState();
 const { addEntry } = useDaily();

 const today = ds(new Date());
 const [selectedDate, setSelectedDate] = useState<string>(today);
 const [selectedMeal] = useState<MealType>('dejeuner');
 const [selectedSlot, setSelectedSlot] = useState<1|2|3|4|5>(2);

 // Water tracking (N5)
 const [waterMl, setWaterMl] = useState(0);
 const [waterTarget, setWaterTarget] = useState(2450);

 // Slot labels: derive from most recent entry per slot, persist in safeStorage
 const SLOT_LABELS_KEY = 'awan.nutrition.slotLabels';
 const [slotLabels, setSlotLabels] = useState<Record<number, string>>(() => {
   try {
     const raw = safeStorage.get(SLOT_LABELS_KEY);
     return raw ? (JSON.parse(raw) as Record<number, string>) : { 1: 'SUHOOR', 2: 'DÉJEUNER', 3: 'DÎNER', 4: 'COLLATION', 5: 'EN-CAS' };
   } catch { return { 1: 'SUHOOR', 2: 'DÉJEUNER', 3: 'DÎNER', 4: 'COLLATION', 5: 'EN-CAS' }; }
 });
 const [editingSlotLabel, setEditingSlotLabel] = useState<number | null>(null);
 const [slotLabelInput, setSlotLabelInput] = useState('');

 const mealStore = useMealStore(selectedDate);

 const [foodsReady, setFoodsReady] = useState(false);
 const foodsLoadedRef = useRef(false);
 const [profile, setProfile] = useState<NutritionProfile | null>(() => loadProfile());
 const [showOnboarding, setShowOnboarding] = useState(() => !loadProfile());
 const [proteinAdherence7d, setProteinAdherence7d] = useState<number | null>(null);

 useEffect(() => {
   if (!profile) return;
   const targetP = profile.targetP;
   import('@/data/storage/storageService').then(({ getStorage }) =>
     getStorage().then(async (storage) => {
       const keys = await storage.list('nutrition.meal');
       const today7 = Array.from({ length: 7 }, (_, i) => {
         const d = new Date();
         d.setDate(d.getDate() - i);
         return d.toISOString().slice(0, 10);
       });
       const dateSet = new Set(today7);
       const sumByDay: Record<string, number> = {};
       for (const key of keys) {
         const raw = await storage.get(key, (v) => v as Record<string, unknown>);
         if (!raw) continue;
         const date = typeof raw['date'] === 'string' ? raw['date'] : null;
         if (!date || !dateSet.has(date)) continue;
         const p = typeof raw['p'] === 'number' ? raw['p'] : 0;
         sumByDay[date] = (sumByDay[date] ?? 0) + p;
       }
       const days = Object.values(sumByDay);
       if (days.length === 0) { setProteinAdherence7d(null); return; }
       const avg = days.reduce((a, b) => a + b, 0) / days.length;
       setProteinAdherence7d(Math.round((avg / targetP) * 100));
     })
   );
 }, [profile, selectedDate]);
 const [showAdd, setShowAdd] = useState(false);
 const [editEntry, setEditEntry] = useState<MealEntryLatest | null>(null);
 const [activeTab, setActiveTab] = useState<'journal' | 'bilan'>('journal');
 const [weeklyReport, setWeeklyReport] = useState<WeeklyNutritionReport | null>(null);
 const [adaptiveTDEE, setAdaptiveTDEE] = useState<{ estimatedTDEE: number; confidence: string; observationDays: number } | null>(null);

 useEffect(() => {
   if (activeTab !== 'bilan') return;
   const targets = profile ? { targetKcal: profile.targetKcal, targetP: profile.targetP } : null;
   buildWeeklyNutritionReport(targets).then(report => {
     setWeeklyReport(report);
     if (!profile) return;
     import('@/services/weightService').then(({ WeightService }) =>
       WeightService.getAll().then(allWeights => {
         const weightHistory = allWeights
           .filter(w => w.date && w.weightKg > 0)
           .map(w => ({ date: w.date, weightKg: w.weightKg }));
         const intakeHistory = report.days
           .filter(d => d.kcal > 0)
           .map(d => ({ date: d.date, kcal: d.kcal }));
         const result = estimateAdaptiveTDEE(weightHistory, intakeHistory, profile.targetKcal);
         setAdaptiveTDEE(result);
       })
     );
   }).catch(() => {});
 }, [activeTab, profile, selectedDate]);

 const openAddMeal = useCallback(async () => {
 if (!foodsLoadedRef.current) {
 await Promise.all([loadFoodDatabase(), loadCustomFoods()]).catch(() => {});
 foodsLoadedRef.current = true;
 setFoodsReady(true);
 }
 setShowAdd(true);
 }, []);

 // Skip onboarding if seed data exists — initialize default profile
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

 const dayEntries = mealStore.meals;
 const mealEntries = useMemo(
 () => dayEntries.filter((e) => {
   const slot = e.mealSlot ?? (e.meal ? (MEAL_TYPE_TO_SLOT[e.meal] ?? 5) : 5);
   return slot === selectedSlot;
 }),
 [dayEntries, selectedSlot],
 );
 const totals = mealStore.totals;

 const slotSummaries = useMemo(() => {
   const bySlot: Record<number, { kcal: number; p: number; c: number; f: number; count: number }> = {};
   for (const e of dayEntries) {
     const slot = e.mealSlot ?? (e.meal ? (MEAL_TYPE_TO_SLOT[e.meal] ?? 5) : 5);
     if (!bySlot[slot]) bySlot[slot] = { kcal: 0, p: 0, c: 0, f: 0, count: 0 };
     bySlot[slot]!.kcal += e.kcal;
     bySlot[slot]!.p += e.p;
     bySlot[slot]!.c += e.c;
     bySlot[slot]!.f += e.f;
     bySlot[slot]!.count += 1;
   }
   return bySlot;
 }, [dayEntries]);

 useEffect(() => {
   WaterService.getByDate(selectedDate).then(w => { setWaterMl(w?.totalMl ?? 0); });
 }, [selectedDate]);

 useEffect(() => {
   if (!profile?.weightKg) return;
   setWaterTarget(WaterService.targetMl(profile.weightKg));
 }, [profile]);

 const handleAddWater = async (ml: number) => {
   const updated = await WaterService.addMl(selectedDate, ml);
   setWaterMl(updated.totalMl);
 };

 const handleAdd = (food: FoodEntry, grams: number, timeHHMM: string | undefined) => {
 const macros = calcMacros(food, grams);
 const now = Date.now();
 const entryId = uid();
 const baseEntry: MealEntryLatest = {
 v: 2,
 id: entryId,
 date: selectedDate,
 name: food.n,
 kcal: macros.kcal,
 p: macros.p,
 c: macros.c,
 f: macros.f,
 ...(macros.fiberG !== undefined ? { fiberG: macros.fiberG } : {}),
 timestamp: now,
 source: food.id.startsWith('custom-') ? 'custom' : 'db',
 mealSlot: selectedSlot,
 mealLabel: slotLabels[selectedSlot],
 grams,
 foodId: food.id,
 ...(timeHHMM !== undefined ? { timeHHMM } : {}),
 };
 const entry: MealEntryLatest = profile
 ? { ...baseEntry, nutritionScore: scoreMeal(baseEntry, { kcal: profile.targetKcal, p: profile.targetP, c: profile.targetC, f: profile.targetF }).total }
 : baseEntry;
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

 const handleUpdate = (entry: MealEntryLatest, grams: number, timeHHMM: string | undefined) => {
 const base100 = entry.grams && entry.grams > 0
 ? { kcal: (entry.kcal / entry.grams) * 100, p: (entry.p / entry.grams) * 100, c: (entry.c / entry.grams) * 100, f: (entry.f / entry.grams) * 100 }
 : { kcal: entry.kcal, p: entry.p, c: entry.c, f: entry.f };
 const macros = calcMacros(base100, grams);
 const updated: MealEntryLatest = {
 v: 2,
 id: entry.id,
 date: entry.date,
 name: entry.name,
 kcal: macros.kcal,
 p: macros.p,
 c: macros.c,
 f: macros.f,
 timestamp: entry.timestamp,
 source: entry.source,
 mealSlot: entry.mealSlot ?? selectedSlot,
 mealLabel: entry.mealLabel,
 grams,
 ...(entry.foodId !== undefined ? { foodId: entry.foodId } : {}),
 ...(timeHHMM !== undefined ? { timeHHMM } : {}),
 };
 const scored: MealEntryLatest = profile
 ? { ...updated, nutritionScore: scoreMeal(updated, { kcal: profile.targetKcal, p: profile.targetP, c: profile.targetC, f: profile.targetF }).total }
 : updated;
 void mealStore.update(scored);
 setEditEntry(null);
 };

 const handleDelete = (id: string) => {
 Alert.alert('Suppression', 'Supprimer cette entrée ?', [
 { text: 'Annuler', style: 'cancel' },
 { text: 'Supprimer', style: 'destructive', onPress: () => { void mealStore.remove(id); } },
 ]);
 };

 const handleExport = async () => {
 const json = await buildNutritionExport();
 const filename = `awan-nutrition-${new Date().toISOString().slice(0, 10)}.json`;
 if (Platform.OS !== 'web') {
 try {
 const FileSystem = await import('expo-file-system');
 const Sharing = await import('expo-sharing');
 const uri = (FileSystem.documentDirectory ?? '') + filename;
 await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
 await Sharing.shareAsync(uri);
 } catch { Alert.alert('Erreur', 'Export impossible'); }
 } else {
 try {
 const blob = new Blob([json], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url; a.download = filename; a.click();
 URL.revokeObjectURL(url);
 } catch { /* ignore */ }
 }
 };

 if (showOnboarding) {
 return (
 <View style={{ flex: 1, backgroundColor: 'transparent' }}>
 <View style={{ flex: 1 }} />
 <OnboardingModal onComplete={(p) => { setProfile(p); setShowOnboarding(false); }} />
 </View>
 );
 }

 return (
 <View style={{ flex: 1, backgroundColor: 'transparent' }}>
 <ScrollView contentContainerStyle={{ paddingBottom: 120 }} style={{ flex: 1, backgroundColor: theme.bg }} showsVerticalScrollIndicator={false}>
 <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}>
 <ScreenHeader tag="BODY · NUTRITION" title="NUTRITION" />
 <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
   {(['journal', 'bilan'] as const).map(tab => {
     const active = activeTab === tab;
     return (
       <Touch key={tab} onPress={() => setActiveTab(tab)} style={[sn.row, { flex: 1, height: 40, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: active ? Clr.gold12 : Clr.white5, borderColor: active ? theme.selected : Clr.white5 }]}>
         {tab === 'bilan' && <BarChart2 size={12} color={active ? theme.selected : theme.mute} />}
         <Text style={[sn.xs, { color: active ? theme.selected : theme.mute }]}>{tab === 'journal' ? 'JOURNAL' : 'BILAN 7J'}</Text>
       </Touch>
     );
   })}
   <Touch onPress={handleExport} style={{ width: 40, height: 40, borderWidth: 1, borderColor: Clr.white5, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center' }}>
     <Download size={14} color={theme.mute} />
   </Touch>
 </View>
 </View>

 {activeTab === 'bilan' && weeklyReport && (
 <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
   <Card style={{ padding: 20, backgroundColor: Clr.white5, borderColor: Clr.white5, marginBottom: 16 }}>
     <Text style={[sn.label, { color: theme.selected, marginBottom: 4 }]}>DIAGNOSTIC</Text>
     <Text style={{ fontSize: Fs.sm, fontWeight: Fw.value, color: theme.title }}>{reportDiagnostic(weeklyReport)}</Text>
   </Card>
   <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
     <Card style={[sn.half, { padding: 16, backgroundColor: Clr.white5 }]}>
       <Text style={[sn.label, { color: theme.mute, marginBottom: 4 }]}>KCAL MOY/J</Text>
       <Text style={{ fontSize: 24, fontFamily: FontMono, fontWeight: Fw.value, color: theme.selected }}>{weeklyReport.avgKcal}</Text>
       {weeklyReport.kcalAdherence !== null && (
         <Text style={{ fontSize: Fs.xs, fontFamily: FontMono, fontWeight: Fw.value, color: weeklyReport.kcalAdherence >= 0.85 && weeklyReport.kcalAdherence <= 1.15 ? theme.statusOk : theme.statusWarn }}>{Math.round(weeklyReport.kcalAdherence * 100)}% cible</Text>
       )}
     </Card>
     <Card style={[sn.half, { padding: 16, backgroundColor: Clr.white5 }]}>
       <Text style={[sn.label, { color: theme.mute, marginBottom: 4 }]}>PROTÉINES MOY</Text>
       <Text style={{ fontSize: 24, fontFamily: FontMono, fontWeight: Fw.value, color: theme.selected }}>{weeklyReport.avgP}g</Text>
       {weeklyReport.proteinAdherence !== null && (
         <Text style={{ fontSize: Fs.xs, fontFamily: FontMono, fontWeight: Fw.value, color: weeklyReport.proteinAdherence >= 0.8 ? theme.statusOk : theme.danger }}>{Math.round(weeklyReport.proteinAdherence * 100)}% cible</Text>
       )}
     </Card>
     <Card style={[sn.half, { padding: 16, backgroundColor: Clr.white5 }]}>
       <Text style={[sn.label, { color: theme.mute, marginBottom: 4 }]}>GLUCIDES MOY</Text>
       <Text style={{ fontSize: 24, fontFamily: FontMono, fontWeight: Fw.value, color: theme.title }}>{weeklyReport.avgC}g</Text>
     </Card>
     <Card style={[sn.half, { padding: 16, backgroundColor: Clr.white5 }]}>
       <Text style={[sn.label, { color: theme.mute, marginBottom: 4 }]}>FIBRES MOY</Text>
       <Text style={{ fontSize: 24, fontFamily: FontMono, fontWeight: Fw.value, color: weeklyReport.avgFiberG >= 20 ? theme.statusOk : theme.statusWarn }}>{weeklyReport.avgFiberG}g</Text>
     </Card>
   </View>
   {adaptiveTDEE && (
     <Card style={{ padding: 16, backgroundColor: 'rgba(212,175,55,0.05)', borderColor: Clr.gold20, marginBottom: 16 }}>
       <Text style={[sn.label, { color: theme.selected, marginBottom: 4 }]}>TDEE ADAPTATIF ({adaptiveTDEE.observationDays}j)</Text>
       <View style={[sn.row, { alignItems: 'baseline', gap: 8 }]}>
         <Text style={{ fontSize: 30, fontFamily: FontMono, fontWeight: Fw.value, color: theme.title }}>{adaptiveTDEE.estimatedTDEE}</Text>
         <Text style={[sn.sm, { color: theme.mute }]}>kcal/j · confiance {adaptiveTDEE.confidence}</Text>
       </View>
       {profile && Math.abs(adaptiveTDEE.estimatedTDEE - profile.targetKcal) > 100 && (
         <Touch onPress={() => { const newProfile = { ...profile, targetKcal: adaptiveTDEE.estimatedTDEE }; saveProfile(newProfile); setProfile(newProfile); }} style={{ marginTop: 12, height: 40, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}>
           <Text style={[sn.xs, { color: '#000' }]}>APPLIQUER {adaptiveTDEE.estimatedTDEE > profile.targetKcal ? '+' : ''}{adaptiveTDEE.estimatedTDEE - profile.targetKcal} KCAL</Text>
         </Touch>
       )}
     </Card>
   )}
   <Heading level={4} mono subtitle={`${weeklyReport.periodStart} → ${weeklyReport.periodEnd}`} style={{ marginBottom: 12 }}>7 DERNIERS JOURS</Heading>
   {weeklyReport.days.map(day => (
     <View key={day.date} style={[sn.rowBetween, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Clr.white5 }]}>
       <Text style={{ fontSize: Fs.xs, fontFamily: FontMono, color: theme.mute, width: 96 }}>{day.date}</Text>
       <Text style={{ fontSize: Fs.xs, fontFamily: FontMono, color: theme.selected }}>{day.kcal > 0 ? `${day.kcal} kcal` : '—'}</Text>
       <Text style={{ fontSize: Fs.xs, fontFamily: FontMono, color: theme.mute }}>{day.p > 0 ? `P ${day.p}g` : ''}</Text>
     </View>
   ))}
 </View>
 )}
 {activeTab === 'bilan' && !weeklyReport && (
 <View style={{ paddingHorizontal: 24, paddingVertical: 80, alignItems: 'center', justifyContent: 'center' }}>
   <Text style={[sn.label, { color: theme.mute }]}>CHARGEMENT...</Text>
 </View>
 )}

 {activeTab === 'journal' && <>
 {/* Day Selector */}
 <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
   <DateSelectPopup value={selectedDate} onChange={setSelectedDate} label="CYCLE" />
 </View>

 {/* Meal Slot Selector — 5 modifiable slots (N1) */}
 <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
 <View style={{ flexDirection: 'row', gap: 4 }}>
 {([1, 2, 3, 4, 5] as const).map((slot) => {
 const active = slot === selectedSlot;
 const label = slotLabels[slot] ?? `REPAS ${slot}`;
 const editing = editingSlotLabel === slot;
 return (
 <View key={slot} style={{ flex: 1 }}>
 <Touch
 onPress={() => setSelectedSlot(slot)}
 onLongPress={() => { setSlotLabelInput(label); setEditingSlotLabel(slot); setSelectedSlot(slot); }}
 style={{ paddingVertical: 8, paddingHorizontal: 4, borderWidth: 1, alignItems: 'center', gap: 2, backgroundColor: active ? Clr.gold12 : Clr.white5, borderColor: active ? theme.selected : Clr.white5 }}
 >
 <Text style={{ fontSize: Fs.xxs, fontWeight: Fw.display, fontFamily: FontMono, color: active ? theme.selected : 'rgba(255,255,255,0.3)' }}>{slot}</Text>
 {editing ? (
 <TextInput
 style={{ width: '100%', textAlign: 'center', fontSize: 9, fontWeight: Fw.display, color: theme.selected, borderBottomWidth: 1, borderBottomColor: `${theme.selected}80`, padding: 0 }}
 value={slotLabelInput}
 onChangeText={(v: string) => setSlotLabelInput(v.toUpperCase())}
 onBlur={() => {
 if (slotLabelInput.trim()) {
 const updated = { ...slotLabels, [slot]: slotLabelInput.trim() };
 setSlotLabels(updated);
 try { safeStorage.set(SLOT_LABELS_KEY, JSON.stringify(updated)); } catch { /* quota */ }
 }
 setEditingSlotLabel(null);
 }}
 autoFocus
 maxLength={10}
 />
 ) : (
 <Text numberOfLines={1} style={{ textAlign: 'center', fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: 1, fontSize: 8, color: active ? theme.selected : theme.mute }}>{label.slice(0, 8)}</Text>
 )}
 </Touch>
 </View>
 );
 })}
 </View>
 <Text style={{ fontSize: Fs.xxs, color: 'rgba(255,255,255,0.2)', marginTop: 4, textAlign: 'right', letterSpacing: 1.4, textTransform: 'uppercase' }}>APPUI LONG POUR RENOMMER</Text>
 </View>

 {/* Day Totals */}
 <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
 <Card style={{ padding: 24, backgroundColor: theme.surface, borderColor: Clr.gold20 }}>
 <View style={[sn.rowBetween, { marginBottom: 24 }]}>
 <View>
 <Text style={[sn.label, { color: theme.selected }]}>INDEX CALORIQUE</Text>
 <View style={[sn.row, { alignItems: 'baseline', gap: 8 }]}>
 <Text style={{ fontSize: 36, fontWeight: Fw.value, fontFamily: FontMono, letterSpacing: -0.72, color: theme.title }}>{totals.kcal}</Text>
 {profile && <Text style={{ fontSize: 14, fontFamily: FontMono, fontWeight: Fw.value, color: theme.mute }}>/ {profile.targetKcal}</Text>}
 </View>
 </View>
 <View style={{ width: 48, height: 48, backgroundColor: Clr.gold10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Clr.gold20 }}>
 <UtensilsCrossed size={20} color={theme.selected} />
 </View>
 </View>

 {profile && (
 <View style={{ marginBottom: 16 }}>
 <ProgressBar label="ÉNERGIE" actual={totals.kcal} target={profile.targetKcal} unit="kcal" accent={theme.selected} />
 </View>
 )}

 {profile ? (
 <>
 <View style={{ flexDirection: 'row', gap: 12 }}>
 <View style={{ flex: 1 }}><ProgressBar label="PROTÉINES" actual={totals.p} target={profile.targetP} unit="g" /></View>
 <View style={{ flex: 1 }}><ProgressBar label="GLUCIDES" actual={totals.c} target={profile.targetC} unit="g" /></View>
 <View style={{ flex: 1 }}><ProgressBar label="LIPIDES" actual={totals.f} target={profile.targetF} unit="g" /></View>
 </View>
 {totals.fiberG > 0 && (
 <View style={{ marginTop: 12 }}>
 <ProgressBar label={L.nutrition.fiber} actual={totals.fiberG} target={FIBER_TARGET_G_PER_DAY} unit="g" accent={theme.statusSpirit} />
 </View>
 )}
 </>
 ) : (
 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
 <View style={[sn.macroStat, { backgroundColor: theme.surface }]}>
 <Text style={[sn.xs, { color: theme.mute, marginBottom: 4 }]}>PROTÉINES</Text>
 <Text style={{ fontSize: 18, fontWeight: Fw.value, fontFamily: FontMono, color: theme.title }}>{totals.p}g</Text>
 </View>
 <View style={[sn.macroStat, { backgroundColor: theme.surface }]}>
 <Text style={[sn.xs, { color: theme.mute, marginBottom: 4 }]}>GLUCIDES</Text>
 <Text style={{ fontSize: 18, fontWeight: Fw.value, fontFamily: FontMono, color: theme.title }}>{totals.c}g</Text>
 </View>
 <View style={[sn.macroStat, { backgroundColor: theme.surface }]}>
 <Text style={[sn.xs, { color: theme.mute, marginBottom: 4 }]}>LIPIDES</Text>
 <Text style={{ fontSize: 18, fontWeight: Fw.value, fontFamily: FontMono, color: theme.title }}>{totals.f}g</Text>
 </View>
 {totals.fiberG > 0 && (
 <View style={[sn.macroStat, { backgroundColor: theme.surface }]}>
 <Text style={[sn.xs, { color: theme.mute, marginBottom: 4 }]}>FIBRES</Text>
 <View style={[sn.row, { alignItems: 'baseline', gap: 4 }]}>
 <Text style={{ fontSize: 18, fontWeight: Fw.value, fontFamily: FontMono, color: theme.title }}>{Math.round(totals.fiberG)}g</Text>
 <Text style={{ fontSize: Fs.xs, fontWeight: Fw.value, color: theme.mute }}>/ 35g</Text>
 </View>
 </View>
 )}
 </View>
 )}
 </Card>

 {/* Adhérence protéines 7j */}
 {profile && proteinAdherence7d !== null && (
 <View style={{ marginTop: 12 }}>
 <InstrumentCard
 label={L.nutrition.adherence7d}
 value={proteinAdherence7d}
 unit="%"
 status={(proteinAdherence7d >= ADHERENCE_OK_THRESHOLD ? 'ok' : proteinAdherence7d >= ADHERENCE_WARN_THRESHOLD ? 'warn' : 'error') as StatusVariant}
 progress={Math.min(100, proteinAdherence7d)}
 delta={proteinAdherence7d >= ADHERENCE_OK_THRESHOLD ? L.nutrition.adherenceOk : proteinAdherence7d >= ADHERENCE_WARN_THRESHOLD ? L.nutrition.adherenceWarn : L.nutrition.adherenceError}
 />
 </View>
 )}
 </View>

 {/* Synthèse repas du jour — 5 slots */}
 {dayEntries.length > 0 && (
 <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
   <Card variant="flat" style={{ padding: 16, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5 }}>
     <Text style={[sn.xs, { color: theme.mute, marginBottom: 12, fontFamily: FontMono }]}>SYNTHÈSE JOURNALIÈRE</Text>
     <View style={{ gap: 8 }}>
       {([1, 2, 3, 4, 5] as const).map(slot => {
         const sm = slotSummaries[slot];
         if (!sm || sm.count === 0) return null;
         const label = slotLabels[slot] ?? `REPAS ${slot}`;
         return (
           <View key={slot} style={[sn.rowBetween, { paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Clr.white5 }]}>
             <Text style={{ fontSize: Fs.xs, fontWeight: Fw.display, fontFamily: FontMono, textTransform: 'uppercase', color: theme.selected }}>{label}</Text>
             <View style={[sn.row, { gap: 12 }]}>
               <Text style={{ fontSize: Fs.xs, fontFamily: FontMono, color: theme.title, fontWeight: Fw.display }}>{sm.kcal} kcal</Text>
               <Text style={{ fontSize: Fs.xs, fontFamily: FontMono, color: theme.mute }}>P{sm.p} G{sm.c} L{sm.f}</Text>
             </View>
           </View>
         );
       })}
     </View>
   </Card>
 </View>
 )}

 {/* Meal Entries */}
 <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
 <Heading level={4} mono subtitle={MEAL_TYPES.find((m) => m.key === selectedMeal)?.label ?? ''}>ENTRÉES DU REPAS</Heading>

 {mealEntries.length === 0 ? (
 <Card variant="flat" style={{ padding: 24, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5, alignItems: 'center' }}>
 <Text style={[sn.md, { color: theme.mute, textAlign: 'center' }]}>AUCUNE ENTRÉE</Text>
 <Text style={{ fontSize: 12, fontWeight: Fw.value, color: theme.mute, opacity: 0.7, marginTop: 8, textAlign: 'center' }}>Ajouter un aliment ci-dessous.</Text>
 </Card>
 ) : (
 <View style={{ gap: 12 }}>
 {mealEntries.map((m) => (
 <Card key={m.id} variant="flat" style={[sn.row, { gap: 16, paddingVertical: 16, paddingHorizontal: 20 }]}>
 <View style={{ flex: 1 }}>
 <View style={[sn.row, { alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }]}>
 <Text style={{ fontSize: 14, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.35 }}>{m.name}</Text>
 {m.grams !== undefined && <Text style={{ fontSize: Fs.md, fontFamily: FontMono, fontWeight: Fw.value, color: theme.selected }}>{m.grams}g</Text>}
 {m.timeHHMM && <Text style={{ fontSize: Fs.sm, fontFamily: FontMono, fontWeight: Fw.value, color: theme.mute }}>· {m.timeHHMM}</Text>}
 </View>
 <Text style={[sn.sm, { color: theme.mute, marginTop: 4, fontFamily: FontMono, fontWeight: Fw.display }]}>{m.kcal} KCAL · P{m.p} · G{m.c} · L{m.f}</Text>
 {profile && (() => {
 const score = m.nutritionScore ?? scoreMeal(m, { kcal: profile.targetKcal, p: profile.targetP, c: profile.targetC, f: profile.targetF }).total;
 const color = score >= 70 ? theme.statusOk : score >= 40 ? theme.statusWarn : theme.danger;
 return <Text style={{ fontSize: Fs.xs, fontFamily: FontMono, fontWeight: Fw.display, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1.6, color }}>SCORE {score}/100</Text>;
 })()}
 </View>
 <Touch onPress={() => setEditEntry(m)} style={{ width: 36, height: 36, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Clr.white10 }}>
 <Pencil size={14} color={theme.mute} />
 </Touch>
 <Touch onPress={() => handleDelete(m.id)} style={{ width: 36, height: 36, backgroundColor: `${theme.danger}1A`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${theme.danger}33` }}>
 <Trash2 size={14} color={theme.danger} />
 </Touch>
 </Card>
 ))}
 </View>
 )}
 </View>

 {/* Add Button */}
 <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
 <Touch onPress={() => void openAddMeal()} style={{ height: 56, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}>
 <View style={[sn.row, { gap: 12 }]}>
 <Plus size={18} color="black" strokeWidth={3} />
 <Text style={[sn.md, { color: '#000' }]}>AJOUTER UN ALIMENT</Text>
 </View>
 </Touch>
 </View>

 {/* N5 — Eau / Hydratation */}
 <View style={{ paddingHorizontal: 24, marginBottom: 40 }}>
 <Heading level={4} mono subtitle={`Cible ${waterTarget} mL · 35mL/kg`} style={{ marginBottom: 16 }}>HYDRATATION</Heading>
 <Card variant="flat" style={{ padding: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: Clr.white5 }}>
 <View style={[sn.rowBetween, { marginBottom: 16 }]}>
 <View style={[sn.row, { alignItems: 'baseline' }]}>
 <Text style={{ fontSize: 36, fontWeight: Fw.display, fontFamily: FontMono, color: theme.selected }}>{Math.floor(waterMl / 1000) > 0 ? `${(waterMl / 1000).toFixed(1)}L` : `${waterMl}mL`}</Text>
 <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, color: theme.mute, marginLeft: 8, fontFamily: FontMono, textTransform: 'uppercase' }}>/ {waterTarget >= 1000 ? `${(waterTarget / 1000).toFixed(1)}L` : `${waterTarget}mL`}</Text>
 </View>
 <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, fontFamily: FontMono, color: waterMl >= waterTarget ? theme.statusOk : waterMl >= waterTarget * 0.7 ? theme.statusWarn : theme.danger }}>{Math.round((waterMl / waterTarget) * 100)}%</Text>
 </View>
 <View style={{ width: '100%', height: 6, backgroundColor: Clr.white10, marginBottom: 16 }}>
 <View style={{ height: '100%', width: `${Math.min(100, (waterMl / waterTarget) * 100)}%`, backgroundColor: theme.selected }} />
 </View>
 <View style={[sn.row, { gap: 12 }]}>
 <Touch onPress={() => void handleAddWater(250)} style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: Clr.white10, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center' }}>
 <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, fontFamily: FontMono, color: theme.selected }}>+250 mL</Text>
 </Touch>
 <Touch onPress={() => void handleAddWater(500)} style={{ flex: 1, paddingVertical: 12, backgroundColor: Clr.gold20, borderWidth: 1, borderColor: Clr.gold30, alignItems: 'center', justifyContent: 'center' }}>
 <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, fontFamily: FontMono, color: theme.selected }}>+500 mL</Text>
 </Touch>
 <Touch onPress={() => void WaterService.reset(selectedDate).then(() => setWaterMl(0))} style={{ width: 48, paddingVertical: 12, borderWidth: 1, borderColor: Clr.white5, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' }}>
 <Text style={{ fontSize: Fs.xs, fontWeight: Fw.display, fontFamily: FontMono, color: theme.mute }}>×0</Text>
 </Touch>
 </View>
 </Card>
 </View>
 </>}
 </ScrollView>

 <AddMealModal visible={showAdd} mealLabel={slotLabels[selectedSlot]} foodsReady={foodsReady} onClose={() => setShowAdd(false)} onAdd={handleAdd} />

 <EditMealModal visible={editEntry !== null} entry={editEntry} onClose={() => setEditEntry(null)} onUpdate={handleUpdate} />
 </View>
 );
}

const sn = StyleSheet.create({
 row: { flexDirection: 'row', alignItems: 'center' },
 rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
 sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
 sheet: { width: '100%', maxWidth: 512, alignSelf: 'center', borderTopWidth: 1, borderTopColor: Clr.white10, overflow: 'hidden', maxHeight: '92%' },
 grabberWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
 grabber: { width: 40, height: 4, backgroundColor: Clr.white20 },
 label: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
 xs: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.xs_02 },
 sm: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
 md: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.md_02 },
 field: { borderWidth: 1, borderColor: Clr.white5, paddingHorizontal: 20, paddingVertical: 16, fontSize: 14, fontWeight: Fw.value },
 fieldSm: { borderWidth: 1, borderColor: Clr.white5, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, fontWeight: Fw.value },
 half: { width: '47%', flexGrow: 1 },
 macroBox: { padding: 8, borderWidth: 1, borderColor: Clr.white5, alignItems: 'center', flex: 1 },
 macroStat: { width: '47%', flexGrow: 1, padding: 12, borderWidth: 1, borderColor: Clr.white5 },
});
