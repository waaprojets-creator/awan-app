import React, { useState, useEffect } from 'react';
import { View, ScrollView, TextInput as RNTextInput } from 'react-native';

// react-native-web TextInput doesn't declare className in TS types
const TextInput = RNTextInput as React.ComponentType<any>;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass, BookOpen, RefreshCcw, Clock, CheckCircle2, ChevronRight, Plus, Shield, Zap, TrendingUp, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SpiritualService } from '../utils/spiritualService';
import arabicData from '../assets/data/1.json';
import { PageWrapper } from '../components/Animated';
import { DailyCanvas } from '../components/DailyCanvas';
import { useDaily } from '../context/DailyContext';
import { ds } from '../utils/storage';
import { useAppState } from '../context/AppStateContext';
import { usePrayerStore } from '../hooks/usePrayerStore';
import { useQuranStore } from '../hooks/useQuranStore';
import type { PrayerName } from '../data/schemas/islam/prayerLog';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';

export default function IslamScreen() {
  const insets = useSafeAreaInsets();
  const { navigate } = useAppState() as any;
  const { addEntry } = useDaily();
  
  const [prayerTimes, setPrayerTimes] = useState<any>(SpiritualService.getPrayerTimes());
  const [showQibla, setShowQibla] = useState(false);
  const [qiblaAngle, setQiblaAngle] = useState(0);
  const [currentWord, setCurrentWord] = useState<any>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const todayStr = ds(new Date());
  const prayerStore = usePrayerStore(todayStr);
  const quranStore = useQuranStore();
  const [inputText, setInputText] = useState('');

  const handleAddEntry = () => {
    if (!inputText.trim()) return;
    addEntry(todayStr, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      module: 'islam',
      rawText: inputText,
      tokens: [{ label: 'FOI', value: 'DHIKR', icon: '📿' }]
    });
    setInputText('');
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setPrayerTimes(SpiritualService.getPrayerTimes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    pickNewWord();
  }, []);

  const pickNewWord = () => {
    const randomIndex = Math.floor(Math.random() * arabicData.length);
    setCurrentWord(arabicData[randomIndex]);
    setShowAnswer(false);
  };

  const activateQibla = () => {
    const angle = SpiritualService.getQiblaAngle();
    setQiblaAngle(angle);
    setShowQibla(true);
  };

  const prayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 120 }}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <div className="px-6 pt-4 pb-4">
          <Heading level={1} className="mb-0" subtitle="Alignement Vectoriel">AQIDA</Heading>
        </div>

          <div className="flex flex-row gap-4">
             <Card className="flex-1 p-5 bg-white/5 border-white/5" variant="flat">
                <span className="text-[9px] font-black text-awan-gold tracking-widest uppercase mb-1 block">STATUT</span>
                <span className="text-xl font-black text-awan-tx uppercase tracking-tight">SYNCHRONISÉ</span>
             </Card>
             <Card className="flex-1 p-5 bg-white/5 border-white/5" variant="flat">
                <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest mb-1 block">VECTEUR</span>
                <span className="text-xl font-black text-awan-tx uppercase tracking-tight">MEKKA</span>
             </Card>
          </div>

        <div className="p-6">
          <div className="mb-10">
            <div className="flex flex-row justify-between items-end mb-6 px-1">
              <Heading level={4} mono subtitle="Matrice du Temps" className="mb-0">CHRONO PRIÈRES</Heading>
              <Zap size={14} className="text-awan-gold mb-1" />
            </div>
            
            <div className="bg-awan-surface/20 rounded-awan-2xl border border-white/10 overflow-hidden shadow-2xl">
              {prayers.map((key) => {
                const time = prayerTimes[key];
                const isNext = prayerTimes.next === key;
                const isSunrise = key === 'sunrise';
                const done = !isSunrise && prayerStore.isDone(key as PrayerName);

                return (
                  <Touch
                    key={key}
                    onPress={() => !isSunrise && prayerStore.toggle(key as PrayerName)}
                    className={`flex flex-row justify-between items-center px-6 py-5 border-b border-white/5 transition-all ${isNext ? 'bg-awan-gold/10' : done ? 'bg-awan-status-ok/5' : ''}`}
                  >
                    <div className="flex flex-row items-center gap-4">
                      <div className={`w-1 h-8 rounded-full ${done ? 'bg-awan-status-ok shadow-[0_0_8px_rgba(74,222,128,0.4)]' : isNext ? 'bg-awan-gold shadow-[0_0_10px_#D4AF37]' : 'bg-white/5'}`} />
                      <span className={`text-xs font-black tracking-[0.2em] uppercase ${done ? 'text-awan-status-ok' : isNext ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>
                        {SpiritualService.translatePrayer(key)}
                      </span>
                    </div>
                    <div className="flex flex-row items-center gap-6">
                      <span className={`text-xl font-mono font-black tabular-nums ${done ? 'text-awan-status-ok' : isNext ? 'text-awan-gold' : 'text-awan-tx'}`}>
                        {String(time.getHours()).padStart(2, '0')}:{String(time.getMinutes()).padStart(2, '0')}
                      </span>
                      {isSunrise ? (
                        <div className="w-4" />
                      ) : done ? (
                        <CheckCircle2 size={16} className="text-awan-status-ok" />
                      ) : isNext ? (
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                          <Clock size={16} className="text-awan-gold" />
                        </motion.div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/20" />
                      )}
                    </div>
                  </Touch>
                );
              })}
            </div>
          </div>

          <div className="mb-10">
            <Touch onPress={activateQibla}>
              <Card className="flex flex-row items-center gap-5 p-6 bg-awan-gold/5 border-awan-gold/30" variant="flat">
                <div className="w-14 h-14 bg-awan-gold items-center justify-center rounded-2xl shadow-lg shadow-awan-gold/20">
                  <Compass size={28} className="text-black" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-black text-awan-gold tracking-widest uppercase mb-1 block">CALIBRATION SYSTÈME</span>
                  <Heading level={3} className="text-awan-tx mb-0 uppercase tracking-tight">Instrument de Qibla</Heading>
                </div>
                <ChevronRight size={20} className="text-awan-gold" />
              </Card>
            </Touch>
            
            <AnimatePresence>
              {showQibla && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 bg-black/40 rounded-awan-2xl border border-white/5 overflow-hidden flex flex-col items-center p-10 shadow-inner"
                >
                  <div className="w-48 h-48 rounded-full border border-white/5 flex items-center justify-center relative bg-white/2">
                    {/* Compass Rings */}
                    <div className="absolute inset-2 rounded-full border border-white/5 border-dashed opacity-20" />
                    <div className="absolute inset-8 rounded-full border border-white/10 opacity-10" />
                    
                    <motion.div 
                      animate={{ rotate: -qiblaAngle }}
                      className="absolute w-1 h-[140px] flex flex-col items-center z-10"
                      transition={{ type: 'spring', stiffness: 60, damping: 15 }}
                    >
                       <div className="w-2 h-[70px] bg-awan-gold rounded-t-full shadow-[0_0_20px_#D4AF37]" />
                       <div className="w-2 h-[70px] bg-white/20 rounded-b-full" />
                    </motion.div>

                    <div className="w-16 h-16 rounded-full bg-awan-bg border-2 border-awan-gold flex items-center justify-center z-20 shadow-2xl">
                      <span className="text-sm font-black font-mono text-awan-gold">{Math.round(qiblaAngle)}°</span>
                    </div>
                  </div>
                  <div className="mt-8 flex flex-row items-center gap-3">
                     <Shield size={12} className="text-awan-gold opacity-50" />
                     <span className="text-[10px] font-black text-awan-tx-mute uppercase tracking-[0.3em]">Alignement Vectoriel Actif</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mb-10">
            <Heading level={4} mono subtitle="Flux de Dhikr" className="mb-6">CAPTURE SPIRITUELLE</Heading>
            <Card className="flex-row items-center gap-4 bg-white/5 border-white/10 p-5" variant="flat">
               <div className="bg-black/40 border border-white/5 rounded-2xl flex-1 px-4 py-2 flex flex-row items-center">
                  <div className="w-2 h-2 rounded-full bg-awan-gold mr-3" />
                  <TextInput
                    className="flex-1 h-10 text-sm font-bold text-awan-tx outline-none"
                    placeholder="SYDNC FOI: ACTE DE DHIKR..."
                    placeholderTextColor="rgba(255,255,255,0.15)"
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleAddEntry}
                  />
               </div>
               <Touch onPress={handleAddEntry} className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center border border-white/10">
                  <Plus size={20} className="text-awan-gold" />
               </Touch>
            </Card>
          </div>

          <div className="mb-14">
            <Heading level={4} mono subtitle="Rémanence" className="mb-6">SEQUENCE D'ACTES</Heading>
            <div className="bg-awan-surface/10 p-2 rounded-awan-2xl border border-white/5 min-h-[160px] shadow-inner">
              <DailyCanvas 
                dateId={todayStr} 
                filterModule="islam"
              />
            </div>
          </div>

          <div className="mb-10">
            <div className="flex flex-row justify-between items-end mb-6 px-1">
              <Heading level={4} mono subtitle="Récitation" className="mb-0">PROGRESSION CORAN</Heading>
              <TrendingUp size={14} className="text-awan-gold mb-1" />
            </div>

            <Card className="bg-awan-surface/20 border border-white/10 p-6 shadow-xl" variant="flat">
              {quranStore.progress ? (
                <div>
                  <div className="flex flex-row justify-between items-center mb-6">
                    <div>
                      <span className="text-[9px] font-black text-awan-gold tracking-widest uppercase block mb-1">SOURATE ACTUELLE</span>
                      <span className="text-3xl font-black text-awan-tx tabular-nums">{quranStore.progress.currentSurah}</span>
                      <span className="text-sm font-black text-awan-tx-mute"> / 114</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black text-awan-tx-mute tracking-widest uppercase block mb-1">VERSET</span>
                      <span className="text-3xl font-black text-awan-tx tabular-nums">{quranStore.progress.currentAyah}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black text-awan-tx-mute tracking-widest uppercase block mb-1">TOTAL LU</span>
                      <span className="text-3xl font-black text-awan-tx tabular-nums">{quranStore.progress.totalAyahsRead}</span>
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="flex flex-row justify-between items-center mb-2">
                      <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest">Objectif Journalier</span>
                      <span className="text-xs font-black text-awan-gold font-mono">{quranStore.progress.dailyAyahTarget} AYAHS</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-awan-gold rounded-full transition-all"
                        style={{ width: `${Math.min(100, (quranStore.progress.totalAyahsRead % quranStore.progress.dailyAyahTarget) / quranStore.progress.dailyAyahTarget * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-row gap-3">
                    <Touch
                      onPress={() => quranStore.advance(1)}
                      className="flex-1 h-12 bg-awan-gold/10 border border-awan-gold/30 rounded-2xl flex items-center justify-center gap-2"
                    >
                      <Plus size={16} className="text-awan-gold" />
                      <span className="text-xs font-black text-awan-gold uppercase tracking-widest">+1 Ayah</span>
                    </Touch>
                    <Touch
                      onPress={() => quranStore.advance(5)}
                      className="flex-1 h-12 bg-awan-gold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-awan-gold/20"
                    >
                      <span className="text-xs font-black text-black uppercase tracking-widest">+5 Ayahs</span>
                    </Touch>
                    <Touch
                      onPress={() => quranStore.advance(-1)}
                      className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center"
                    >
                      <Minus size={16} className="text-awan-tx-mute" />
                    </Touch>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center gap-4">
                  <span className="text-[10px] font-black text-awan-tx-mute uppercase tracking-widest opacity-50">Aucune progression enregistrée</span>
                  <Touch
                    onPress={() => quranStore.advance(0)}
                    className="px-6 h-12 bg-awan-gold rounded-2xl flex items-center justify-center shadow-lg shadow-awan-gold/20"
                  >
                    <span className="text-xs font-black text-black uppercase tracking-widest">Initialiser</span>
                  </Touch>
                </div>
              )}
            </Card>
          </div>

          <div className="mb-20">
            <div className="flex flex-row justify-between items-end mb-6 px-1">
              <Heading level={4} mono subtitle="Lexique" className="mb-0">VOCABULAIRE TECHNIQUE</Heading>
              <BookOpen size={14} className="text-awan-tx-mute mb-1" />
            </div>

            <Card className="bg-awan-surface/30 border border-white/10 p-8 shadow-2xl relative overflow-hidden group" variant="flat">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-all">
                <BookOpen size={120} className="text-awan-gold" />
              </div>

              {currentWord ? (
                <div className="items-center py-4">
                  <div className="w-full flex flex-row justify-between items-center mb-12">
                    <div className="bg-awan-gold/10 border border-awan-gold/30 px-3 py-1 rounded-md">
                      <span className="text-[9px] font-black text-awan-gold uppercase tracking-widest">{currentWord.category}</span>
                    </div>
                    <Touch onPress={pickNewWord} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                      <RefreshCcw size={16} className="text-awan-tx-mute" />
                    </Touch>
                  </div>
                  
                  <span className="text-[10px] font-black text-awan-gold tracking-[0.5em] uppercase mb-4 block opacity-40">Définition Symantique</span>
                  <span className="text-3xl font-black text-awan-tx text-center mb-12 tracking-tight uppercase leading-tight">{currentWord.fr}</span>
                  
                  <div className="w-10 h-0.5 bg-awan-gold/20 mb-12" />

                  <AnimatePresence mode="wait">
                    {!showAnswer ? (
                      <Touch 
                        onPress={() => setShowAnswer(true)}
                        className="w-full h-16 bg-awan-gold rounded-2xl flex items-center justify-center shadow-lg shadow-awan-gold/20"
                      >
                        <span className="text-xs font-black text-black tracking-[0.2em] uppercase">DÉCRYPTAGE DU SYMBOLE</span>
                      </Touch>
                    ) : (
                      <motion.div 
                        key="answer"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center w-full"
                      >
                        <span className="text-7xl font-sans text-awan-gold font-bold mb-6 tracking-tighter text-center">{currentWord.ar}</span>
                        <div className="bg-black/40 px-4 py-2 rounded-lg border border-white/5">
                           <span className="text-[10px] font-black font-mono text-awan-tx-mute tracking-[0.2em]">[{currentWord.phonetic.toUpperCase()}]</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="py-20 items-center opacity-30">
                  <span className="text-xs font-black text-awan-status-error uppercase tracking-widest">Index de Données Corrompu</span>
                </div>
              )}
            </Card>
          </div>
        </div>
      </ScrollView>
    </PageWrapper>
  );
}

