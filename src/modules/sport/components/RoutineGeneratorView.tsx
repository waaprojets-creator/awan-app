import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { PageWrapper, StaggerList, StaggerItem } from '@/components/Animated';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Touch } from '@/components/ui/Touch';
import { L } from '@/constants/labels';
import { SYMBOLS } from '@/constants/symbols';
import type { RoutineLatest } from '@/data/schemas/sport/routine';
import type { GeneratorConfig, ObjectifType } from '@/modules/coach/routine-generator/types';
import { generateRoutines } from '@/modules/coach/routine-generator/generator';
import { formatRepsRange } from '@/modules/coach/routine-generator/objectifSpecs';

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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [objectif, setObjectif] = useState<ObjectifType>('hypertrophie');
  const [frequence, setFrequence] = useState<2 | 3 | 4 | 5 | 6>(3);
  const [equipement, setEquipement] = useState<EquipType[]>(['barbell', 'dumbbell', 'cable', 'machine', 'body only']);
  const [generated, setGenerated] = useState<RoutineLatest[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  function toggleEquip(eq: EquipType) {
    setEquipement(prev =>
      prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]
    );
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const config: GeneratorConfig = { objectif, niveau: 'intermediate', frequenceJours: frequence, equipement };
      const routines = await generateRoutines(config);
      setGenerated(routines);
      setStep(4);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(generated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <div className="px-6 pt-4 pb-2">
        <div className="flex flex-row items-center gap-4 mb-4">
          <Touch
            onPress={step === 1 ? onBack : () => setStep(s => (s - 1) as 1 | 2 | 3 | 4)}
            className="w-10 h-10 bg-white/5 flex items-center justify-center"
          >
            <ChevronLeft size={20} className="text-awan-tx-mute" />
          </Touch>
          <ScreenHeader tag={G.tag(step)} title={G.titles[step]} />
        </div>

        {/* Step indicator */}
        <div className="flex flex-row gap-1.5 mb-6">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`h-0.5 flex-1 ${s <= step ? 'bg-awan-gold' : 'bg-white/10'}`}
            />
          ))}
        </div>
      </div>

      <ScrollView contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 24 }} style={{ flex: 1 }}>
        {/* Step 1 — Objectif */}
        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {OBJECTIFS.map(o => {
                const active = objectif === o;
                const meta = G.objectifs[o];
                return (
                  <Touch
                    key={o}
                    onPress={() => setObjectif(o)}
                    className={`p-5 border ${active ? 'border-awan-gold bg-awan-gold/10' : 'border-white/10 bg-white/5'}`}
                  >
                    <span
                      className={`awan-label-lg block mb-1 ${active ? 'text-awan-gold' : 'text-awan-tx'}`}
                    >
                      {meta.label}
                    </span>
                    <span className="awan-label-sm text-awan-tx-mute leading-relaxed" style={{ fontWeight: 700 }}>
                      {meta.descPrefix} {SYMBOLS.bullet} {formatRepsRange(o)}
                    </span>
                  </Touch>
                );
              })}
            </div>
            <Touch onPress={() => setStep(2)} className="h-14 bg-awan-gold flex items-center justify-center">
              <span className="awan-label text-black font-black">{G.next}</span>
            </Touch>
          </>
        )}

        {/* Step 2 — Fréquence */}
        {step === 2 && (
          <>
            <div className="flex flex-col gap-3 mb-8">
              {FREQUENCES.map(f => {
                const active = frequence === f;
                return (
                  <Touch
                    key={f}
                    onPress={() => setFrequence(f)}
                    className={`h-16 px-5 flex flex-row items-center justify-between border ${active ? 'border-awan-gold bg-white/5' : 'border-white/10 bg-white/[0.03]'}`}
                  >
                    <span className={`text-sm font-black tracking-widest ${active ? 'text-awan-gold' : 'text-awan-tx'}`}>
                      {G.freq[f]}
                    </span>
                    {active && <CheckCircle2 size={18} className="text-awan-gold" strokeWidth={2.5} />}
                  </Touch>
                );
              })}
            </div>
            <Touch onPress={() => setStep(3)} className="h-14 bg-awan-gold flex items-center justify-center">
              <span className="awan-label text-black font-black">{G.next}</span>
            </Touch>
          </>
        )}

        {/* Step 3 — Équipement */}
        {step === 3 && (
          <>
            <div className="flex flex-col gap-3 mb-8">
              {ALL_EQUIP.map(eq => {
                const active = equipement.includes(eq);
                return (
                  <Touch
                    key={eq}
                    onPress={() => toggleEquip(eq)}
                    className={`h-14 px-5 flex flex-row items-center justify-between border ${active ? 'border-awan-gold bg-white/5' : 'border-white/10 bg-white/[0.03]'}`}
                  >
                    <span className={`text-sm font-black tracking-widest ${active ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>
                      {G.equip[eq]}
                    </span>
                    <span className={`text-base font-black ${active ? 'text-awan-gold' : 'text-white/20'}`}>
                      {active ? SYMBOLS.diamondFilled : SYMBOLS.diamondOutline}
                    </span>
                  </Touch>
                );
              })}
            </div>
            {equipement.length === 0 && (
              <p className="awan-label-md text-awan-status-error mb-4" style={{ fontWeight: 700 }}>
                {G.equipRequired}
              </p>
            )}
            <Touch
              onPress={handleGenerate}
              disabled={equipement.length === 0 || loading}
              className={`h-14 bg-awan-gold flex items-center justify-center ${equipement.length === 0 || loading ? 'opacity-50' : ''}`}
            >
              <span className="awan-label text-black font-black">
                {loading ? G.generating : G.generate}
              </span>
            </Touch>
          </>
        )}

        {/* Step 4 — Aperçu */}
        {step === 4 && (
          <>
            <div className="mb-4">
              <span className="awan-label text-awan-tx-mute block mb-1">
                {G.freq[frequence]} {SYMBOLS.bullet} {G.objectifs[objectif].label}
              </span>
              <span className="awan-label-sm text-awan-tx-mute" style={{ fontWeight: 700 }}>
                {G.daysCount(generated.length)}
              </span>
            </div>
            {generated.length === 0 ? (
              <Card className="py-12 items-center bg-white/5 border-white/10 border-dashed" variant="flat">
                <span className="awan-label text-awan-tx-mute text-center">{G.emptyCatalog}</span>
              </Card>
            ) : (
              <StaggerList>
                {generated.map((r) => (
                  <StaggerItem key={r.id} className="mb-3">
                    <Card className="p-4 bg-white/5" variant="flat">
                      <div className="flex flex-row items-center justify-between mb-1">
                        <span className="text-sm font-bold text-awan-tx uppercase tracking-tight flex-1">{r.name}</span>
                        {r.cycleLetter && (
                          <div className="bg-awan-gold/10 px-2 py-0.5 border border-awan-gold/20">
                            <span className="awan-label-sm text-awan-gold">{L.sport.cycle} {r.cycleLetter}</span>
                          </div>
                        )}
                      </div>
                      <span className="awan-label-sm text-awan-tx-mute" style={{ fontWeight: 700 }}>
                        {r.exercises.length} {L.sport.exercises}
                      </span>
                    </Card>
                  </StaggerItem>
                ))}
              </StaggerList>
            )}

            <div className="flex flex-col gap-3 mt-6">
              <Touch
                onPress={handleSave}
                disabled={saving || generated.length === 0}
                className={`h-14 bg-awan-gold flex items-center justify-center ${saving || generated.length === 0 ? 'opacity-50' : ''}`}
              >
                <span className="awan-label text-black font-black">
                  {saving ? G.saving : G.save}
                </span>
              </Touch>
              <Touch
                onPress={() => setStep(3)}
                className="h-12 flex items-center justify-center border border-white/10"
              >
                <span className="awan-label text-awan-tx-mute">{G.back}</span>
              </Touch>
            </div>
          </>
        )}
      </ScrollView>
    </PageWrapper>
  );
}
