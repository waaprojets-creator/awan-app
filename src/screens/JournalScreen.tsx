import React, { useState } from 'react';
import { View, TextInput as RNTextInput, ScrollView } from 'react-native';

const TextInput = RNTextInput as React.ComponentType<any>;
import { PageWrapper, StaggerItem, StaggerList } from '../components/Animated';
import { useDaily } from '../context/DailyContext';
import { DailyCanvas } from '../components/DailyCanvas';
import { useAppState } from '../context/AppStateContext';
import { ds, uid } from '../utils/storage';
import { ModuleType } from '../types/daily';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';
import { ChevronLeft, Plus, History, Calendar, Layout, Search, Filter, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MODULE_ICONS: Record<string, string> = {
  nutrition: '🍲',
  sport: '🏋️',
  trajet: '🗺️',
  islam: '🕌',
  mesure: '📏',
  task: '🚩',
  sante: '🏥',
  mental: '🧠',
  mensuration: '⚖️'
};

export default function JournalScreen() {
  const { db, navigate } = useAppState() as any;
  const { getEntriesByDate, addEntry, moveEntry } = useDaily();
  const today = ds(new Date());
  
  const [selectedDate, setSelectedDate] = useState(today);
  const [inputText, setInputText] = useState('');
  const [activeModule, setActiveModule] = useState<ModuleType>('nutrition');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const entries = getEntriesByDate(selectedDate);

  const handleAddEntry = () => {
    if (!inputText.trim()) return;
    
    const entryId = uid();
    const words = inputText.trim().split(' ');
    
    // Simple heuristic for tokens
    const tokens = words.map(w => ({
      label: 'DAT',
      value: w.toUpperCase(),
      icon: MODULE_ICONS[activeModule] || '📄'
    }));

    addEntry(selectedDate, {
      id: entryId,
      timestamp: Date.now(),
      module: activeModule,
      rawText: inputText,
      tokens: [
        { label: 'SYS', value: activeModule.toUpperCase(), icon: '📡' },
        ...tokens.slice(0, 3) 
      ]
    });
    setInputText('');
  };

  const MODULES: ModuleType[] = ['nutrition', 'sport', 'trajet', 'islam', 'mesure', 'task', 'sante', 'mental', 'mensuration'];

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      {/* Tactical Header */}
      <div className="px-6 pt-4 pb-4 border-b border-white/5 bg-white/5">
        <div className="flex flex-row items-center gap-4 mb-4">
          <Touch onPress={() => navigate('Dashboard')} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
            <ChevronLeft size={20} className="text-awan-tx-mute" />
          </Touch>
          <Heading level={1} className="mb-0 flex-1" subtitle="Archive Chronologique">JOURNAL</Heading>
          <div className="flex flex-row gap-2">
            <Touch className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
              <History size={18} className="text-awan-tx-mute" />
            </Touch>
            <Touch onPress={() => setIsFilterOpen(!isFilterOpen)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isFilterOpen ? 'bg-awan-gold' : 'bg-white/5'}`}>
              <Filter size={18} className={isFilterOpen ? 'text-black' : 'text-awan-tx-mute'} />
            </Touch>
          </div>
        </div>

        <div className="flex flex-row items-center justify-between bg-black/30 p-4 rounded-2xl border border-white/5 shadow-inner">
           <Touch className="w-8 h-8 items-center justify-center">
              <ChevronLeft size={16} className="text-white/20" />
           </Touch>
           <div className="items-center">
              <span className="text-2xl font-mono font-black text-awan-tx tracking-tight tabular-nums">{selectedDate}</span>
              <span className="text-[9px] font-black text-awan-gold tracking-[0.4em] uppercase mt-1">SÉQUENCE OPÉRATIVE</span>
           </div>
           <Touch className="w-8 h-8 items-center justify-center">
              <Plus size={16} className="text-white/20" />
           </Touch>
        </div>
      </div>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Module Injector */}
        <div className="p-6">
          <div className="mb-10">
            <div className="flex flex-row justify-between items-end mb-4 px-1">
               <Heading level={4} mono subtitle="Injection de Données" className="mb-0">INPUT TERMINAL</Heading>
               <span className="text-[9px] font-mono text-awan-gold opacity-50 uppercase">Ready for Sync</span>
            </div>
            
            <div className="bg-awan-bg-highlight/30 p-6 rounded-awan-3xl border border-white/10 shadow-2xl">
              <div className="flex flex-row flex-wrap gap-2 mb-6">
                {MODULES.map((mod) => (
                  <Touch 
                    key={mod} 
                    className={`px-4 py-2 rounded-xl border transition-all ${activeModule === mod ? 'bg-awan-gold border-awan-gold' : 'bg-white/5 border-white/5'}`}
                    onPress={() => setActiveModule(mod)}
                  >
                    <div className="flex flex-row items-center gap-2">
                       <span className="text-xs">{MODULE_ICONS[mod]}</span>
                       <span className={`text-[10px] font-black uppercase tracking-widest ${activeModule === mod ? 'text-black' : 'text-awan-tx-mute'}`}>{mod}</span>
                    </div>
                  </Touch>
                ))}
              </div>

              <div className="flex flex-row gap-3 items-center">
                <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-5 py-2 flex flex-row items-center">
                  <Terminal size={14} className="text-awan-gold mr-3 opacity-50" />
                  <TextInput
                    className="flex-1 h-12 text-sm text-awan-tx font-bold outline-none"
                    placeholder="SYSTÈME LOG: CAPTURE..."
                    placeholderTextColor="rgba(255,255,255,0.15)"
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleAddEntry}
                  />
                </div>
                <Touch 
                  onPress={handleAddEntry}
                  className="w-14 h-14 bg-awan-gold rounded-2xl flex items-center justify-center shadow-lg shadow-awan-gold/20"
                >
                  <Plus size={24} color="black" strokeWidth={3} />
                </Touch>
              </div>
            </div>
          </div>

          <div className="mb-10">
            <div className="flex flex-row justify-between items-end mb-6 px-1">
              <Heading level={4} mono subtitle="Récupération Chrono" className="mb-0">CANVAS JOURNALIER</Heading>
              <div className="flex flex-row gap-1">
                 <div className="w-1 h-1 rounded-full bg-awan-gold shadow-[0_0_5px_#D4AF37]" />
                 <div className="w-1 h-1 rounded-full bg-awan-gold opacity-50" />
                 <div className="w-1 h-1 rounded-full bg-awan-gold opacity-20" />
              </div>
            </div>
            
            <div className="bg-white/5 rounded-awan-3xl border border-white/5 min-h-[400px] p-2 relative">
              {/* Grid background effect */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden rounded-awan-3xl">
                 <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              </div>

              <DailyCanvas 
                dateId={selectedDate} 
                onReorder={(activeId: string, overId: string) => moveEntry(selectedDate, activeId, overId)}
              />

              {entries.length === 0 && (
                <div className="flex-1 items-center justify-center py-20 opacity-20">
                   <Layout size={48} className="text-awan-tx-mute mb-4" />
                   <span className="text-[10px] font-black text-awan-tx-mute uppercase tracking-[0.5em] text-center">Aucune séquence archivée</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollView>
    </PageWrapper>
  );
}
