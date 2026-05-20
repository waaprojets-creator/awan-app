import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { PageWrapper, StaggerList, StaggerItem } from '@/components/Animated';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Heading } from '@/components/ui/Heading';
import { Touch } from '@/components/ui/Touch';
import type { RoutineLatest } from '@/data/schemas/sport/routine';
import type { GeneratorConfig, ObjectifType } from '@/modules/coach/routine-generator/types';
import { generateRoutines } from '@/modules/coach/routine-generator/generator';

const OBJECTIFS: { id: ObjectifType; label: string; desc: string }[] = [
  { id: 'hypertrophie', label: 'HYPERTROPHIE', desc: 'Volume maximal · MAV[1] · 8-12 reps' },
  { id: 'force', label: 'FORCE', desc: 'Intensité · Charge lourde · 3-6 reps' },
  { id: 'endurance', label: 'ENDURANCE', desc: 'Résistance musculaire · 15+ reps' },
  { id: 'recomposition', label: 'RECOMPO', desc: 'Équilibre volume/intensité · 10-15 reps' },
];

const FREQUENCES: Array<2 | 3 | 4 | 5 | 6> = [2, 3, 4, 5, 6];

const FREQ_LABELS: Record<number, string> = {
  2: '2J — FULL BODY',
  3: '3J — PPL',
  4: '4J — UPPER/LOWER',
  5: '5J — PPL+',
  6: '6J — PPL×2',
};

type EquipType = GeneratorConfig['equipement'][number];
const ALL_EQUIP: EquipType[] = ['barbell', 'dumbbell', 'cable', 'machine', 'body only'];
const EQUIP_LABELS: Record<string, string> = {
  barbell: 'BARRE',
  dumbbell: 'HALTÈRES',
  cable: 'CÂBLES',
  machine: 'MACHINES',
  'body only': 'POIDS DU CORPS',
};

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
          <ScreenHeader
            tag={`GÉNÉRATEUR · ÉTAPE ${step}/4`}
            title={step === 1 ? 'OBJECTIF' : step === 2 ? 'FRÉQUENCE' : step === 3 ? 'ÉQUIPEMENT' : 'PROPOSITION'}
          />
        </div>

        {/* Step indicator */}
        <div className="flex flex-row gap-1.5 mb-6">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className="h-0.5 flex-1"
              style={{ backgroundColor: s <= step ? 'var(--color-awan-gold)' : 'rgba(255,255,255,0.1)' }}
            />
          ))}
        </div>
      </div>

      <ScrollView contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 24 }} style={{ flex: 1 }}>
        {/* Step 1 — Objectif */}
        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {OBJECTIFS.map(o => (
                <Touch
                  key={o.id}
                  onPress={() => setObjectif(o.id)}
                  className="p-5"
                  style={{
                    border: objectif === o.id ? '1.5px solid var(--color-awan-gold)' : '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: objectif === o.id ? 'rgba(var(--color-awan-gold-rgb, 201,168,76), 0.08)' : 'rgba(255,255,255,0.03)',
                  }}
                >
                  <span
                    className="text-[11px] font-black tracking-widest block mb-1"
                    style={{ color: objectif === o.id ? 'var(--color-awan-gold)' : 'var(--color-awan-tx)' }}
                  >
                    {o.label}
                  </span>
                  <span className="text-[9px] font-bold text-awan-tx-mute leading-relaxed">{o.desc}</span>
                </Touch>
              ))}
            </div>
            <Touch
              onPress={() => setStep(2)}
              className="h-14 bg-awan-gold flex items-center justify-center"
            >
              <span className="awan-label text-black font-black">SUIVANT →</span>
            </Touch>
          </>
        )}

        {/* Step 2 — Fréquence */}
        {step === 2 && (
          <>
            <div className="flex flex-col gap-3 mb-8">
              {FREQUENCES.map(f => (
                <Touch
                  key={f}
                  onPress={() => setFrequence(f)}
                  className="h-16 px-5 flex flex-row items-center justify-between"
                  style={{
                    border: frequence === f ? '1.5px solid var(--color-awan-gold)' : '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: frequence === f ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <span
                    className="text-sm font-black tracking-widest"
                    style={{ color: frequence === f ? 'var(--color-awan-gold)' : 'var(--color-awan-tx)' }}
                  >
                    {FREQ_LABELS[f]}
                  </span>
                  {frequence === f && (
                    <CheckCircle2 size={18} className="text-awan-gold" strokeWidth={2.5} />
                  )}
                </Touch>
              ))}
            </div>
            <Touch
              onPress={() => setStep(3)}
              className="h-14 bg-awan-gold flex items-center justify-center"
            >
              <span className="awan-label text-black font-black">SUIVANT →</span>
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
                    className="h-14 px-5 flex flex-row items-center justify-between"
                    style={{
                      border: active ? '1.5px solid var(--color-awan-gold)' : '1px solid rgba(255,255,255,0.08)',
                      backgroundColor: active ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <span
                      className="text-sm font-black tracking-widest"
                      style={{ color: active ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)' }}
                    >
                      {EQUIP_LABELS[eq]}
                    </span>
                    <span
                      className="text-base font-black"
                      style={{ color: active ? 'var(--color-awan-gold)' : 'rgba(255,255,255,0.2)' }}
                    >
                      {active ? '◆' : '◇'}
                    </span>
                  </Touch>
                );
              })}
            </div>
            {equipement.length === 0 && (
              <p className="text-[10px] text-awan-status-error font-bold uppercase tracking-widest mb-4">
                Sélectionne au moins un équipement
              </p>
            )}
            <Touch
              onPress={handleGenerate}
              disabled={equipement.length === 0 || loading}
              className="h-14 bg-awan-gold flex items-center justify-center"
              style={{ opacity: equipement.length === 0 || loading ? 0.5 : 1 }}
            >
              <span className="awan-label text-black font-black">
                {loading ? 'GÉNÉRATION…' : 'GÉNÉRER LA ROUTINE'}
              </span>
            </Touch>
          </>
        )}

        {/* Step 4 — Aperçu */}
        {step === 4 && (
          <>
            <div className="mb-4">
              <span className="awan-label text-awan-tx-mute block mb-1">
                {FREQ_LABELS[frequence]} · {OBJECTIFS.find(o => o.id === objectif)?.label}
              </span>
              <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-widest">
                {generated.length} JOURS D'ENTRAÎNEMENT
              </span>
            </div>
            {generated.length === 0 ? (
              <Card className="py-12 items-center bg-white/5 border-white/10 border-dashed">
                <span className="awan-label text-awan-tx-mute text-center">
                  Catalogue non chargé — accède à la bibliothèque d'abord
                </span>
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
                            <span className="text-[9px] font-black text-awan-gold tracking-widest">CYCLE {r.cycleLetter}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-widest">
                        {r.exercises.length} EXERCICES
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
                className="h-14 bg-awan-gold flex items-center justify-center"
                style={{ opacity: saving || generated.length === 0 ? 0.5 : 1 }}
              >
                <span className="awan-label text-black font-black">
                  {saving ? 'ENREGISTREMENT…' : 'ENREGISTRER COMME PROPOSITION'}
                </span>
              </Touch>
              <Touch
                onPress={() => setStep(3)}
                className="h-12 flex items-center justify-center border border-white/10"
              >
                <span className="awan-label text-awan-tx-mute">← MODIFIER</span>
              </Touch>
            </div>
          </>
        )}
      </ScrollView>
    </PageWrapper>
  );
}
