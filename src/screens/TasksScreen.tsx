import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Modal, TextInput, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion } from 'motion/react';
import { CATS } from '../constants/theme';
import { uid, ds } from '../utils/storage';
import { useAppState } from '../context/AppStateContext';
import { useDaily } from '../context/DailyContext';
import { NOTIF_INTERVALS } from '../utils/notifications';
import { StopCircle, Trash2, ChevronLeft, Plus, Filter, CheckCircle, Circle, Zap, Target, Layers, Clock } from 'lucide-react';
import { LocalDbService } from '../services/localDbService';
import { PageWrapper, StaggerList, StaggerItem } from '../components/Animated';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { db, updateDb, navigate } = useAppState() as any;
  const { addEntry } = useDaily();

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('perso');
  const [time, setTime] = useState('09:00');
  const [reminder, setReminder] = useState(0);
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const todayStr = ds(new Date());
  const [inputText, setInputText] = useState('');

  const handleAddEntry = () => {
    if (!inputText.trim()) return;
    addEntry(todayStr, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      module: 'task',
      rawText: inputText,
      tokens: [{ label: 'MISSION', value: 'RAPIDE', icon: '⚡' }]
    });
    setInputText('');
  };

  useEffect(() => {
    let interval: any;
    if (activeTaskId && startTime) {
      interval = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTaskId, startTime]);
  
  if (!db) return null;
  const tasks = db.tasks || [];

  const categories = useMemo(() => {
    const base: any = { ...CATS };
    if (db.categories) {
      db.categories.forEach((c: any) => { base[c.key] = { l: c.label, c: c.color }; });
    }
    return base;
  }, [db.categories]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t: any) => {
      const matchCat = filterCat === 'all' || t.category === filterCat;
      const matchStatus = filterStatus === 'all' || 
        (filterStatus === 'pending' && !t.done) || 
        (filterStatus === 'done' && t.done);
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchStatus && matchSearch;
    });
  }, [tasks, filterCat, filterStatus, search]);

  async function addTask() {
    if (!title.trim()) return;
    const newTask = { 
      id: uid(), 
      title: title.trim(), 
      done: false, 
      date: ds(new Date()), 
      category: cat,
      time,
      reminder
    };
    await updateDb({ ...db, tasks: [newTask, ...tasks] });
    setTitle(''); setShowModal(false);
  }

  async function toggleDone(id: string) {
    const newTasks = tasks.map((t: any) => t.id === id ? { ...t, done: !t.done } : t);
    await updateDb({ ...db, tasks: newTasks });
  }

  async function deleteTask(id: string) {
    const newTasks = tasks.filter((t: any) => t.id !== id);
    await updateDb({ ...db, tasks: newTasks });
  }

  const toggleTimer = (taskId: string) => {
    if (activeTaskId === taskId) {
      const duration = Date.now() - (startTime || 0);
      LocalDbService.logTime(taskId, duration);
      setActiveTaskId(null);
      setStartTime(null);
      setElapsed(0);
    } else {
      if (activeTaskId && startTime) {
        LocalDbService.logTime(activeTaskId, Date.now() - startTime);
      }
      setActiveTaskId(taskId);
      setStartTime(Date.now());
      setElapsed(0);
    }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return `${h > 0 ? h + ':' : ''}${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 150 }}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <div className="px-6 pt-4 pb-4">
          <Heading level={1} className="mb-0" subtitle="Gestion des Objectifs">VECTEURS</Heading>
        </div>

          <div className="flex flex-row gap-4">
            <Card className="flex-1 p-5 bg-white/5 border-white/5" variant="flat">
              <span className="text-[9px] font-black text-awan-gold tracking-widest uppercase mb-1 block text-center">EN ATTENTE</span>
              <span className="text-2xl font-black text-awan-tx tabular-nums text-center">{tasks.filter((t: any) => !t.done).length}</span>
            </Card>
            <Card className="flex-1 p-5 bg-white/5 border-white/5" variant="flat">
              <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest mb-1 block text-center">REMPLIS</span>
              <span className="text-2xl font-black text-white/20 tabular-nums text-center">{tasks.filter((t: any) => t.done).length}</span>
            </Card>
          </div>

        <div className="p-6">
          <Card className="p-0 border-white/5 bg-black/20 rounded-2xl overflow-hidden mb-10 shadow-inner">
            <div className="flex flex-row items-center px-5 h-14">
              <Filter size={16} className="text-awan-gold mr-4" />
              <TextInput 
                className="flex-1 text-xs font-black text-awan-tx outline-none bg-transparent uppercase tracking-widest"
                placeholder="RECHERCHE VECTORIELLE..."
                placeholderTextColor="rgba(255,255,255,0.1)"
                value={search}
                onChangeText={setSearch}
              />
            </div>
          </Card>

          <div className="mb-10">
            <Heading level={4} mono subtitle="Filtrage de Session" className="mb-6">CRITÈRES DE VUE</Heading>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
              {['all', 'pending', 'done'].map(status => (
                <Touch 
                  key={status}
                  onPress={() => setFilterStatus(status)}
                  className={`px-5 py-3 rounded-xl border transition-all ${filterStatus === status ? 'bg-awan-gold/10 border-awan-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]' : 'bg-white/3 border-white/5'}`}
                >
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${filterStatus === status ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>
                    {status === 'all' ? 'Indifférent' : (status === 'pending' ? 'Opérationnel' : 'Archivé')}
                  </span>
                </Touch>
              ))}
              <div className="w-[1px] h-6 bg-white/10 mx-3 self-center" />
              {Object.entries(categories).map(([k, c]: any) => (
                <Touch 
                  key={k} 
                  onPress={() => setFilterCat(filterCat === k ? 'all' : k)}
                  className={`px-5 py-3 rounded-xl border transition-all ${filterCat === k ? 'bg-white/10 border-white/20' : 'bg-white/3 border-transparent'}`}
                >
                  <div className="flex flex-row items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.c }} />
                     <span className="text-[10px] font-black uppercase tracking-widest text-[#6C665E]" style={{ color: filterCat === k ? '#fff' : '#6C665E' }}>{c.l}</span>
                  </div>
                </Touch>
              ))}
            </ScrollView>
          </div>

          <div className="mb-12">
            <Heading level={4} mono subtitle="Flux Instantané" className="mb-6">CAPTURE RAPIDE</Heading>
            <div className="flex flex-row gap-3 items-center">
              <div className="flex-1 bg-black/20 border border-white/10 rounded-2xl px-5 py-4 shadow-inner">
                <TextInput
                  className="text-sm font-bold text-awan-tx outline-none uppercase"
                  placeholder="NOUVELLE UNITÉ D'ACTION..."
                  placeholderTextColor="rgba(255,255,255,0.1)"
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

          <StaggerList>
            <Heading level={4} mono subtitle="Inventaire Actif" className="mb-6">FILE DE TRAITEMENT</Heading>
            {filteredTasks.map((item: any) => (
              <StaggerItem key={item.id} className="mb-4">
                <Card 
                  className={`flex-row items-center gap-4 py-6 px-6 transition-all border-white/5 ${item.done ? 'opacity-30 bg-black/10' : 'bg-white/3 hover:bg-white/5'}`}
                  variant="flat"
                  onPress={() => toggleDone(item.id)}
                >
                  <Touch className="p-1">
                    {item.done ? (
                      <CheckCircle size={24} className="text-awan-gold" />
                    ) : (
                      <motion.div whileTap={{ scale: 0.9 }}>
                        <Circle size={24} className="text-white/10" />
                      </motion.div>
                    )}
                  </Touch>
                  
                  <div className="flex-1">
                    <span className={`text-base font-bold block uppercase tracking-tight ${item.done ? 'line-through text-awan-tx-mute' : 'text-awan-tx'}`}>{item.title}</span>
                    <div className="flex flex-row items-center gap-3 mt-2">
                      <div className="flex flex-row items-center gap-1.5">
                         <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(255,255,255,0.3)]" style={{ backgroundColor: categories[item.category]?.c || '#6C665E' }} />
                         <span className="text-[9px] font-black uppercase tracking-widest text-awan-tx-mute">
                           {categories[item.category]?.l || item.category}
                         </span>
                      </div>
                      {item.time && (
                         <div className="flex flex-row items-center gap-1.5">
                            <Clock size={10} className="text-awan-gold" />
                            <span className="text-[9px] font-black font-mono text-awan-gold opacity-60 uppercase">{item.time}</span>
                         </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row items-center gap-2">
                    <Touch 
                      className={`flex flex-row items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${activeTaskId === item.id ? 'bg-awan-status-error/10 border-awan-status-error/40 shadow-[0_0_10px_rgba(255,75,75,0.2)]' : 'bg-white/5 border-white/5'}`}
                      onPress={(e) => { e.stopPropagation(); toggleTimer(item.id); }}
                    >
                      {activeTaskId === item.id && (
                        <span className="text-xs font-black font-mono text-awan-status-error tabular-nums">{formatTime(elapsed)}</span>
                      )}
                      {activeTaskId === item.id ? (
                        <StopCircle size={18} className="text-awan-status-error" />
                      ) : (
                        <Zap size={16} className="text-awan-tx-mute" />
                      )}
                    </Touch>

                    <Touch onPress={(e) => { e.stopPropagation(); deleteTask(item.id); }} className="w-10 h-10 items-center justify-center rounded-xl hover:bg-awan-status-error/10">
                      <Trash2 size={16} className="text-white/10 hover:text-awan-status-error transition-colors" />
                    </Touch>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>

          {filteredTasks.length === 0 && (
            <div className="py-24 items-center group">
              <div className="w-24 h-24 bg-white/3 rounded-full flex items-center justify-center mb-8 border border-white/5 group-hover:scale-110 transition-transform">
                <Target size={48} className="text-white/5" />
              </div>
              <Heading level={4} className="mb-0 text-center uppercase tracking-widest text-white/10" subtitle="">Système en Veille • Aucun Vecteur Détecté</Heading>
            </div>
          )}
        </div>
      </ScrollView>

      <div className="fixed bottom-32 right-8 z-50">
        <Touch 
          className="w-16 h-16 bg-awan-gold rounded-[24px] flex items-center justify-center shadow-2xl shadow-awan-gold/30 border border-white/20"
          onPress={() => setShowModal(true)}
        >
          <motion.div animate={{ rotate: [0, 90, 0] }} transition={{ repeat: Infinity, duration: 10 }}>
            <Plus size={32} color="black" strokeWidth={3} />
          </motion.div>
        </Touch>
      </div>

      <Modal visible={showModal} transparent animationType="fade">
        <div className="flex-1 flex justify-end bg-black/90 backdrop-blur-md">
          <div className="bg-awan-bg-highlight p-10 rounded-t-[48px] border-t border-white/10 w-full max-w-lg mx-auto shadow-2xl">
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-10" />
            <Heading level={2} className="text-center mb-12" subtitle="Configuration d'Objectif">DÉPLOIEMENT</Heading>
            
            <div className="space-y-10">
              <div>
                <span className="text-[10px] font-black text-awan-gold tracking-[0.4em] uppercase mb-4 block">Désignation de Mission</span>
                <TextInput 
                  className="bg-black/40 border border-white/5 rounded-2xl p-6 text-awan-tx font-bold text-lg uppercase tracking-tight" 
                  value={title} 
                  onChangeText={setTitle} 
                  placeholder="NOM DU VECTEUR..." 
                  placeholderTextColor="#252525"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <span className="text-[10px] font-black text-awan-tx-mute tracking-[0.4em] uppercase mb-4 block">Heure H</span>
                  <TextInput 
                    className="bg-black/40 border border-white/5 rounded-2xl p-6 text-awan-tx font-mono text-center text-xl font-black" 
                    value={time} 
                    onChangeText={setTime} 
                    placeholder="09:00" 
                  />
                </div>
                <div>
                  <span className="text-[10px] font-black text-awan-tx-mute tracking-[0.4em] uppercase mb-4 block">Anticipation</span>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
                    {NOTIF_INTERVALS.map(ni => (
                      <Touch 
                        key={ni.value} 
                        className={`px-6 py-4 rounded-xl border transition-all ${reminder === ni.value ? 'bg-awan-gold/20 border-awan-gold shadow-inner' : 'bg-black/20 border-white/5'}`}
                        onPress={() => setReminder(ni.value)}
                      >
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${reminder === ni.value ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>{ni.label}</span>
                      </Touch>
                    ))}
                  </ScrollView>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-black text-awan-tx-mute tracking-[0.4em] uppercase mb-4 block">Classification de Priorité</span>
                <div className="flex flex-row flex-wrap gap-3">
                  {Object.entries(categories).map(([k, c]: any) => (
                    <Touch 
                      key={k} 
                      className={`px-6 py-4 rounded-xl border transition-all ${cat === k ? 'bg-white/10 border-white/20 shadow-inner' : 'bg-black/20 border-transparent opacity-40'}`}
                      onPress={() => setCat(k)}
                    >
                      <div className="flex flex-row items-center gap-3">
                         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.c }} />
                         <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: cat === k ? '#fff' : c.c }}>{c.l}</span>
                      </div>
                    </Touch>
                  ))}
                </div>
              </div>

              <div className="flex flex-row gap-6 pt-10">
                <Touch 
                  className="flex-1 h-20 bg-white/5 rounded-[24px] flex items-center justify-center border border-white/5"
                  onPress={() => { setShowModal(false); setTitle(''); setCat('perso'); setReminder(0); }}
                >
                  <span className="text-xs font-black text-awan-tx-mute tracking-[0.4em] uppercase">Abort</span>
                </Touch>
                <Touch 
                  className="flex-1 h-20 bg-awan-gold rounded-[24px] flex items-center justify-center shadow-2xl shadow-awan-gold/20"
                  onPress={addTask}
                >
                  <span className="text-xs font-black text-black tracking-[0.4em] uppercase">Déployer</span>
                </Touch>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}

