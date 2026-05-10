import React, { useState, useMemo } from 'react';
import { View, ScrollView, TextInput as RNTextInput, Modal } from 'react-native';

const TextInput = RNTextInput as React.ComponentType<any>;
import { Info, X, CheckCircle, AlertTriangle, ShieldCheck, ChevronLeft, Plus, Search, UtensilsCrossed, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageWrapper } from '../components/Animated';
import { useAppState } from '../context/AppStateContext';
import { useDaily } from '../context/DailyContext';
import { ds, uid } from '../utils/storage';
import { DailyCanvas } from '../components/DailyCanvas';
import { NUTRITION_DB } from '../data/nutrition_db';
import { NutritionService } from '../services/nutritionService';
import { LocalAIService } from '../services/localAIService';
import { useMealStore } from '../hooks/useMealStore';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';

export default function NutritionScreen() {
  const { navigate } = useAppState() as any;
  const { getEntriesByDate, addEntry, moveEntry } = useDaily();

  const [inputText, setInputText] = useState('');
  const [auditText, setAuditText] = useState('');
  const [auditResult, setAuditResult] = useState<any>(null);
  const today = ds(new Date());

  const mealStore = useMealStore(today);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<any>(null);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return (NUTRITION_DB as any[]).filter((f: any) => f.name?.toLowerCase().includes(q) || f.category?.toLowerCase().includes(q));
  }, [searchQuery]);

  const handleAudit = () => {
    if (!auditText.trim()) return;
    const res = LocalAIService.auditHalalIngredients(auditText);
    setAuditResult(res);
  };

  const handleAddFromDb = (item: any) => {
    const now = Date.now();
    const entryId = uid();
    mealStore.add({
      v: 1,
      id: entryId,
      date: today,
      name: item.name,
      kcal: item.calories ?? 0,
      p: item.macros?.p ?? 0,
      c: item.macros?.c ?? 0,
      f: item.macros?.f ?? 0,
      timestamp: now,
      source: 'db',
    });
    addEntry(today, {
      id: entryId,
      timestamp: now,
      module: 'nutrition',
      rawText: `${item.name} ${item.calories}kcal`,
      tokens: [
        { label: 'Aliment', value: item.name, icon: '🍗' },
        { label: 'Énergie', value: `${item.calories}kcal`, icon: '🔥' },
      ],
    });
    setSearchQuery('');
  };

  const handleAddEntry = () => {
    if (!inputText.trim()) return;
    const now = Date.now();
    const entryId = uid();
    const parts = inputText.split(' ');
    const tokens = parts.map((part) => {
      let icon = '🍗';
      let label = 'Aliment';
      if (part.match(/\d+g|\d+kg/i)) { icon = '⚖️'; label = 'Quantité'; }
      if (part.match(/\d+kcal|\d+cal/i)) { icon = '🔥'; label = 'Énergie'; }
      return { label, value: part, icon };
    });

    // parse macros from free text for IStorage
    const parsed = NutritionService.calculateDailyTotal([{ rawText: inputText }]);
    mealStore.add({
      v: 1,
      id: entryId,
      date: today,
      name: parts[0] ?? inputText,
      kcal: parsed.kcal,
      p: parsed.p,
      c: parsed.c,
      f: parsed.f,
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

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        
        <div className="px-6 pt-4 pb-4">
             <Heading level={1} className="mb-0 flex-1" subtitle="Carburant Organique">NUTRITION</Heading>
        </div>
          {/* Biometric Summary Matrix */}
          <Card className="mb-8 p-6 bg-awan-bg-highlight/20 border-awan-gold/10 shadow-[0_0_40px_rgba(212,175,55,0.05)]">
            <div className="flex justify-between items-center mb-8">
              <div className="flex flex-col">
                <span className="awan-label text-awan-gold">INDEX CALORIQUE</span>
                <span className="text-4xl font-bold font-mono tracking-tighter text-awan-tx">{nutritionTotals.kcal}</span>
              </div>
              <div className="w-12 h-12 bg-awan-gold/10 rounded-2xl flex items-center justify-center border border-awan-gold/20">
                <UtensilsCrossed size={20} className="text-awan-gold" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-black/40 p-3 rounded-xl border border-white/5 items-center">
                <span className="text-[8px] font-black text-awan-status-error uppercase tracking-widest mb-1">PROTÉINES</span>
                <span className="text-lg font-bold font-mono text-awan-tx">{nutritionTotals.p}g</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5 items-center">
                <span className="text-[8px] font-black text-awan-status-ok uppercase tracking-widest mb-1">GLUCIDES</span>
                <span className="text-lg font-bold font-mono text-awan-tx">{nutritionTotals.c}g</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5 items-center">
                <span className="text-[8px] font-black text-awan-status-warn uppercase tracking-widest mb-1">LIPIDES</span>
                <span className="text-lg font-bold font-mono text-awan-tx">{nutritionTotals.f}g</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/5">
              <p className="text-[10px] text-awan-tx-mute font-medium italic opacity-70">Séquençage IA actif : flux métabolique en état stable.</p>
            </div>
          </Card>

          {/* Database Unit */}
          <div className="mb-10">
            <Heading level={4} mono subtitle="Vecteurs OFF">ARCHIVES LOCALES</Heading>
            <Card className="p-0 border-white/5 bg-white/5 overflow-hidden mb-6">
              <div className="flex flex-row items-center px-4 py-1">
                <Search size={16} className="text-awan-tx-mute mr-3" />
                <TextInput 
                  className="flex-1 h-12 text-sm font-bold text-awan-tx outline-none bg-transparent"
                  placeholder="SCANNER ALIMENT..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
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
                  {(searchResults as any[]).map((item: any) => (
                    <Card key={item.id} className="flex-row items-center gap-4 py-4 px-5 bg-white/10" variant="flat">
                      <div className="flex-1">
                        <span className="text-sm font-bold text-awan-tx uppercase tracking-tight">{item.name}</span>
                        <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-widest mt-1">
                          {item.category} • {item.calories} KCAL
                        </span>
                      </div>
                      <div className="flex flex-row gap-2">
                        <Touch onPress={() => setSelectedFood(item)} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                          <Info size={16} className="text-awan-tx-mute" />
                        </Touch>
                        <Touch onPress={() => handleAddFromDb(item)} className="w-9 h-9 rounded-xl bg-awan-gold/20 flex items-center justify-center border border-awan-gold/30">
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
            <Heading level={4} mono subtitle="Capture Libre">FLUX NUTRITIF</Heading>
            <div className="flex flex-row gap-3 items-center">
              <TextInput
                className="flex-1 bg-awan-bg-soft border border-white/5 rounded-awan-xl px-5 py-4 text-sm font-bold text-awan-tx"
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
            <Heading level={4} mono subtitle="Vigilance Halal">INSPECTEUR ING RÉDIENTS</Heading>
            <div className="flex flex-col gap-3">
              <TextInput
                className="bg-awan-bg-soft border border-white/5 rounded-awan-xl px-5 py-4 text-sm font-bold text-awan-tx min-h-[100px]"
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
                  <span className="awan-label text-awan-gold">LANCER L'AUDIT IA</span>
                </div>
              </Touch>
            </div>
            
            <AnimatePresence>
              {auditResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 p-5 rounded-awan-xl border ${
                    auditResult.status === 'haram' ? 'bg-awan-status-error/10 border-awan-status-error/30' : 
                    auditResult.status === 'douteux' ? 'bg-awan-status-warn/10 border-awan-status-warn/30' : 
                    'bg-awan-status-ok/10 border-awan-status-ok/30'
                  }`}
                >
                  <div className="flex flex-row items-center gap-3 mb-2">
                    {auditResult.status === 'haram' ? <X size={20} className="text-awan-status-error" /> : 
                     auditResult.status === 'douteux' ? <AlertTriangle size={20} className="text-awan-status-warn" /> : 
                     <ShieldCheck size={20} className="text-awan-status-ok" />}
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      auditResult.status === 'haram' ? 'text-awan-status-error' : 
                      auditResult.status === 'douteux' ? 'text-awan-status-warn' : 
                      'text-awan-status-ok'
                    }`}>
                      RÉSULTAT DE L'INFÉRENCE : {auditResult.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-awan-tx leading-relaxed opacity-90">{auditResult.message}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Journal Unit */}
          <div className="mb-10">
            <Heading level={4} mono subtitle="Séquence Tactique">HISTORIQUE DU JOUR</Heading>
            <div className="bg-awan-bg-soft/40 p-4 rounded-awan-xl border border-white/5 min-h-[150px]">
              <DailyCanvas 
                dateId={today} 
                filterModule="nutrition"
                onReorder={(activeId, overId) => moveEntry(today, activeId, overId)}
              />
            </div>
          </div>
      </ScrollView>

      {/* Food Info Modal */}
      <Modal visible={!!selectedFood} transparent animationType="fade">
        <div className="flex-1 flex justify-center items-center bg-black/90 backdrop-blur-md p-6">
          <Touch className="absolute inset-0" onPress={() => setSelectedFood(null)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-awan-bg-highlight rounded-awan-3xl border border-white/10 shadow-2xl overflow-hidden"
          >
            {selectedFood && (
              <>
                <div className="p-8 border-b border-white/10 bg-white/5 relative">
                  <span className="awan-label mb-2 text-awan-gold">COMPOSANT ORGANIQUE</span>
                  <Heading level={2} className="mb-0">{selectedFood.name}</Heading>
                  <Touch onPress={() => setSelectedFood(null)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <X size={20} className="text-awan-tx-mute" />
                  </Touch>
                </div>

                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <span className="awan-label">MACROS (100G)</span>
                    <div className="flex gap-3">
                      <div className="items-center">
                        <span className="text-[10px] font-black text-awan-status-error mb-1">P</span>
                        <span className="text-xs font-mono font-bold">{selectedFood.macros.p}g</span>
                      </div>
                      <div className="items-center">
                        <span className="text-[10px] font-black text-awan-status-ok mb-1">G</span>
                        <span className="text-xs font-mono font-bold">{selectedFood.macros.c}g</span>
                      </div>
                      <div className="items-center">
                        <span className="text-[10px] font-black text-awan-status-warn mb-1">L</span>
                        <span className="text-xs font-mono font-bold">{selectedFood.macros.f}g</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <span className="awan-label">ACIDES AMINÉS</span>
                    <span className="text-sm font-bold text-awan-tx text-right max-w-[200px]">{selectedFood.aminos}</span>
                  </div>

                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <span className="awan-label">NUTRI-SCORE</span>
                    <div className="w-8 h-8 rounded-lg bg-awan-gold flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                      <span className="text-black font-black text-xs">{selectedFood.nutriscore}</span>
                    </div>
                  </div>

                  <Card className="bg-white/5 border-awan-gold/20 p-5 mt-4">
                    <div className="flex flex-row items-center gap-4 mb-4">
                      <div className="w-8 h-8 rounded-full bg-awan-gold/10 flex items-center justify-center">
                        {selectedFood.halal ? <ShieldCheck size={16} className="text-awan-gold" /> : <AlertTriangle size={16} className="text-awan-status-error" />}
                      </div>
                      <span className="text-sm font-bold uppercase tracking-tight">Vérification Halal : {selectedFood.halal ? 'CONFORME' : 'NON-CONFORME'}</span>
                    </div>
                    <div className="flex flex-row items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <CheckCircle size={16} className="text-awan-tx-mute" />
                      </div>
                      <span className="text-sm font-bold uppercase tracking-tight opacity-70">Additifs : {selectedFood.additives}</span>
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

