import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Modal, TextInput as RNTextInput, ScrollView
} from 'react-native';

const TextInput = RNTextInput as React.ComponentType<any>;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion } from '@/components/motion';
import { CATS } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { FontSans, FontMono } from '../constants/typography';
import { uid, ds } from '../utils/storage';
import { useAppState } from '../context/AppStateContext';
import { useDaily } from '../context/DailyContext';
import { NOTIF_INTERVALS } from '../utils/notifications';
import { StopCircle, Trash2, ChevronLeft, Plus, Filter, CheckCircle, Circle, Zap, Target, Layers, Clock } from 'lucide-react-native';
import { LocalDbService } from '../services/localDbService';
import { PageWrapper, StaggerList, StaggerItem } from '../components/Animated';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';

export default function TasksScreen() {
  const theme = useTheme();
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
      tokens: [{ label: 'TÂCHE', value: 'RAPIDE', icon: 'zap' }]
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
          <Heading level={1} className="mb-0" subtitle="Gestion des Objectifs">TÂCHES</Heading>
        </div>

          <div className="flex flex-row gap-4 px-6">
            <Card className="flex-1 p-5 border" variant="flat" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <span className="text-awan-sm font-black text-awan-gold tracking-widest uppercase mb-1 block text-center">EN ATTENTE</span>
              <span className="text-2xl font-black text-awan-tx tabular-nums text-center">{tasks.filter((t: any) => !t.done).length}</span>
            </Card>
            <Card className="flex-1 p-5 border" variant="flat" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <span className="text-awan-sm font-black text-awan-tx-mute uppercase tracking-widest mb-1 block text-center">COMPLÉTÉES</span>
              <span className="text-2xl font-black text-awan-tx-mute tabular-nums text-center">{tasks.filter((t: any) => t.done).length}</span>
            </Card>
          </div>

        <div className="p-6">
          <div className="border mb-10" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <div className="flex flex-row items-center px-5 h-14">
              <Filter size={16} color={theme.selected} style={{ marginRight: 16 }} />
              <TextInput
                style={{ flex: 1, fontSize: 11, fontWeight: 700, color: theme.title, backgroundColor: 'transparent', outline: 'none', fontFamily: FontMono, letterSpacing: '0.2em', textTransform: 'uppercase' }}
                placeholder="RECHERCHE..."
                placeholderTextColor={theme.mute}
                value={search}
                onChangeText={setSearch}
              />
            </div>
          </div>

          <div className="mb-10">
            <Heading level={4} mono subtitle="Filtres" className="mb-6">FILTRES</Heading>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
              {['all', 'pending', 'done'].map(status => (
                <Touch
                  key={status}
                  onPress={() => setFilterStatus(status)}
                  style={{
                    paddingHorizontal: 20, paddingVertical: 12,
                    border: '1px solid',
                    borderColor: filterStatus === status ? theme.selected : theme.border,
                    backgroundColor: filterStatus === status ? 'rgba(212,175,55,0.08)' : theme.surface,
                  }}
                >
                  <span style={{ fontFamily: FontMono, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: filterStatus === status ? theme.selected : theme.mute, textTransform: 'uppercase' }}>
                    {status === 'all' ? 'TOUTES' : status === 'pending' ? 'EN COURS' : 'TERMINÉES'}
                  </span>
                </Touch>
              ))}
              <div style={{ width: 1, alignSelf: 'center', height: 24, backgroundColor: theme.border, marginLeft: 12, marginRight: 12 }} />
              {Object.entries(categories).map(([k, c]: any) => (
                <Touch
                  key={k}
                  onPress={() => setFilterCat(filterCat === k ? 'all' : k)}
                  style={{
                    paddingHorizontal: 20, paddingVertical: 12,
                    border: '1px solid',
                    borderColor: filterCat === k ? theme.border : 'transparent',
                    backgroundColor: filterCat === k ? theme.surface : 'transparent',
                  }}
                >
                  <div className="flex flex-row items-center gap-2">
                    <div style={{ width: 6, height: 6, backgroundColor: c.c }} />
                    <span style={{ fontFamily: FontMono, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: filterCat === k ? theme.title : theme.mute, textTransform: 'uppercase' }}>{c.l}</span>
                  </div>
                </Touch>
              ))}
            </ScrollView>
          </div>

          <div className="mb-12">
            <Heading level={4} mono subtitle="Saisie directe" className="mb-6">AJOUT RAPIDE</Heading>
            <div className="flex flex-row gap-3 items-center">
              <div style={{ flex: 1, border: `1px solid ${theme.border}`, backgroundColor: theme.surface, paddingLeft: 20, paddingRight: 20, paddingTop: 16, paddingBottom: 16 }}>
                <TextInput
                  style={{ fontSize: 13, fontWeight: 700, color: theme.title, backgroundColor: 'transparent', outline: 'none', textTransform: 'uppercase', fontFamily: FontSans }}
                  placeholder="NOUVELLE TÂCHE..."
                  placeholderTextColor={theme.mute}
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={handleAddEntry}
                />
              </div>
              <Touch
                onPress={handleAddEntry}
                style={{ width: 56, height: 56, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={24} color="black" strokeWidth={3} />
              </Touch>
            </div>
          </div>

          <StaggerList>
            <Heading level={4} mono subtitle="Inventaire" className="mb-6">LISTE</Heading>
            {filteredTasks.map((item: any) => {
              const catColor = categories[item.category]?.c ?? theme.mute;
              return (
                <StaggerItem key={item.id} className="mb-3">
                  <div
                    style={{
                      display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16,
                      paddingTop: 20, paddingBottom: 20, paddingLeft: 20, paddingRight: 16,
                      border: `1px solid ${theme.border}`,
                      backgroundColor: item.done ? 'transparent' : theme.surface,
                      opacity: item.done ? 0.35 : 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleDone(item.id)}
                  >
                    <div style={{ width: 3, alignSelf: 'stretch', backgroundColor: catColor, flexShrink: 0 }} />

                    <div style={{ cursor: 'pointer', padding: 4 }} onClick={(e) => { e.stopPropagation(); toggleDone(item.id); }}>
                      {item.done ? (
                        <CheckCircle size={22} color={theme.selected} />
                      ) : (
                        <Circle size={22} color={theme.border} />
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: FontSans, fontSize: 14, fontWeight: 700, color: theme.title, textTransform: 'uppercase', letterSpacing: '0.04em', textDecoration: item.done ? 'line-through' : 'none', display: 'block' }}>{item.title}</span>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 6, height: 6, backgroundColor: catColor }} />
                          <span style={{ fontFamily: FontMono, fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', color: theme.mute, textTransform: 'uppercase' }}>
                            {categories[item.category]?.l || item.category}
                          </span>
                        </div>
                        {item.time && (
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Clock size={10} color={theme.selected} />
                            <span style={{ fontFamily: FontMono, fontSize: 9, fontWeight: 700, color: theme.selected, opacity: 0.6, textTransform: 'uppercase' }}>{item.time}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Touch
                        style={{
                          display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8,
                          paddingHorizontal: 14, paddingVertical: 10,
                          border: '1px solid',
                          borderColor: activeTaskId === item.id ? theme.danger : theme.border,
                          backgroundColor: activeTaskId === item.id ? 'rgba(255,107,107,0.08)' : 'transparent',
                        }}
                        onPress={(e: any) => { e.stopPropagation(); toggleTimer(item.id); }}
                      >
                        {activeTaskId === item.id && (
                          <span style={{ fontFamily: FontMono, fontSize: 11, fontWeight: 900, color: theme.danger, fontVariantNumeric: 'tabular-nums' }}>{formatTime(elapsed)}</span>
                        )}
                        {activeTaskId === item.id ? (
                          <StopCircle size={18} color={theme.danger} />
                        ) : (
                          <Zap size={16} color={theme.mute} />
                        )}
                      </Touch>

                      <Touch
                        onPress={(e: any) => { e.stopPropagation(); deleteTask(item.id); }}
                        style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', border: `1px solid ${theme.border}` }}
                      >
                        <Trash2 size={16} color={theme.mute} />
                      </Touch>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerList>

          {filteredTasks.length === 0 && (
            <div style={{ paddingTop: 96, paddingBottom: 96, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 80, height: 80, border: `1px solid ${theme.border}`, alignItems: 'center', justifyContent: 'center', marginBottom: 24, display: 'flex' }}>
                <Target size={40} color={theme.border} />
              </div>
              <Heading level={4} className="mb-0 text-center uppercase tracking-widest" style={{ color: theme.mute }} subtitle="">Aucune tâche</Heading>
            </div>
          )}
        </div>
      </ScrollView>

      {/* FAB — statique, pas d'animation */}
      <div style={{ position: 'fixed', bottom: 128, right: 32, zIndex: 50 }}>
        <Touch
          style={{ width: 56, height: 56, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center', border: `1px solid ${theme.border}` }}
          onPress={() => setShowModal(true)}
        >
          <Plus size={28} color="black" strokeWidth={3} />
        </Touch>
      </div>

      <Modal visible={showModal} transparent animationType="fade">
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', backgroundColor: theme.overlay, backdropFilter: 'blur(8px)' }}>
          <div style={{ backgroundColor: theme.surface, padding: 40, borderTop: `1px solid ${theme.border}`, width: '100%', maxWidth: 512, margin: '0 auto' }}>
            <Heading level={2} className="text-center mb-10" subtitle="Nouvelle tâche">AJOUTER</Heading>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <span style={{ fontFamily: FontMono, fontSize: 9, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: theme.selected, display: 'block', marginBottom: 12 }}>TITRE</span>
                <TextInput
                  style={{ border: `1px solid ${theme.border}`, backgroundColor: theme.bg, padding: 20, color: theme.title, fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.04em', outline: 'none', width: '100%', fontFamily: FontSans }}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="NOM DE LA TÂCHE..."
                  placeholderTextColor={theme.mute}
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={{ fontFamily: FontMono, fontSize: 9, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: theme.mute, display: 'block', marginBottom: 12 }}>HEURE</span>
                  <TextInput
                    style={{ border: `1px solid ${theme.border}`, backgroundColor: theme.bg, padding: 20, color: theme.title, fontFamily: FontMono, textAlign: 'center', fontSize: 18, fontWeight: 900, outline: 'none', width: '100%' }}
                    value={time}
                    onChangeText={setTime}
                    placeholder="09:00"
                  />
                </div>
                <div>
                  <span style={{ fontFamily: FontMono, fontSize: 9, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: theme.mute, display: 'block', marginBottom: 12 }}>RAPPEL</span>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
                    {NOTIF_INTERVALS.map(ni => (
                      <Touch
                        key={ni.value}
                        style={{
                          paddingHorizontal: 16, paddingVertical: 14,
                          border: '1px solid',
                          borderColor: reminder === ni.value ? theme.selected : theme.border,
                          backgroundColor: reminder === ni.value ? 'rgba(212,175,55,0.08)' : 'transparent',
                        }}
                        onPress={() => setReminder(ni.value)}
                      >
                        <span style={{ fontFamily: FontMono, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: reminder === ni.value ? theme.selected : theme.mute }}>{ni.label}</span>
                      </Touch>
                    ))}
                  </ScrollView>
                </div>
              </div>

              <div>
                <span style={{ fontFamily: FontMono, fontSize: 9, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: theme.mute, display: 'block', marginBottom: 12 }}>CATÉGORIE</span>
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(categories).map(([k, c]: any) => (
                    <Touch
                      key={k}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 14,
                        border: '1px solid',
                        borderColor: cat === k ? theme.border : 'transparent',
                        backgroundColor: cat === k ? theme.surface : 'transparent',
                        opacity: cat === k ? 1 : 0.5,
                      }}
                      onPress={() => setCat(k)}
                    >
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 6, height: 6, backgroundColor: c.c }} />
                        <span style={{ fontFamily: FontMono, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: cat === k ? theme.title : c.c }}>{c.l}</span>
                      </div>
                    </Touch>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'row', gap: 12, paddingTop: 16 }}>
                <Touch
                  style={{ flex: 1, height: 64, border: `1px solid ${theme.border}`, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => { setShowModal(false); setTitle(''); setCat('perso'); setReminder(0); }}
                >
                  <span style={{ fontFamily: FontMono, fontSize: 10, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: theme.mute }}>ANNULER</span>
                </Touch>
                <Touch
                  style={{ flex: 1, height: 64, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}
                  onPress={addTask}
                >
                  <span style={{ fontFamily: FontMono, fontSize: 10, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'black' }}>VALIDER</span>
                </Touch>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
