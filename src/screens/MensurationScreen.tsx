import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TextInput as RNTextInput, Modal, Alert, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { useTheme } from '../hooks/useTheme';
import { useAppState } from '../context/AppStateContext';
import { useDaily } from '../context/DailyContext';
import { ds, uid } from '../utils/storage';
import type { CircumferenceKey, SkinfoldKey, TrialTuple } from '../data/schemas/anthropo/measurement';
import { BiometricsService } from '../services/biometricsService';
import { analyzeSymmetry, asymmetryToHeatmapValue } from '../services/symmetryService';
import { AnthropoGoalsService } from '../services/anthropoGoalsService';
import type { AnthropoGoalsLatest } from '../data/schemas/anthropo/anthropoGoals';
import { useWeightStore } from '../hooks/useWeightStore';
import { useMeasurementStore } from '../hooks/useMeasurementStore';
import { useAnthropoProfileStore } from '../hooks/useAnthropoProfileStore';
import { computeAge } from '../data/schemas/anthropo/userProfile';
import type { AnthropoProfileLatest } from '../data/schemas/anthropo/userProfile';
import { BodyMeasureSvg, BODY_MEASURES } from '../components/BodyMeasureSvg';
import { BodySvg } from '../components/BodySvg';
import type { MuscleId } from '../components/BodySvg';
import { Planner } from '../modules/planning/api';
import { getStorage } from '../data/storage/storageService';
import { ChevronLeft, ChevronRight, Plus, X, Database, AlertTriangle } from 'lucide-react-native';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';
import { FontMono } from '../constants/typography';
import { Fs, Fw, Ls, Clr } from '../theme/tokens';

const TextInput = RNTextInput as React.ComponentType<any>;

function median([a, b, c]: [number, number, number]): number {
  return [a, b, c].sort((x, y) => x - y)[1]!;
}
const SvgPolyline = Polyline as any;
const SvgCircle = Circle as any;

// 13-site personal protocol (Haute Densité — prise systématiquement à droite)
const SKINFOLD_SITES = [
  { key: 'pectoral',          label: 'Pectoral',          note: 'Diagonal aisselle–mamelon' },
  { key: 'axillaire',         label: 'Axillaire',         note: 'Vertical ligne axillaire' },
  { key: 'triceps',           label: 'Triceps',            note: 'Vertical mi-triceps' },
  { key: 'subscapular',       label: 'Sous-scapulaire',   note: 'Diagonal sous omoplate' },
  { key: 'abdominal',         label: 'Abdominal',         note: '2 cm droite du nombril' },
  { key: 'suprailiac',        label: 'Supra-iliaque',     note: 'Diagonal crête iliaque' },
  { key: 'thigh_anterior',    label: 'Cuisse ant.',        note: 'Vertical mi-face ant.' },
  { key: 'biceps',            label: 'Biceps',             note: 'Vertical mi-biceps' },
  { key: 'calf_medial',       label: 'Mollet médial',     note: 'Partie la plus large' },
  { key: 'supraspinal',       label: 'Supra-épineux',     note: 'Au-dessus épine iliaque' },
  { key: 'abdominal_lateral', label: 'Abdominal lat.',    note: 'Ligne axillaire, nombril' },
  { key: 'thigh_lateral',     label: 'Cuisse lat.',        note: 'Face externe cuisse' },
  { key: 'forearm',           label: 'Avant-bras',        note: 'Longitudinal, partie large' },
] as const;

// JP7 sites within the 13-site protocol
const JP7_SITES = ['pectoral', 'axillaire', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh_anterior'] as const;
// DW4 sites within the 13-site protocol
const DW4_SITES = ['biceps', 'triceps', 'subscapular', 'suprailiac'] as const;
// All 13 sites
const ALL13_SITES = SKINFOLD_SITES.map(s => s.key);

// Bilateral circumference pairs
const BILATERAL_MEASURES = [
  { base: 'arm',     label: 'BRAS',      leftKey: 'arm_left',     rightKey: 'arm_right' },
  { base: 'forearm', label: 'AVANT-BRAS', leftKey: 'forearm_left', rightKey: 'forearm_right' },
  { base: 'thigh',   label: 'CUISSE',    leftKey: 'thigh_left',   rightKey: 'thigh_right' },
  { base: 'calf',    label: 'MOLLET',    leftKey: 'calf_left',    rightKey: 'calf_right' },
] as const;

// ─── ProfileEditorModal ───────────────────────────────────────────────────────

interface ProfileEditorModalProps {
  visible: boolean;
  existing: AnthropoProfileLatest | null;
  onClose: () => void;
  onSave: (entry: AnthropoProfileLatest) => void;
}

function ProfileEditorModal({ visible, existing, onClose, onSave }: ProfileEditorModalProps) {
  const theme = useTheme();
  const [sex, setSex] = useState<'male' | 'female'>(existing?.sex ?? 'male');
  const [birthDate, setBirthDate] = useState(existing?.birthDate ?? '1990-01-01');
  const [heightCm, setHeightCm] = useState(existing?.heightCm ? String(existing.heightCm) : '');
  const [boneStructure, setBoneStructure] = useState<'small' | 'medium' | 'large' | undefined>(existing?.boneStructure);
  const [armLeft, setArmLeft] = useState(existing?.armLengthCm?.left ? String(existing.armLengthCm.left) : '');
  const [armRight, setArmRight] = useState(existing?.armLengthCm?.right ? String(existing.armLengthCm.right) : '');
  const [legLeft, setLegLeft] = useState(existing?.legLengthCm?.left ? String(existing.legLengthCm.left) : '');
  const [legRight, setLegRight] = useState(existing?.legLengthCm?.right ? String(existing.legLengthCm.right) : '');

  useEffect(() => {
    if (visible) {
      setSex(existing?.sex ?? 'male');
      setBirthDate(existing?.birthDate ?? '1990-01-01');
      setHeightCm(existing?.heightCm ? String(existing.heightCm) : '');
      setBoneStructure(existing?.boneStructure);
      setArmLeft(existing?.armLengthCm?.left ? String(existing.armLengthCm.left) : '');
      setArmRight(existing?.armLengthCm?.right ? String(existing.armLengthCm.right) : '');
      setLegLeft(existing?.legLengthCm?.left ? String(existing.legLengthCm.left) : '');
      setLegRight(existing?.legLengthCm?.right ? String(existing.legLengthCm.right) : '');
    }
  }, [visible, existing]);

  const handleSave = () => {
    const h = parseFloat(heightCm.replace(',', '.'));
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || isNaN(h) || h <= 0) {
      Alert.alert('Erreur', 'Date de naissance (AAAA-MM-JJ) et taille requises');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const aL = parseFloat(armLeft.replace(',', '.'));
    const aR = parseFloat(armRight.replace(',', '.'));
    const lL = parseFloat(legLeft.replace(',', '.'));
    const lR = parseFloat(legRight.replace(',', '.'));
    const entry: AnthropoProfileLatest = {
      v: 1 as const,
      date: existing?.date ?? today,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      sex,
      birthDate,
      heightCm: h,
      savedAt: Date.now(),
      ...(boneStructure ? { boneStructure } : {}),
      ...((!isNaN(aL) && aL > 0) || (!isNaN(aR) && aR > 0) ? {
        armLengthCm: {
          ...(!isNaN(aL) && aL > 0 ? { left: aL } : {}),
          ...(!isNaN(aR) && aR > 0 ? { right: aR } : {}),
        },
      } : {}),
      ...((!isNaN(lL) && lL > 0) || (!isNaN(lR) && lR > 0) ? {
        legLengthCm: {
          ...(!isNaN(lL) && lL > 0 ? { left: lL } : {}),
          ...(!isNaN(lR) && lR > 0 ? { right: lR } : {}),
        },
      } : {}),
    };
    onSave(entry);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View style={{ backgroundColor: theme.surface, maxHeight: '88%' }}>
          <View style={{ height: 4, width: 40, backgroundColor: Clr.white10, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
          <View style={{ paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Clr.white5 }}>
            <Text style={{ fontSize: Fs.xs, color: theme.selected, letterSpacing: 1.5, marginBottom: 4 }}>ANTHROPOMÉTRIE</Text>
            <Text style={{ fontSize: 20, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.4 }}>PROFIL PHYSIQUE</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 20 }}>
            {/* Sexe */}
            <View>
              <Text style={{ fontSize: Fs.xs, color: theme.mute, letterSpacing: 1.5, marginBottom: 8 }}>SEXE</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([{ k: 'male', l: 'HOMME' }, { k: 'female', l: 'FEMME' }] as Array<{ k: 'male' | 'female'; l: string }>).map(opt => {
                  const active = sex === opt.k;
                  return (
                    <Touch key={opt.k} onPress={() => setSex(opt.k)} style={{ flex: 1, height: 44, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? Clr.gold12 : Clr.white5, borderColor: active ? `${theme.selected}66` : Clr.white5 }}>
                      <Text style={{ fontSize: Fs.sm, fontWeight: Fw.value, color: active ? theme.selected : theme.mute }}>{opt.l}</Text>
                    </Touch>
                  );
                })}
              </View>
            </View>
            {/* Date de naissance */}
            <View>
              <Text style={{ fontSize: Fs.xs, color: theme.mute, letterSpacing: 1.5, marginBottom: 8 }}>DATE DE NAISSANCE (AAAA-MM-JJ)</Text>
              <TextInput style={{ height: 48, paddingHorizontal: 16, backgroundColor: theme.bg, color: theme.title, fontSize: Fs.md, borderWidth: 1, borderColor: Clr.white10 }} value={birthDate} onChangeText={setBirthDate} placeholder="1990-01-01" placeholderTextColor="rgba(128,128,128,0.5)" keyboardType="numeric" />
            </View>
            {/* Taille */}
            <View>
              <Text style={{ fontSize: Fs.xs, color: theme.mute, letterSpacing: 1.5, marginBottom: 8 }}>TAILLE (CM)</Text>
              <TextInput style={{ height: 48, paddingHorizontal: 16, backgroundColor: theme.bg, color: theme.title, fontSize: Fs.md, borderWidth: 1, borderColor: Clr.white10 }} value={heightCm} onChangeText={setHeightCm} placeholder="175" placeholderTextColor="rgba(128,128,128,0.5)" keyboardType="decimal-pad" />
            </View>
            {/* Ossature */}
            <View>
              <Text style={{ fontSize: Fs.xs, color: theme.mute, letterSpacing: 1.5, marginBottom: 8 }}>OSSATURE</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([{ k: 'small', l: 'FINE' }, { k: 'medium', l: 'MOYENNE' }, { k: 'large', l: 'LARGE' }] as Array<{ k: 'small' | 'medium' | 'large'; l: string }>).map(opt => {
                  const active = boneStructure === opt.k;
                  return (
                    <Touch key={opt.k} onPress={() => setBoneStructure(active ? undefined : opt.k)} style={{ flex: 1, height: 40, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? Clr.gold12 : Clr.white5, borderColor: active ? `${theme.selected}66` : Clr.white5 }}>
                      <Text style={{ fontSize: Fs.xs, fontWeight: Fw.value, color: active ? theme.selected : theme.mute }}>{opt.l}</Text>
                    </Touch>
                  );
                })}
              </View>
            </View>
            {/* Longueur bras */}
            <View>
              <Text style={{ fontSize: Fs.xs, color: theme.mute, letterSpacing: 1.5, marginBottom: 8 }}>LONGUEUR BRAS (CM)</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: Fs.xs, color: theme.mute, marginBottom: 6 }}>GAUCHE</Text>
                  <TextInput style={{ height: 44, paddingHorizontal: 12, backgroundColor: theme.bg, color: theme.title, fontSize: Fs.md, borderWidth: 1, borderColor: Clr.white10 }} value={armLeft} onChangeText={setArmLeft} placeholder="--" placeholderTextColor="rgba(128,128,128,0.4)" keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: Fs.xs, color: theme.mute, marginBottom: 6 }}>DROITE</Text>
                  <TextInput style={{ height: 44, paddingHorizontal: 12, backgroundColor: theme.bg, color: theme.title, fontSize: Fs.md, borderWidth: 1, borderColor: Clr.white10 }} value={armRight} onChangeText={setArmRight} placeholder="--" placeholderTextColor="rgba(128,128,128,0.4)" keyboardType="decimal-pad" />
                </View>
              </View>
            </View>
            {/* Longueur jambe */}
            <View>
              <Text style={{ fontSize: Fs.xs, color: theme.mute, letterSpacing: 1.5, marginBottom: 8 }}>LONGUEUR JAMBE (CM)</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: Fs.xs, color: theme.mute, marginBottom: 6 }}>GAUCHE</Text>
                  <TextInput style={{ height: 44, paddingHorizontal: 12, backgroundColor: theme.bg, color: theme.title, fontSize: Fs.md, borderWidth: 1, borderColor: Clr.white10 }} value={legLeft} onChangeText={setLegLeft} placeholder="--" placeholderTextColor="rgba(128,128,128,0.4)" keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: Fs.xs, color: theme.mute, marginBottom: 6 }}>DROITE</Text>
                  <TextInput style={{ height: 44, paddingHorizontal: 12, backgroundColor: theme.bg, color: theme.title, fontSize: Fs.md, borderWidth: 1, borderColor: Clr.white10 }} value={legRight} onChangeText={setLegRight} placeholder="--" placeholderTextColor="rgba(128,128,128,0.4)" keyboardType="decimal-pad" />
                </View>
              </View>
            </View>
          </ScrollView>
          <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: Clr.white5, flexDirection: 'row', gap: 12 }}>
            <Touch onPress={onClose} style={{ flex: 1, height: 48, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white10, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: Fs.sm, fontWeight: Fw.value, color: theme.mute }}>ANNULER</Text>
            </Touch>
            <Touch onPress={handleSave} style={{ flex: 1, height: 48, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: Fs.sm, fontWeight: Fw.value, color: '#000' }}>ENREGISTRER</Text>
            </Touch>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function MensurationScreen() {
  const theme = useTheme();
  const { navigate } = useAppState() as any;
  const { addEntry } = useDaily();

  const measureStore = useMeasurementStore();
  const weightStore = useWeightStore();
  const anthropoStore = useAnthropoProfileStore();
  const [weightInput, setWeightInput] = useState('');

  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  // Derive sex/age from anthropo profile (fallback to safe defaults)
  const profileSex: 'male' | 'female' = anthropoStore.latest?.sex ?? 'male';
  const profileAge: number = anthropoStore.latest ? computeAge(anthropoStore.latest.birthDate) : 30;

  // A7: profile completeness check
  const profileIncomplete = !anthropoStore.loading && !anthropoStore.latest;

  // A6: create anthropo planning tasks in backlog (idempotent via title dedup skipped — user manages)
  useEffect(() => {
    getStorage().then(async storage => {
      const planner = new Planner(storage);
      const existing = await planner.getActiveTasks();
      if (!existing.some(t => t.title === 'Mesures bimensuelles')) {
        void planner.createTask({ title: 'Mesures bimensuelles', domain: 'anthropo', durationMin: 15, priority: 1 });
      }
      if (!existing.some(t => t.title === 'Bilan trimestriel complet')) {
        void planner.createTask({ title: 'Bilan trimestriel complet', domain: 'anthropo', durationMin: 45, priority: 2 });
      }
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

  const [inputText, setInputText] = useState('');

  const blankEntry = {
    date: selectedDate,
    body_fat_pct: 0,
    circumferences: {} as Partial<Record<CircumferenceKey, TrialTuple>>,
    skinfolds: {} as Partial<Record<SkinfoldKey, TrialTuple>>,
  };

  const [currentEntry, setCurrentEntry] = useState(blankEntry);

  // S2.1 — Filtre fenêtre temporelle pour le graphique
  const [weightFilter, setWeightFilter] = useState<30 | 90 | 365>(30);

  // S2.3 — Objectifs configurables (silo anthropo.goals)
  const [targetWeightKg, setTargetWeightKg] = useState<string>('');
  const [targetBodyFatPct, setTargetBodyFatPct] = useState<string>('');

  useEffect(() => {
    let active = true;
    AnthropoGoalsService.get().then(goals => {
      if (!active || !goals) return;
      if (typeof goals.targetWeightKg === 'number') setTargetWeightKg(String(goals.targetWeightKg));
      if (typeof goals.targetBodyFatPct === 'number') setTargetBodyFatPct(String(goals.targetBodyFatPct));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      const payload: AnthropoGoalsLatest = { v: 1 };
      const w = parseFloat(targetWeightKg.replace(',', '.'));
      const bf = parseFloat(targetBodyFatPct.replace(',', '.'));
      if (!isNaN(w) && w > 0) payload.targetWeightKg = w;
      if (!isNaN(bf) && bf > 0) payload.targetBodyFatPct = bf;
      void AnthropoGoalsService.save(payload);
    }, 800);
    return () => clearTimeout(handle);
  }, [targetWeightKg, targetBodyFatPct]);

  // Helper : poids le plus récent ≤ date (depuis weightStore)
  const getWeightKg = useMemo(() => (date: string): number => {
    const sorted = weightStore.entries.filter(e => e.date <= date && e.weight != null).sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0]?.weight ?? 0;
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
    if (last.weight == null || baseline.weight == null) return null;
    return { delta: last.weight - baseline.weight, current: last.weight };
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
    const heightCm: number = anthropoStore.latest?.heightCm ?? 0;
    if (!heightCm) return null;
    const ageYears: number = profileAge;
    const sex: 'male' | 'female' = profileSex;
    const hm = heightCm / 100;
    const waist: number | undefined = last.circumferences?.waist ? median(last.circumferences.waist) : undefined;
    const hip: number | undefined = last.circumferences?.hips ? median(last.circumferences.hips) : undefined;
    const neck: number | undefined = last.circumferences?.neck ? median(last.circumferences.neck) : undefined;
    const weight: number = getWeightKg(last.date);
    const bfPct: number = last.body_fat_pct ?? 0;
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
    const sk = last.skinfolds ?? {};
    // 13-plis (highest priority if all sites present)
    const s13Total = ALL13_SITES.every(k => sk[k as SkinfoldKey] != null)
      ? ALL13_SITES.reduce((sum, k) => sum + median(sk[k as SkinfoldKey]!), 0) : 0;
    if (s13Total > 0) {
      bfMethods.push({ method: '13 Plis', value: BiometricsService.skinfolds13(s13Total, ageYears, sex) });
    }
    if (JP7_SITES.every(k => sk[k as SkinfoldKey] != null)) {
      const jp7 = BiometricsService.jacksonPollock7(median(sk['pectoral']!), median(sk['axillaire']!), median(sk['triceps']!), median(sk['subscapular']!), median(sk['abdominal']!), median(sk['suprailiac']!), median(sk['thigh_anterior']!), ageYears, sex);
      bfMethods.push({ method: 'JP7', value: jp7 });
    }
    if (DW4_SITES.every(k => sk[k as SkinfoldKey] != null)) {
      const dw = BiometricsService.durninWomersley4(median(sk['biceps']!), median(sk['triceps']!), median(sk['subscapular']!), median(sk['suprailiac']!), ageYears, sex);
      bfMethods.push({ method: 'DW4', value: dw });
    }
    if (bfPct > 0 && bfMethods.length === 0) bfMethods.push({ method: 'Auto', value: bfPct });
    const bfRange = bfMethods.length > 1 ? BiometricsService.bfPctRange(bfMethods) : null;
    // Skinfold matrix values for display
    const bf13 = s13Total > 0 ? BiometricsService.skinfolds13(s13Total, ageYears, sex) : null;
    const bfJP7 = JP7_SITES.every(k => sk[k as SkinfoldKey] != null)
      ? BiometricsService.jacksonPollock7(median(sk['pectoral']!), median(sk['axillaire']!), median(sk['triceps']!), median(sk['subscapular']!), median(sk['abdominal']!), median(sk['suprailiac']!), median(sk['thigh_anterior']!), ageYears, sex) : null;
    const bfDW4 = DW4_SITES.every(k => sk[k as SkinfoldKey] != null)
      ? BiometricsService.durninWomersley4(median(sk['biceps']!), median(sk['triceps']!), median(sk['subscapular']!), median(sk['suprailiac']!), ageYears, sex) : null;
    const ecartMax = (() => {
      const vals = [bf13, bfJP7, bfDW4].filter((v): v is number => v !== null);
      if (vals.length < 2) return null;
      return parseFloat((Math.max(...vals) - Math.min(...vals)).toFixed(1));
    })();
    return { ffmi, whr, whtr, navyBF, lbm, imcVal, ffmiNorm, bfRange, s13Total, bf13, bfJP7, bfDW4, ecartMax };
  }, [measureStore.history, anthropoStore.latest, profileAge, profileSex]);

  // Dernière pesée connue (quand pas d'entrée WeightEntry pour la date sélectionnée)
  const lastKnownWeight = useMemo(() => {
    const todayWeight = weightStore.entries.find(e => e.date === selectedDate && e.weight != null);
    if (todayWeight) return null;
    const sorted = weightStore.entries
      .filter(e => e.date < selectedDate && e.weight != null)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (!sorted.length || !sorted[0]) return null;
    const last = sorted[0];
    const diffMs = new Date(selectedDate).getTime() - new Date(last.date).getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
    return { weight: last.weight!, daysAgo: diffDays };
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
      if (entry) {
        setCurrentEntry({
          ...blankEntry,
          date: entry.date,
          body_fat_pct: entry.body_fat_pct ?? 0,
          circumferences: (entry.circumferences ?? {}) as Partial<Record<CircumferenceKey, TrialTuple>>,
          skinfolds: (entry.skinfolds ?? {}) as Partial<Record<SkinfoldKey, TrialTuple>>,
        });
      } else {
        setCurrentEntry({ ...blankEntry, date: selectedDate });
      }
    }
  }, [measureStore.loading, selectedDate]);

  const persistEntry = (entry: typeof blankEntry) => {
    const ap = anthropoStore.latest;
    const profileHeight = ap?.heightCm;
    const waist = entry.circumferences?.waist ? median(entry.circumferences.waist) : undefined;
    const hip = entry.circumferences?.hips ? median(entry.circumferences.hips) : undefined;
    const whtr = waist && profileHeight ? waist / profileHeight : undefined;
    const whr = waist && hip ? waist / hip : undefined;
    const wKg = getWeightKg(selectedDate);
    const measureProfile = ap ? {
      age: profileAge,
      sex: profileSex,
      heightCm: ap.heightCm,
      ...(wKg > 0 ? { weightKg: wKg } : {}),
    } : undefined;
    void measureStore.save({
      v: 3 as const,
      savedAt: Date.now(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...entry,
      date: selectedDate,
      ...(whtr !== undefined ? { whtr } : {}),
      ...(whr !== undefined ? { whr } : {}),
    }, measureProfile);
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
    const triple = currentEntry.circumferences?.[partId as CircumferenceKey];
    setInputValue(triple ? String(triple[0]) : '');
  };

  const saveMeasurement = () => {
    if (!selectedPart) return;
    const val = parseFloat(inputValue.replace(',', '.'));
    if (isNaN(val) || val <= 0) { setSelectedPart(null); return; }
    const newEntry = { ...currentEntry };
    newEntry.circumferences = { ...newEntry.circumferences, [selectedPart as CircumferenceKey]: [val, val, val] as TrialTuple };
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
      void weightStore.update({ ...existing, weight: w });
    } else {
      void weightStore.add({ v: 3 as const, date: selectedDate, savedAt: Date.now(), weight: w, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    }
  };

  const updateBpm = (val: string) => {
    const b = parseInt(val);
    if (isNaN(b) || b <= 0) return;
    const existing = weightStore.entries.find(e => e.date === selectedDate);
    if (existing) {
      void weightStore.update({ ...existing, bpm_rest: b });
    } else {
      void weightStore.add({
        v: 3 as const,
        date: selectedDate,
        savedAt: Date.now(),
        bpm_rest: b,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
  };

  const updateSkinfold = (site: string, val: string) => {
    const v = parseFloat(val.replace(',', '.'));
    const newEntry = { ...currentEntry };
    if (!isNaN(v) && v > 0) {
      newEntry.skinfolds = { ...newEntry.skinfolds, [site as SkinfoldKey]: [v, v, v] as TrialTuple };
    }
    const sk = newEntry.skinfolds ?? {};
    const a = profileAge;
    const sex = profileSex;

    // Each formula computed independently from its own sites only — no cascade, no coefficient correction
    const s13Total = ALL13_SITES.every(k => sk[k as SkinfoldKey] != null)
      ? ALL13_SITES.reduce((sum, k) => sum + median(sk[k as SkinfoldKey]!), 0) : 0;
    const bf13 = s13Total > 0 ? BiometricsService.skinfolds13(s13Total, a, sex) : null;
    const bfJP7 = JP7_SITES.every(k => sk[k as SkinfoldKey] != null)
      ? BiometricsService.jacksonPollock7(median(sk['pectoral']!), median(sk['axillaire']!), median(sk['triceps']!), median(sk['subscapular']!), median(sk['abdominal']!), median(sk['suprailiac']!), median(sk['thigh_anterior']!), a, sex) : null;
    const bfDW4 = DW4_SITES.every(k => sk[k as SkinfoldKey] != null)
      ? BiometricsService.durninWomersley4(median(sk['biceps']!), median(sk['triceps']!), median(sk['subscapular']!), median(sk['suprailiac']!), a, sex) : null;
    // body_fat_pct stores best available: 13-plis > JP7 > DW4 (no fallback beyond)
    const bf = bf13 ?? bfJP7 ?? bfDW4;
    newEntry.body_fat_pct = bf !== null ? parseFloat(bf.toFixed(2)) : 0;
    setCurrentEntry(newEntry);
    persistEntry(newEntry);
  };

  const currentWeightEntry = weightStore.entries.find(e => e.date === selectedDate);
  const currentBpmRest = currentWeightEntry?.bpm_rest ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
        <ScreenHeader tag="BODY · MENSURATION" title="DÉTAILS PHYSIQUES" />
        {/* A7: Non-blocking profile alert */}
        {profileIncomplete && (
          <Touch
            onPress={() => setShowProfileEditor(true)}
            style={[s.profileAlert, { borderColor: theme.statusWarn, backgroundColor: `${theme.statusWarn}14` }]}
          >
            <AlertTriangle size={14} color={theme.statusWarn} />
            <Text style={[s.xsLabel, { color: theme.statusWarn, flex: 1 }]}>PROFIL ANTHROPOMÉTRIQUE À COMPLÉTER →</Text>
          </Touch>
        )}
      </View>

      <View style={[s.statsRow, { backgroundColor: theme.surface }]}>
        <View style={[s.statCol, { borderRightWidth: 1, borderRightColor: Clr.white5 }]}>
          <Text style={[s.statLabel, { color: theme.selected }]}>Poids</Text>
          <View style={s.baselineRow}>
            <TextInput
              style={[s.bigInput, { color: theme.title, width: 80, textAlign: 'center' }]}
              keyboardType="numeric"
              value={currentWeightEntry?.weight?.toString() ?? ''}
              onChangeText={updateWeight}
              placeholder={lastKnownWeight ? lastKnownWeight.weight.toString() : '00.0'}
              placeholderTextColor={lastKnownWeight ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)'}
            />
            <Text style={[s.unit, { color: theme.mute }]}>KG</Text>
          </View>
          {lastKnownWeight && (
            <Text style={[s.xsLabel, { color: theme.mute, marginTop: 4 }]}>DERNIÈRE PESÉE — J-{lastKnownWeight.daysAgo}</Text>
          )}
        </View>
        <View style={[s.statCol, { borderRightWidth: 1, borderRightColor: Clr.white5 }]}>
          <Text style={[s.statLabel, { color: theme.selected }]}>BPM Repos</Text>
          <View style={s.baselineRow}>
            <TextInput
              style={[s.bigInput, { color: theme.title, width: 64, textAlign: 'center' }]}
              keyboardType="numeric"
              value={currentBpmRest > 0 ? currentBpmRest.toString() : ''}
              onChangeText={updateBpm}
              placeholder="00"
              placeholderTextColor="rgba(128,128,128,0.5)"
            />
            <Text style={[s.unit, { color: theme.mute }]}>BPM</Text>
          </View>
        </View>
        <View style={s.statCol}>
          <Text style={[s.statLabel, { color: theme.selected }]}>Grasse</Text>
          <View style={s.baselineRow}>
            <Text style={[s.bigValue, { color: theme.title }]}>{currentEntry.body_fat_pct || '--.-'}</Text>
            <Text style={[s.unit, { color: theme.mute }]}>%</Text>
          </View>
        </View>
      </View>

      <ProfileEditorModal
        visible={showProfileEditor}
        existing={anthropoStore.latest}
        onClose={() => setShowProfileEditor(false)}
        onSave={(entry) => { void anthropoStore.save(entry); setShowProfileEditor(false); }}
      />

      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ padding: 24 }}>
          {/* Profil anthropométrique — raccourci édition */}
          <View style={{ marginBottom: 32 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Heading level={4} mono subtitle="Données fixes" style={{ marginBottom: 0 }}>PROFIL</Heading>
              <Touch onPress={() => setShowProfileEditor(true)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: theme.selected, backgroundColor: Clr.gold12 }}>
                <Text style={{ fontSize: Fs.xs, fontWeight: Fw.value, color: theme.selected, letterSpacing: 1 }}>ÉDITER</Text>
              </Touch>
            </View>
            {anthropoStore.latest ? (
              <Card variant="flat" style={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <View style={{ minWidth: 80 }}>
                  <Text style={{ fontSize: Fs.xs, color: theme.mute, letterSpacing: 1 }}>SEXE</Text>
                  <Text style={{ fontSize: Fs.md, fontWeight: Fw.value, color: theme.title }}>{anthropoStore.latest.sex === 'male' ? 'HOMME' : 'FEMME'}</Text>
                </View>
                <View style={{ minWidth: 80 }}>
                  <Text style={{ fontSize: Fs.xs, color: theme.mute, letterSpacing: 1 }}>ÂGE</Text>
                  <Text style={{ fontSize: Fs.md, fontWeight: Fw.value, color: theme.title }}>{profileAge} ans</Text>
                </View>
                <View style={{ minWidth: 80 }}>
                  <Text style={{ fontSize: Fs.xs, color: theme.mute, letterSpacing: 1 }}>TAILLE</Text>
                  <Text style={{ fontSize: Fs.md, fontWeight: Fw.value, color: theme.title }}>{anthropoStore.latest.heightCm} cm</Text>
                </View>
                {anthropoStore.latest.boneStructure && (
                  <View style={{ minWidth: 80 }}>
                    <Text style={{ fontSize: Fs.xs, color: theme.mute, letterSpacing: 1 }}>OSSATURE</Text>
                    <Text style={{ fontSize: Fs.md, fontWeight: Fw.value, color: theme.title }}>{anthropoStore.latest.boneStructure === 'small' ? 'FINE' : anthropoStore.latest.boneStructure === 'medium' ? 'MOYENNE' : 'LARGE'}</Text>
                  </View>
                )}
              </Card>
            ) : (
              <Touch onPress={() => setShowProfileEditor(true)} style={{ padding: 16, borderWidth: 1, borderColor: Clr.white10, backgroundColor: Clr.white5, alignItems: 'center' }}>
                <Text style={{ fontSize: Fs.sm, color: theme.mute }}>Aucun profil — Appuyer pour créer</Text>
              </Touch>
            )}
          </View>

          {/* S2.1 — Évolution du poids (SVG inline) */}
          <View style={{ marginBottom: 40 }}>
            <View style={[s.rowBetween, { alignItems: 'flex-end', marginBottom: 16, paddingHorizontal: 4 }]}>
              <Heading level={4} mono subtitle="Courbe temporelle" style={{ marginBottom: 0 }}>ÉVOLUTION DU POIDS</Heading>
              <View style={[s.filterBox, { backgroundColor: theme.surface, borderColor: Clr.white5 }]}>
                {([30, 90, 365] as const).map(d => (
                  <Touch key={d} onPress={() => setWeightFilter(d)} style={[s.filterBtn, weightFilter === d && { backgroundColor: theme.selected }]}>
                    <Text style={[s.smLabel, { color: weightFilter === d ? '#000' : theme.mute }]}>{d === 365 ? '1AN' : `${d}J`}</Text>
                  </Touch>
                ))}
              </View>
            </View>
            <Card variant="flat" style={[s.cardFlat, { padding: 20 }]}>
              {weightSeries.length < 2 ? (
                <View style={{ height: 100, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[s.mdLabel, { color: theme.mute }]}>Pas assez de données</Text>
                </View>
              ) : (() => {
                const ws = weightSeries;
                const xs = ws.map(e => new Date(e.date).getTime());
                const ys = ws.map(e => e.weight ?? 0);
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
                  <View>
                    <View style={[s.rowBetween, { alignItems: 'baseline', marginBottom: 8 }]}>
                      <Text style={[s.monoSm, { color: theme.mute }]}>MIN {minY.toFixed(1)} KG</Text>
                      <Text style={[s.monoSm, { color: theme.mute }]}>MAX {maxY.toFixed(1)} KG</Text>
                    </View>
                    <View style={{ width: '100%', height: 100 }}>
                      <Svg width="100%" height={100} viewBox="0 0 300 100" preserveAspectRatio="none">
                        <SvgPolyline fill="none" stroke={theme.selected} strokeOpacity={0.7} strokeWidth={1.5} points={polyline} />
                        {points.map((p, i) => (
                          <SvgCircle key={i} cx={p.x} cy={p.y} r={3} fill={theme.selected} />
                        ))}
                      </Svg>
                    </View>
                    {/* S2.2 — Tendance hebdomadaire */}
                    {weeklyTrend && (
                      <View style={[s.rowBetween, { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Clr.white5 }]}>
                        <Text style={[s.smLabel, { color: theme.mute }]}>Tendance 7J</Text>
                        {(() => {
                          const d = weeklyTrend.delta;
                          if (d === 0) {
                            return <Text style={[s.monoBold, { color: theme.mute }]}>→ Stable</Text>;
                          }
                          const isUp = d > 0;
                          const arrow = isUp ? '▲' : '▼';
                          const sign = isUp ? '+' : '−';
                          const color = isUp ? theme.danger : theme.statusOk;
                          return <Text style={[s.monoBold, { color }]}>{arrow} {sign}{Math.abs(d).toFixed(1)} kg</Text>;
                        })()}
                      </View>
                    )}
                  </View>
                );
              })()}
            </Card>
          </View>

          {/* S2.3 — Objectifs configurables */}
          <View style={{ marginBottom: 40 }}>
            <Heading level={4} mono subtitle="Cibles opératives" style={{ marginBottom: 24 }}>OBJECTIFS</Heading>
            <View style={[s.grid2, { marginBottom: 16 }]}>
              <Card variant="flat" style={[s.cardWhite5, s.grid2Item, { padding: 16 }]}>
                <Text style={[s.smLabel, { color: theme.selected, marginBottom: 8 }]}>Poids cible</Text>
                <View style={s.baselineRow}>
                  <TextInput style={[s.mediumInput, { color: theme.title, flex: 1 }]} keyboardType="numeric" value={targetWeightKg} onChangeText={setTargetWeightKg} placeholder="00.0" placeholderTextColor="rgba(128,128,128,0.5)" />
                  <Text style={[s.unit, { color: theme.mute }]}>KG</Text>
                </View>
              </Card>
              <Card variant="flat" style={[s.cardWhite5, s.grid2Item, { padding: 16 }]}>
                <Text style={[s.smLabel, { color: theme.selected, marginBottom: 8 }]}>% Graisse cible</Text>
                <View style={s.baselineRow}>
                  <TextInput style={[s.mediumInput, { color: theme.title, flex: 1 }]} keyboardType="numeric" value={targetBodyFatPct} onChangeText={setTargetBodyFatPct} placeholder="00.0" placeholderTextColor="rgba(128,128,128,0.5)" />
                  <Text style={[s.unit, { color: theme.mute }]}>%</Text>
                </View>
              </Card>
            </View>
            {goalProgress && (
              <Card variant="flat" style={[s.cardFlat, { padding: 16 }]}>
                <View style={[s.rowBetween, { alignItems: 'baseline', marginBottom: 8 }]}>
                  <Text style={[s.smLabel, { color: theme.mute }]}>Progression poids</Text>
                  <Text style={[s.monoBold, { color: theme.title }]}>{goalProgress.current.toFixed(1)} / {goalProgress.target.toFixed(1)} KG</Text>
                </View>
                <View style={{ height: 4, backgroundColor: Clr.white5, overflow: 'hidden' }}>
                  <View style={{ height: 4, width: `${goalProgress.pct}%`, backgroundColor: goalProgress.status === 'ok' ? theme.statusOk : goalProgress.status === 'warn' ? theme.statusWarn : theme.danger }} />
                </View>
                <Text style={[s.monoBold, { fontSize: Fs.xs, marginTop: 8, textTransform: 'uppercase', letterSpacing: Ls.xs_02, color: goalProgress.status === 'ok' ? theme.statusOk : goalProgress.status === 'warn' ? theme.statusWarn : theme.danger }]}>Δ {goalProgress.diff.toFixed(1)} KG</Text>
              </Card>
            )}
          </View>

          {/* Log poids quotidien */}
          <View style={{ marginBottom: 40 }}>
            <Heading level={4} mono subtitle="Suivi quotidien" style={{ marginBottom: 24 }}>POIDS DU JOUR</Heading>
            <Card variant="flat" style={[s.cardFlat, { padding: 20 }]}>
              <View style={[s.row, { gap: 16, marginBottom: 16 }]}>
                <TextInput style={[s.bigInput, { color: theme.title, width: 96 }]} keyboardType="numeric" value={weightInput} onChangeText={setWeightInput} placeholder={weightStore.todayEntry ? String(weightStore.todayEntry.weight) : '00.0'} placeholderTextColor="rgba(255,255,255,0.2)" />
                <Text style={[s.unit, { color: theme.mute }]}>KG</Text>
                <Touch
                  onPress={async () => {
                    const w = parseFloat(weightInput.replace(',', '.'));
                    if (isNaN(w) || w <= 0) return;
                    const today = ds(new Date());
                    const existing = weightStore.todayEntry;
                    const entry = existing
                      ? { ...existing, weight: w, savedAt: Date.now() }
                      : { v: 3 as const, date: today, savedAt: Date.now(), weight: w, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
                    await weightStore.add(entry);
                    setWeightInput('');
                  }}
                  style={{ backgroundColor: theme.selected, paddingHorizontal: 16, paddingVertical: 8 }}
                >
                  <Text style={[s.mdLabel, { color: '#000' }]}>ENREGISTRER</Text>
                </Touch>
              </View>
              {weightStore.avg7d > 0 && (
                <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: Clr.white5 }}>
                  <View style={s.rowBetween}>
                    <Text style={[s.smLabel, { color: theme.mute }]}>Moyenne 7j</Text>
                    <Text style={[s.monoBold, { color: theme.title }]}>{weightStore.avg7d.toFixed(1)} kg</Text>
                  </View>
                </View>
              )}
            </Card>
          </View>

          {/* Indices corporels */}
          {indices && (
            <View style={{ marginBottom: 40 }}>
              <Heading level={4} mono subtitle="Métriques dérivées" style={{ marginBottom: 24 }}>INDICES</Heading>
              <View style={s.grid2}>
                {indices.imcVal !== null && (
                  <Card variant="flat" style={[s.cardFlat, s.grid2Item, { padding: 16 }]}>
                    <Text style={[s.smLabel, { color: theme.selected, marginBottom: 4 }]}>IMC</Text>
                    <Text style={[s.mediumValue, { color: theme.title }]}>{indices.imcVal}</Text>
                    <Text style={[s.xsLabel, { color: theme.mute, marginTop: 4 }]}>{indices.imcVal < 18.5 ? 'Insuffisance pondérale' : indices.imcVal < 25 ? 'Poids normal' : indices.imcVal < 30 ? 'Surpoids' : 'Obésité'}</Text>
                  </Card>
                )}
                {indices.ffmiNorm !== null ? (
                  <Card variant="flat" style={[s.cardFlat, s.grid2Item, { padding: 16 }]}>
                    <Text style={[s.smLabel, { color: theme.selected, marginBottom: 4 }]}>FFMI NORM.</Text>
                    <Text style={[s.mediumValue, { color: theme.title }]}>{indices.ffmiNorm}</Text>
                    <Text style={[s.xsLabel, { color: theme.mute, marginTop: 4 }]}>{indices.ffmiNorm >= 25 ? 'Plafond naturel atteint' : indices.ffmiNorm >= 22 ? 'Très musclé' : indices.ffmiNorm >= 18 ? 'Athlétique' : 'Standard'}</Text>
                  </Card>
                ) : indices.ffmi !== null ? (
                  <Card variant="flat" style={[s.cardFlat, s.grid2Item, { padding: 16 }]}>
                    <Text style={[s.smLabel, { color: theme.selected, marginBottom: 4 }]}>FFMI</Text>
                    <Text style={[s.mediumValue, { color: theme.title }]}>{indices.ffmi}</Text>
                    <Text style={[s.xsLabel, { color: theme.mute, marginTop: 4 }]}>plafond naturel 25,0</Text>
                  </Card>
                ) : null}
                {indices.bfRange !== null ? (
                  <Card variant="flat" style={[s.cardFlat, s.grid2Item, { padding: 16 }]}>
                    <Text style={[s.smLabel, { color: theme.selected, marginBottom: 4 }]}>BF% FOURCHETTE</Text>
                    <Text style={[s.mediumValue, { color: theme.title }]}>{indices.bfRange.low}–{indices.bfRange.high}<Text style={{ fontSize: 14, color: theme.mute }}> %</Text></Text>
                    <Text style={[s.xsLabel, { color: theme.mute, marginTop: 4 }]}>{indices.bfRange.methods.join(' + ')}</Text>
                  </Card>
                ) : indices.navyBF !== null ? (
                  <Card variant="flat" style={[s.cardFlat, s.grid2Item, { padding: 16 }]}>
                    <Text style={[s.smLabel, { color: theme.selected, marginBottom: 4 }]}>BF% Navy</Text>
                    <Text style={[s.mediumValue, { color: theme.title }]}>{indices.navyBF}<Text style={{ fontSize: 14, color: theme.mute }}> %</Text></Text>
                    <Text style={[s.xsLabel, { color: theme.mute, marginTop: 4 }]}>Formule US Navy</Text>
                  </Card>
                ) : null}
                {indices.whtr !== null && (
                  <Card variant="flat" style={[s.cardFlat, s.grid2Item, { padding: 16 }]}>
                    <Text style={[s.smLabel, { color: theme.selected, marginBottom: 4 }]}>WHtR</Text>
                    <Text style={[s.mediumValue, { color: indices.whtr < 0.50 ? theme.statusOk : indices.whtr < 0.55 ? theme.statusWarn : theme.danger }]}>{indices.whtr}</Text>
                    <Text style={[s.xsLabel, { color: theme.mute, marginTop: 4 }]}>cible &lt; 0,50</Text>
                  </Card>
                )}
                {indices.whr !== null && (
                  <Card variant="flat" style={[s.cardFlat, s.grid2Item, { padding: 16 }]}>
                    <Text style={[s.smLabel, { color: theme.selected, marginBottom: 4 }]}>WHR</Text>
                    <Text style={[s.mediumValue, { color: indices.whr < 0.90 ? theme.statusOk : indices.whr < 0.95 ? theme.statusWarn : theme.danger }]}>{indices.whr}</Text>
                    <Text style={[s.xsLabel, { color: theme.mute, marginTop: 4 }]}>cible &lt; 0,90</Text>
                  </Card>
                )}
              </View>
            </View>
          )}

          {/* Quick Log Input */}
          <View style={{ marginBottom: 40 }}>
            <Card variant="flat" style={[s.row, s.cardWhite5, { gap: 16, padding: 20 }]}>
              <View style={[s.row, { flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: Clr.white5, paddingHorizontal: 16, paddingVertical: 8 }]}>
                <Database size={14} color={theme.selected} style={{ marginRight: 12, opacity: 0.5 }} />
                <TextInput
                  style={{ flex: 1, height: 40, fontSize: 14, fontWeight: Fw.value, color: theme.title }}
                  placeholder="BIO-LOG: CAPTURE..."
                  placeholderTextColor="rgba(255,255,255,0.15)"
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={handleAddEntry}
                />
              </View>
              <Touch onPress={handleAddEntry} style={{ width: 48, height: 48, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Clr.white10 }}>
                <Plus size={20} color={theme.selected} />
              </Touch>
            </Card>
          </View>

          {/* A5 — Jumeau numérique + asymétrie heatmap */}
          {indices && (
            <View style={{ marginBottom: 40 }}>
              <Heading level={4} mono subtitle="Musculature 12 semaines" style={{ marginBottom: 16 }}>JUMEAU NUMÉRIQUE</Heading>
              <BodySvg
                mode="heatmap"
                muscleValues={(() => {
                  const last = measureStore.history.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
                  if (!last?.skinfolds) return {};
                  const circumFlat: Record<string, number> = {};
                  for (const [k, v] of Object.entries(last.circumferences ?? {})) {
                    if (v) circumFlat[k] = median(v);
                  }
                  const sym = analyzeSymmetry(circumFlat);
                  const result: Partial<Record<MuscleId, number>> = {};
                  for (const sm of sym) {
                    const val = asymmetryToHeatmapValue(sm.diffPct);
                    if (sm.muscleKey === 'arm') { result['biceps_left'] = val; result['biceps_right'] = val; }
                    else if (sm.muscleKey === 'forearm') { result['forearms_left'] = val; result['forearms_right'] = val; }
                    else if (sm.muscleKey === 'thigh') { result['quads_left'] = val; result['quads_right'] = val; result['hamstrings_left'] = val; result['hamstrings_right'] = val; }
                    else if (sm.muscleKey === 'calf') { result['calves_left'] = val; result['calves_right'] = val; }
                  }
                  return result;
                })() as Record<MuscleId, number>}
              />
            </View>
          )}

          {/* ─── CARTOGRAPHIE CORPORELLE ─── */}
          <View style={{ marginBottom: 40 }}>
            {/* Date selector */}
            <View style={[s.rowBetween, { marginBottom: 20, paddingHorizontal: 4 }]}>
              <Heading level={4} mono subtitle="Cliquer une ligne pour saisir" style={{ marginBottom: 0 }}>MENSURATIONS</Heading>
              <View style={[s.row, { gap: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: Clr.white5, paddingHorizontal: 8, paddingVertical: 4 }]}>
                <Touch onPress={() => shiftDate(-1)} style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronLeft size={14} color={theme.mute} />
                </Touch>
                <Text style={[s.monoSm, { color: theme.selected }]}>{selectedDate === todayStr ? 'AUJOURD\'HUI' : selectedDate.split('-').slice(1).join('/')}</Text>
                <Touch onPress={() => shiftDate(1)} style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center', opacity: selectedDate === todayStr ? 0.2 : 1 }}>
                  <ChevronRight size={14} color={theme.mute} />
                </Touch>
              </View>
            </View>

            {/* SVG body + inline input panel */}
            <View style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: Clr.white8, padding: 16, marginBottom: 16 }}>
              <BodyMeasureSvg
                measurements={Object.fromEntries(
                  Object.entries(currentEntry.circumferences ?? {}).map(([k, v]) => [k, v ? median(v) : 0])
                )}
                selectedKey={selectedPart}
                onSelect={handlePartPress}
              />
            </View>

            {/* Inline input panel — shows when a line is selected */}
            {selectedPart && (() => {
              const measure = BODY_MEASURES.find(m => m.key === selectedPart);
              return (
                <View style={{ borderWidth: 1, borderColor: Clr.gold30, backgroundColor: 'rgba(212,175,55,0.05)', padding: 20, marginBottom: 16 }}>
                  <View style={[s.row, { gap: 16 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.xsLabel, { color: theme.selected, letterSpacing: Ls.md_03, marginBottom: 4 }]}>{measure?.label ?? selectedPart}</Text>
                      <View style={s.baselineRow}>
                        <TextInput
                          style={{ fontSize: 36, fontWeight: Fw.display, color: theme.selected, fontFamily: FontMono, flex: 1 }}
                          autoFocus
                          keyboardType="decimal-pad"
                          value={inputValue}
                          onChangeText={setInputValue}
                          placeholder="00.0"
                          placeholderTextColor="rgba(212,175,55,0.2)"
                          onSubmitEditing={saveMeasurement}
                        />
                        <Text style={{ fontSize: 14, fontWeight: Fw.display, color: theme.selected, fontFamily: FontMono, opacity: 0.6 }}>CM</Text>
                      </View>
                    </View>
                    <View style={{ gap: 8 }}>
                      <Touch onPress={saveMeasurement} style={{ width: 48, height: 48, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, color: '#000', fontFamily: FontMono }}>OK</Text>
                      </Touch>
                      <Touch onPress={() => setSelectedPart(null)} style={{ width: 48, height: 48, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white10, alignItems: 'center', justifyContent: 'center' }}>
                        <X size={14} color={theme.mute} />
                      </Touch>
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Measurement chips — quick overview */}
            <View style={s.grid3}>
              {BODY_MEASURES.map(({ key, label }) => {
                const triple = currentEntry.circumferences?.[key as CircumferenceKey];
                const val = triple ? median(triple) : undefined;
                const active = selectedPart === key;
                const hasVal = val !== undefined && val > 0;
                return (
                  <Touch
                    key={key}
                    onPress={() => handlePartPress(key)}
                    style={[s.grid3Item, { padding: 12, borderWidth: 1, borderColor: active ? theme.selected : hasVal ? Clr.white10 : Clr.white5, backgroundColor: active ? Clr.gold10 : hasVal ? 'rgba(255,255,255,0.03)' : 'transparent' }]}
                  >
                    <Text style={[s.xxsLabel, { color: active ? theme.selected : theme.mute, marginBottom: 4 }]}>{label}</Text>
                    <Text style={{ fontSize: 16, fontWeight: Fw.display, fontFamily: FontMono, color: active ? theme.selected : hasVal ? theme.title : 'rgba(255,255,255,0.15)' }}>
                      {hasVal ? `${val}` : '--'}<Text style={{ fontSize: Fs.xs, opacity: 0.6 }}> cm</Text>
                    </Text>
                  </Touch>
                );
              })}
            </View>
          </View>

          {/* A1 — Mesures bilatérales L/R */}
          <View style={{ marginBottom: 40 }}>
            <Heading level={4} mono subtitle="Symétrie musculaire G/D" style={{ marginBottom: 24 }}>MESURES BILATÉRALES</Heading>
            {(() => {
              const circumFlat: Record<string, number> = {};
              for (const [k, v] of Object.entries(currentEntry.circumferences ?? {})) {
                if (v) circumFlat[k] = median(v);
              }
              const symmetryResults = analyzeSymmetry(circumFlat);
              const heatmapValues: Partial<Record<MuscleId, number>> = {};
              for (const r of symmetryResults) {
                const id = r.muscleKey as MuscleId;
                heatmapValues[id] = asymmetryToHeatmapValue(r.diffPct);
              }
              const hasAsymmetry = symmetryResults.some(r => r.asymmetric);
              return (
                <>
                  {hasAsymmetry && (
                    <View style={[s.row, { marginBottom: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, gap: 12, borderColor: theme.statusWarn, backgroundColor: `${theme.statusWarn}14` }]}>
                      <AlertTriangle size={14} color={theme.statusWarn} />
                      <Text style={[s.xsLabel, { color: theme.statusWarn }]}>ASYMÉTRIE DÉTECTÉE (&gt;5%)</Text>
                    </View>
                  )}
                  <View style={[s.grid2, { marginBottom: 16 }]}>
                    {BILATERAL_MEASURES.map(({ base, label, leftKey, rightKey }) => {
                      const lVal = currentEntry.circumferences?.[leftKey as CircumferenceKey]?.[0] ?? 0;
                      const rVal = currentEntry.circumferences?.[rightKey as CircumferenceKey]?.[0] ?? 0;
                      const result = symmetryResults.find(r => r.muscleKey === base);
                      const warn = result?.asymmetric;
                      return (
                        <Card key={base} variant="flat" style={[s.cardFlat, s.grid2Item, { padding: 16 }, warn ? { borderColor: theme.statusWarn } : {}]}>
                          <Text style={[s.xsLabel, { color: warn ? theme.statusWarn : theme.selected, marginBottom: 12 }]}>{label} {warn && '⚠'}</Text>
                          <View style={[s.row, { gap: 12 }]}>
                            <View style={{ flex: 1 }}>
                              <Text style={[s.xxsLabel, { color: theme.mute, marginBottom: 4 }]}>GAUCHE</Text>
                              <TextInput
                                style={{ fontSize: 20, fontWeight: Fw.display, fontFamily: FontMono, color: theme.title, width: '100%' }}
                                keyboardType="decimal-pad"
                                placeholder="--"
                                placeholderTextColor="rgba(255,255,255,0.15)"
                                value={lVal > 0 ? String(lVal) : ''}
                                onChangeText={(v: string) => {
                                  const n = parseFloat(v);
                                  const newEntry = { ...currentEntry };
                                  if (!isNaN(n) && n > 0) {
                                    newEntry.circumferences = { ...newEntry.circumferences, [leftKey as CircumferenceKey]: [n, n, n] as TrialTuple };
                                  }
                                  setCurrentEntry(newEntry);
                                  persistEntry(newEntry);
                                }}
                              />
                            </View>
                            <View style={{ width: 1, backgroundColor: Clr.white5 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={[s.xxsLabel, { color: theme.mute, marginBottom: 4 }]}>DROITE</Text>
                              <TextInput
                                style={{ fontSize: 20, fontWeight: Fw.display, fontFamily: FontMono, color: theme.title, width: '100%' }}
                                keyboardType="decimal-pad"
                                placeholder="--"
                                placeholderTextColor="rgba(255,255,255,0.15)"
                                value={rVal > 0 ? String(rVal) : ''}
                                onChangeText={(v: string) => {
                                  const n = parseFloat(v);
                                  const newEntry = { ...currentEntry };
                                  if (!isNaN(n) && n > 0) {
                                    newEntry.circumferences = { ...newEntry.circumferences, [rightKey as CircumferenceKey]: [n, n, n] as TrialTuple };
                                  }
                                  setCurrentEntry(newEntry);
                                  persistEntry(newEntry);
                                }}
                              />
                            </View>
                          </View>
                          {result && lVal > 0 && rVal > 0 && (
                            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Clr.white5 }}>
                              <Text style={[s.xxsLabel, { color: warn ? theme.statusWarn : theme.statusOk }]}>Δ {result.diffPct.toFixed(1)}%</Text>
                            </View>
                          )}
                        </Card>
                      );
                    })}
                  </View>
                  {hasAsymmetry && (
                    <View style={{ marginTop: 16, maxWidth: 280, alignSelf: 'center', width: '100%' }}>
                      <BodySvg mode="heatmap" muscleValues={heatmapValues} />
                    </View>
                  )}
                </>
              );
            })()}
          </View>

          {/* A2 — Protocole 13 plis (caliper requis) */}
          <View style={{ marginBottom: 40 }}>
            <Heading level={4} mono subtitle="Protocole Haute Densité — Caliper requis (~25–50€)" style={{ marginBottom: 16 }}>PLIS CUTANÉS 13 SITES</Heading>
            <View style={{ marginBottom: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: Clr.white10, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <Text style={{ fontSize: Fs.xs, color: theme.mute, lineHeight: Math.round(Fs.xs * 1.6) }}>
                Saisir les plis en mm, côté droit, à jeun. Pince appliquée à 1 cm du point marqué. Trois formules calculées en parallèle : 13 plis (modèle haute densité), JP7 (profils athlétiques) et DW4 (population générale).
              </Text>
            </View>
            <View style={[s.grid2, { marginBottom: 24 }]}>
              {SKINFOLD_SITES.map(({ key, label, note }) => {
                const val = currentEntry.skinfolds?.[key as SkinfoldKey]?.[0] ?? 0;
                const isInJP7 = (JP7_SITES as readonly string[]).includes(key);
                const isInDW4 = (DW4_SITES as readonly string[]).includes(key);
                return (
                  <Card key={key} variant="flat" style={[s.cardFlat, s.grid2Item, { padding: 16 }]}>
                    <View style={[s.rowBetween, { alignItems: 'flex-start', marginBottom: 8 }]}>
                      <Text style={[s.xxsLabel, { color: theme.selected }]}>{label}</Text>
                      <View style={[s.row, { gap: 4 }]}>
                        {isInJP7 && <Text style={[s.badge, { backgroundColor: Clr.gold12, color: theme.selected }]}>JP7</Text>}
                        {isInDW4 && <Text style={[s.badge, { backgroundColor: Clr.white8, color: theme.mute }]}>DW4</Text>}
                      </View>
                    </View>
                    <Text style={{ fontSize: Fs.sm, color: theme.mute, marginBottom: 8, lineHeight: Math.round(Fs.sm * 1.3) }}>{note}</Text>
                    <View style={s.baselineRow}>
                      <TextInput
                        style={[s.mediumValue, { color: theme.title, flex: 1 }]}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                        placeholderTextColor="rgba(255,255,255,0.12)"
                        value={val > 0 ? String(val) : ''}
                        onChangeText={(v: string) => updateSkinfold(key, v)}
                      />
                      <Text style={[s.unit, { fontSize: Fs.xs, color: theme.mute }]}>mm</Text>
                    </View>
                  </Card>
                );
              })}
            </View>

            {/* Matrice de suivi 3 formules */}
            {(() => {
              const sk = currentEntry.skinfolds ?? {};
              const a = profileAge;
              const sex = profileSex;
              const s13Total = ALL13_SITES.every(k => sk[k as SkinfoldKey] != null)
                ? ALL13_SITES.reduce((sum, k) => sum + median(sk[k as SkinfoldKey]!), 0) : 0;
              const bf13 = s13Total > 0 ? BiometricsService.skinfolds13(s13Total, a, sex) : null;
              const bfJP7 = JP7_SITES.every(k => sk[k as SkinfoldKey] != null)
                ? BiometricsService.jacksonPollock7(median(sk['pectoral']!), median(sk['axillaire']!), median(sk['triceps']!), median(sk['subscapular']!), median(sk['abdominal']!), median(sk['suprailiac']!), median(sk['thigh_anterior']!), a, sex) : null;
              const bfDW4 = DW4_SITES.every(k => sk[k as SkinfoldKey] != null)
                ? BiometricsService.durninWomersley4(median(sk['biceps']!), median(sk['triceps']!), median(sk['subscapular']!), median(sk['suprailiac']!), a, sex) : null;
              const vals = [bf13, bfJP7, bfDW4].filter((v): v is number => v !== null);
              const ecartMax = vals.length >= 2 ? parseFloat((Math.max(...vals) - Math.min(...vals)).toFixed(1)) : null;
              const hasAny = vals.length > 0;
              if (!hasAny) return null;
              return (
                <Card variant="flat" style={{ padding: 16, borderWidth: 1, borderColor: Clr.gold20, backgroundColor: 'rgba(212,175,55,0.03)' }}>
                  <Text style={[s.xsLabel, { color: theme.selected, marginBottom: 16 }]}>MATRICE DE SUIVI</Text>
                  <View style={[s.row, { marginBottom: 8 }]}>
                    {(['S13', '%G 13P', '%G JP7', '%G DW4'] as const).map(h => (
                      <Text key={h} style={[s.smLabel, { color: theme.mute, flex: 1, textAlign: 'center' }]}>{h}</Text>
                    ))}
                  </View>
                  <View style={[s.row, { borderTopWidth: 1, borderTopColor: Clr.white5, paddingTop: 8 }]}>
                    <Text style={[s.matrixVal, { color: theme.title }]}>{s13Total > 0 ? s13Total : '–'}</Text>
                    <Text style={[s.matrixVal, { color: bf13 !== null ? theme.selected : theme.mute }]}>{bf13 !== null ? `${bf13}%` : '–'}</Text>
                    <Text style={[s.matrixVal, { color: bfJP7 !== null ? theme.title : theme.mute }]}>{bfJP7 !== null ? `${bfJP7}%` : '–'}</Text>
                    <Text style={[s.matrixVal, { color: bfDW4 !== null ? theme.title : theme.mute }]}>{bfDW4 !== null ? `${bfDW4}%` : '–'}</Text>
                  </View>
                  {ecartMax !== null && (
                    <View style={[s.rowBetween, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Clr.white5 }]}>
                      <Text style={[s.xsLabel, { color: theme.mute }]}>ÉCART MAX</Text>
                      <Text style={[s.monoBold, { color: ecartMax > 3 ? theme.statusWarn : theme.statusOk }]}>{ecartMax}%</Text>
                    </View>
                  )}
                </Card>
              );
            })()}
          </View>

          <View style={{ marginBottom: 40 }}>
            <Heading level={4} mono subtitle="Récupération Chrono" style={{ marginBottom: 24 }}>HISTORIQUE DES CAPTURES</Heading>
            <View style={{ gap: 12 }}>
              {measureStore.history.slice(-5).reverse().map((h) => (
                <Card key={h.date} variant="flat" style={[s.row, s.cardFlat, { gap: 12, padding: 16 }]}>
                  <View style={{ width: 40, height: 40, borderRadius: 9999, borderWidth: 1, borderColor: Clr.white10, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[s.monoSm, { color: theme.mute }]}>{h.date.split('-').slice(1).join('/')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.baselineRow}>
                      <Text style={{ fontSize: 20, fontWeight: Fw.display, color: theme.title, fontFamily: FontMono }}>{getWeightKg(h.date) || '—'}</Text>
                      <Text style={[s.unit, { fontSize: Fs.sm, color: theme.mute }]}>KG</Text>
                    </View>
                  </View>
                  <View style={{ width: 1, height: 32, backgroundColor: Clr.white5 }} />
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <View style={s.baselineRow}>
                      <Text style={{ fontSize: 20, fontWeight: Fw.display, color: theme.selected, fontFamily: FontMono }}>{h.body_fat_pct}</Text>
                      <Text style={[s.unit, { fontSize: Fs.sm, color: theme.mute }]}>%</Text>
                    </View>
                  </View>
                  <Touch onPress={() => handleDeleteMeasurement(h.date)} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5 }}>
                    <X size={14} color={theme.mute} />
                  </Touch>
                </Card>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  baselineRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  profileAlert: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderWidth: 1, borderColor: Clr.white5, marginHorizontal: 24, marginBottom: 24 },
  statCol: { flex: 1, alignItems: 'center' },
  statLabel: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, letterSpacing: Ls.sm_02, textTransform: 'uppercase', marginBottom: 8 },
  bigInput: { fontSize: 30, fontWeight: Fw.display, fontFamily: FontMono },
  bigValue: { fontSize: 30, fontWeight: Fw.display, fontFamily: FontMono },
  mediumInput: { fontSize: 24, fontWeight: Fw.display, fontFamily: FontMono },
  mediumValue: { fontSize: 24, fontWeight: Fw.display, fontFamily: FontMono },
  unit: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.value },
  xxsLabel: { fontFamily: FontMono, fontSize: Fs.xxs, fontWeight: Fw.display, letterSpacing: Ls.xxs_02, textTransform: 'uppercase' },
  xsLabel: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, letterSpacing: Ls.xs_02, textTransform: 'uppercase' },
  smLabel: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, letterSpacing: Ls.sm_02, textTransform: 'uppercase' },
  mdLabel: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, letterSpacing: Ls.md_02, textTransform: 'uppercase' },
  monoSm: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value },
  monoBold: { fontFamily: FontMono, fontSize: 14, fontWeight: Fw.display },
  matrixVal: { fontFamily: FontMono, fontSize: 16, fontWeight: Fw.display, flex: 1, textAlign: 'center' },
  badge: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, paddingHorizontal: 4, paddingVertical: 2 },
  cardFlat: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: Clr.white5 },
  cardWhite5: { backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5 },
  filterBox: { flexDirection: 'row', gap: 4, padding: 4, borderWidth: 1 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  grid2Item: { width: '47%' },
  grid3: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid3Item: { width: '31%' },
});
