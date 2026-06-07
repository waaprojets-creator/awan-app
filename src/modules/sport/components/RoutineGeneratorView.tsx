import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ChevronLeft, CheckCircle2 } from 'lucide-react-native';
import { PageWrapper, StaggerList, StaggerItem } from '@/components/Animated';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Touch } from '@/components/ui/Touch';
import { useTheme } from '@/hooks/useTheme';
import { FontMono } from '@/constants/typography';
import { Fs, Fw, Ls, Clr } from '@/theme/tokens';
import { L } from '@/constants/labels';
import { SYMBOLS } from '@/constants/symbols';
import type { RoutineLatest } from '@/data/schemas/sport/routine';
import type { GeneratorConfig, ObjectifType } from '@/modules/coach/routine-generator/types';
import { generateRoutines } from '@/modules/coach/routine-generator/generator';
import { formatRepsRange, GENERATOR_DEFAULTS } from '@/modules/coach/routine-generator/objectifSpecs';

const G = L.generator;

const OBJECTIFS: ObjectifType[] = ['hypertrophie', 'force', 'endurance', 'recomposition'];
const FREQUENCES: Array<2 | 3 | 4 | 5 | 6> = [2, 3, 4, 5, 6];
type EquipType = GeneratorConfig['equipement'][number];
const ALL_EQUIP: EquipType[] = ['barbell', 'dumbbell', 'cable', 'machine', 'body only'];

interface RoutineGeneratorViewProps {
  onBack: () => void;
  onSave: (routines: RoutineLatest[]) => Promise<void>;
}

export function RoutineGeneratorView({ onBack, onSave }: RoutineGeneratorViewProps) {
  const theme = useTheme();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [objectif, setObjectif] = useState<ObjectifType>(GENERATOR_DEFAULTS.objectif);
  const [frequence, setFrequence] = useState<2 | 3 | 4 | 5 | 6>(GENERATOR_DEFAULTS.frequenceJours);
  const [equipement, setEquipement] = useState<EquipType[]>([...GENERATOR_DEFAULTS.equipement]);
  const [generated, setGenerated] = useState<RoutineLatest[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  function toggleEquip(eq: EquipType) {
    setEquipement(prev => prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]);
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const config: GeneratorConfig = { objectif, niveau: GENERATOR_DEFAULTS.niveau, frequenceJours: frequence, equipement };
      const routines = await generateRoutines(config);
      setGenerated(routines);
      setStep(4);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try { await onSave(generated); } finally { setSaving(false); }
  }

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={s.topPad}>
        <View style={s.headerRow}>
          <Touch
            onPress={step === 1 ? onBack : () => setStep(sv => (sv - 1) as 1 | 2 | 3 | 4)}
            style={[s.iconBtn, { backgroundColor: Clr.white5 }]}
          >
            <ChevronLeft size={20} color={theme.mute} />
          </Touch>
          <ScreenHeader tag={G.tag(step)} title={G.titles[step]} style={{ flex: 1, marginBottom: 0 }} />
        </View>

        <View style={s.stepIndicator}>
          {[1, 2, 3, 4].map(sv => (
            <View
              key={sv}
              style={[s.stepBar, { flex: 1, backgroundColor: sv <= step ? theme.selected : Clr.white10 }]}
            />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 24 }} style={{ flex: 1 }}>
        {/* Step 1 — Objectif */}
        {step === 1 && (
          <>
            <View style={s.grid2}>
              {OBJECTIFS.map(o => {
                const active = objectif === o;
                const meta = G.objectifs[o];
                return (
                  <Touch
                    key={o}
                    onPress={() => setObjectif(o)}
                    style={[s.optionCard, {
                      borderColor: active ? theme.selected : Clr.white10,
                      backgroundColor: active ? 'rgba(212,175,55,0.10)' : Clr.white5,
                    }]}
                  >
                    <Text style={[s.labelLg, { color: active ? theme.selected : theme.text, marginBottom: 4 }]}>
                      {meta.label}
                    </Text>
                    <Text style={[s.labelSm, { color: theme.mute }]}>
                      {meta.descPrefix} {SYMBOLS.bullet} {formatRepsRange(o)}
                    </Text>
                  </Touch>
                );
              })}
            </View>
            <Touch onPress={() => setStep(2)} style={s.primaryBtn}>
              <Text style={[s.labelBtn, { color: '#000' }]}>{G.next}</Text>
            </Touch>
          </>
        )}

        {/* Step 2 — Fréquence */}
        {step === 2 && (
          <>
            <View style={{ gap: 12, marginBottom: 32 }}>
              {FREQUENCES.map(f => {
                const active = frequence === f;
                return (
                  <Touch
                    key={f}
                    onPress={() => setFrequence(f)}
                    style={[s.rowOption, {
                      borderColor: active ? theme.selected : Clr.white10,
                      backgroundColor: active ? Clr.white5 : 'rgba(255,255,255,0.03)',
                    }]}
                  >
                    <Text style={[s.labelLg, { color: active ? theme.selected : theme.text }]}>{G.freq[f]}</Text>
                    {active && <CheckCircle2 size={18} color={theme.selected} strokeWidth={2.5} />}
                  </Touch>
                );
              })}
            </View>
            <Touch onPress={() => setStep(3)} style={s.primaryBtn}>
              <Text style={[s.labelBtn, { color: '#000' }]}>{G.next}</Text>
            </Touch>
          </>
        )}

        {/* Step 3 — Équipement */}
        {step === 3 && (
          <>
            <View style={{ gap: 12, marginBottom: 32 }}>
              {ALL_EQUIP.map(eq => {
                const active = equipement.includes(eq);
                return (
                  <Touch
                    key={eq}
                    onPress={() => toggleEquip(eq)}
                    style={[s.rowOption, {
                      borderColor: active ? theme.selected : Clr.white10,
                      backgroundColor: active ? Clr.white5 : 'rgba(255,255,255,0.03)',
                    }]}
                  >
                    <Text style={[s.labelLg, { color: active ? theme.selected : theme.mute }]}>{G.equip[eq]}</Text>
                    <Text style={[s.labelLg, { color: active ? theme.selected : 'rgba(255,255,255,0.20)' }]}>
                      {active ? SYMBOLS.diamondFilled : SYMBOLS.diamondOutline}
                    </Text>
                  </Touch>
                );
              })}
            </View>
            {equipement.length === 0 && (
              <Text style={[s.labelMd, { color: theme.danger, marginBottom: 16, fontWeight: Fw.value }]}>
                {G.equipRequired}
              </Text>
            )}
            <Touch
              onPress={handleGenerate}
              disabled={equipement.length === 0 || loading}
              style={[s.primaryBtn, (equipement.length === 0 || loading) && { opacity: 0.5 }]}
            >
              <Text style={[s.labelBtn, { color: '#000' }]}>
                {loading ? G.generating : G.generate}
              </Text>
            </Touch>
          </>
        )}

        {/* Step 4 — Aperçu */}
        {step === 4 && (
          <>
            <View style={{ marginBottom: 16 }}>
              <Text style={[s.label, { color: theme.mute, marginBottom: 4 }]}>
                {G.freq[frequence]} {SYMBOLS.bullet} {G.objectifs[objectif].label}
              </Text>
              <Text style={[s.labelSm, { color: theme.mute, fontWeight: Fw.value }]}>
                {G.daysCount(generated.length)}
              </Text>
            </View>
            {generated.length === 0 ? (
              <Card variant="flat" style={{ paddingVertical: 48, alignItems: 'center' }}>
                <Text style={[s.label, { color: theme.mute, textAlign: 'center' }]}>{G.emptyCatalog}</Text>
              </Card>
            ) : (
              <StaggerList>
                {generated.map((r) => (
                  <StaggerItem key={r.id} style={{ marginBottom: 12 }}>
                    <Card variant="flat">
                      <View style={s.previewRow}>
                        <Text style={[s.previewName, { color: theme.text, flex: 1 }]}>{r.name}</Text>
                        {r.cycleLetter && (
                          <View style={[s.tag, { backgroundColor: 'rgba(212,175,55,0.10)', borderColor: 'rgba(212,175,55,0.20)' }]}>
                            <Text style={[s.labelSm, { color: theme.selected }]}>{L.sport.cycle} {r.cycleLetter}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[s.labelSm, { color: theme.mute, fontWeight: Fw.value }]}>
                        {r.exercises.length} {L.sport.exercises}
                      </Text>
                    </Card>
                  </StaggerItem>
                ))}
              </StaggerList>
            )}

            <View style={{ gap: 12, marginTop: 24 }}>
              <Touch
                onPress={handleSave}
                disabled={saving || generated.length === 0}
                style={[s.primaryBtn, (saving || generated.length === 0) && { opacity: 0.5 }]}
              >
                <Text style={[s.labelBtn, { color: '#000' }]}>
                  {saving ? G.saving : G.save}
                </Text>
              </Touch>
              <Touch
                onPress={() => setStep(3)}
                style={[s.secondaryBtn, { borderColor: Clr.white10 }]}
              >
                <Text style={[s.label, { color: theme.mute }]}>{G.back}</Text>
              </Touch>
            </View>
          </>
        )}
      </ScrollView>
    </PageWrapper>
  );
}

const s = StyleSheet.create({
  topPad: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepIndicator: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  stepBar: { height: 2 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  optionCard: { width: '47%', padding: 20, borderWidth: 1 },
  rowOption: { height: 64, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
  primaryBtn: { height: 56, backgroundColor: 'rgba(212,175,55,1)', alignItems: 'center', justifyContent: 'center' },
  secondaryBtn: { height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  previewName: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.tight },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  label: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  labelXs: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.xs_02 },
  labelSm: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  labelMd: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.md_02 },
  labelLg: { fontFamily: FontMono, fontSize: Fs.lg, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.lg_02 },
  labelBtn: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
});
