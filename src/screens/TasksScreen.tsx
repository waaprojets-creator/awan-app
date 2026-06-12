import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, Modal, TextInput as RNTextInput, ScrollView, StyleSheet
} from 'react-native';

const TextInput = RNTextInput as React.ComponentType<any>;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATS } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { FontSans, FontMono } from '../constants/typography';
import { uid, ds } from '../utils/storage';
import { useAppState } from '../context/AppStateContext';
import { useDaily } from '../context/DailyContext';
import { NOTIF_INTERVALS } from '../utils/notifications';
import { StopCircle, Trash2, Plus, Filter, CheckCircle, Circle, Zap, Target, Layers, Clock } from 'lucide-react-native';
import { LocalDbService } from '../services/localDbService';
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
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 150 }}
        style={{ flex: 1, backgroundColor: theme.bg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}>
          <Heading level={1} subtitle="Gestion des Objectifs">TÂCHES</Heading>
        </View>

        <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 24 }}>
          <Card style={{ flex: 1, padding: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }} variant="flat">
            <Text style={{ fontFamily: FontMono, fontSize: 9, fontWeight: '900', color: theme.selected, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 4, textAlign: 'center' }}>EN ATTENTE</Text>
            <Text style={{ fontFamily: FontMono, fontSize: 24, fontWeight: '900', color: theme.title, textAlign: 'center' }}>{tasks.filter((t: any) => !t.done).length}</Text>
          </Card>
          <Card style={{ flex: 1, padding: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }} variant="flat">
            <Text style={{ fontFamily: FontMono, fontSize: 9, fontWeight: '900', color: theme.mute, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 4, textAlign: 'center' }}>COMPLÉTÉES</Text>
            <Text style={{ fontFamily: FontMono, fontSize: 24, fontWeight: '900', color: theme.mute, textAlign: 'center' }}>{tasks.filter((t: any) => t.done).length}</Text>
          </Card>
        </View>

        <View style={{ padding: 24 }}>
          <View style={{ borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, marginBottom: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 56 }}>
              <Filter size={16} color={theme.selected} style={{ marginRight: 16 }} />
              <TextInput
                style={{ flex: 1, fontSize: 11, fontWeight: '700', color: theme.title, backgroundColor: 'transparent', fontFamily: FontMono, letterSpacing: 3.2, textTransform: 'uppercase' }}
                placeholder="RECHERCHE..."
                placeholderTextColor={theme.mute}
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>

          <View style={{ marginBottom: 40 }}>
            <Heading level={4} mono subtitle="Filtres">FILTRES</Heading>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, marginTop: 24 }}>
              {['all', 'pending', 'done'].map(status => (
                <Touch
                  key={status}
                  onPress={() => setFilterStatus(status)}
                  style={{
                    paddingHorizontal: 20, paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: filterStatus === status ? theme.selected : theme.border,
                    backgroundColor: filterStatus === status ? 'rgba(212,175,55,0.08)' : theme.surface,
                  }}
                >
                  <Text style={{ fontFamily: FontMono, fontSize: 11, fontWeight: '700', letterSpacing: 3.2, color: filterStatus === status ? theme.selected : theme.mute, textTransform: 'uppercase' }}>
                    {status === 'all' ? 'TOUTES' : status === 'pending' ? 'EN COURS' : 'TERMINÉES'}
                  </Text>
                </Touch>
              ))}
              <View style={{ width: 1, alignSelf: 'center', height: 24, backgroundColor: theme.border, marginLeft: 12, marginRight: 12 }} />
              {Object.entries(categories).map(([k, c]: any) => (
                <Touch
                  key={k}
                  onPress={() => setFilterCat(filterCat === k ? 'all' : k)}
                  style={{
                    paddingHorizontal: 20, paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: filterCat === k ? theme.border : 'transparent',
                    backgroundColor: filterCat === k ? theme.surface : 'transparent',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 6, height: 6, backgroundColor: c.c }} />
                    <Text style={{ fontFamily: FontMono, fontSize: 11, fontWeight: '700', letterSpacing: 3.2, color: filterCat === k ? theme.title : theme.mute, textTransform: 'uppercase' }}>{c.l}</Text>
                  </View>
                </Touch>
              ))}
            </ScrollView>
          </View>

          <View style={{ marginBottom: 48 }}>
            <Heading level={4} mono subtitle="Saisie directe">AJOUT RAPIDE</Heading>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 24 }}>
              <View style={{ flex: 1, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingLeft: 20, paddingRight: 20, paddingTop: 16, paddingBottom: 16 }}>
                <TextInput
                  style={{ fontSize: 13, fontWeight: '700', color: theme.title, backgroundColor: 'transparent', textTransform: 'uppercase', fontFamily: FontSans }}
                  placeholder="NOUVELLE TÂCHE..."
                  placeholderTextColor={theme.mute}
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={handleAddEntry}
                />
              </View>
              <Touch
                onPress={handleAddEntry}
                style={{ width: 56, height: 56, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={24} color="black" strokeWidth={3} />
              </Touch>
            </View>
          </View>

          <View>
            <Heading level={4} mono subtitle="Inventaire">LISTE</Heading>
            <View style={{ marginTop: 24 }}>
              {filteredTasks.map((item: any) => {
                const catColor = categories[item.category]?.c ?? theme.mute;
                return (
                  <View key={item.id} style={{ marginBottom: 12 }}>
                    <Touch
                      onPress={() => toggleDone(item.id)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 16,
                        paddingTop: 20, paddingBottom: 20, paddingLeft: 20, paddingRight: 16,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: item.done ? 'transparent' : theme.surface,
                        opacity: item.done ? 0.35 : 1,
                      }}
                    >
                      <View style={{ width: 3, alignSelf: 'stretch', backgroundColor: catColor, flexShrink: 0 }} />

                      <Touch onPress={() => toggleDone(item.id)} style={{ padding: 4 }}>
                        {item.done ? (
                          <CheckCircle size={22} color={theme.selected} />
                        ) : (
                          <Circle size={22} color={theme.border} />
                        )}
                      </Touch>

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: FontSans, fontSize: 14, fontWeight: '700', color: theme.title, textTransform: 'uppercase', letterSpacing: 0.56, textDecorationLine: item.done ? 'line-through' : 'none' }}>{item.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ width: 6, height: 6, backgroundColor: catColor }} />
                            <Text style={{ fontFamily: FontMono, fontSize: 9, fontWeight: '700', letterSpacing: 4, color: theme.mute, textTransform: 'uppercase' }}>
                              {categories[item.category]?.l || item.category}
                            </Text>
                          </View>
                          {item.time && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Clock size={10} color={theme.selected} />
                              <Text style={{ fontFamily: FontMono, fontSize: 9, fontWeight: '700', color: theme.selected, opacity: 0.6, textTransform: 'uppercase' }}>{item.time}</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Touch
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 8,
                            paddingHorizontal: 14, paddingVertical: 10,
                            borderWidth: 1,
                            borderColor: activeTaskId === item.id ? theme.danger : theme.border,
                            backgroundColor: activeTaskId === item.id ? 'rgba(255,107,107,0.08)' : 'transparent',
                          }}
                          onPress={() => toggleTimer(item.id)}
                        >
                          {activeTaskId === item.id && (
                            <Text style={{ fontFamily: FontMono, fontSize: 11, fontWeight: '900', color: theme.danger }}>{formatTime(elapsed)}</Text>
                          )}
                          {activeTaskId === item.id ? (
                            <StopCircle size={18} color={theme.danger} />
                          ) : (
                            <Zap size={16} color={theme.mute} />
                          )}
                        </Touch>

                        <Touch
                          onPress={() => deleteTask(item.id)}
                          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}
                        >
                          <Trash2 size={16} color={theme.mute} />
                        </Touch>
                      </View>
                    </Touch>
                  </View>
                );
              })}
            </View>
          </View>

          {filteredTasks.length === 0 && (
            <View style={{ paddingTop: 96, paddingBottom: 96, alignItems: 'center' }}>
              <View style={{ width: 80, height: 80, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Target size={40} color={theme.border} />
              </View>
              <Heading level={4} style={{ color: theme.mute }} subtitle="">Aucune tâche</Heading>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: (theme as any).overlay ?? 'rgba(0,0,0,0.7)' }}>
          <View style={{ backgroundColor: theme.surface, padding: 40, borderTopWidth: 1, borderTopColor: theme.border, width: '100%' }}>
            <Heading level={2} subtitle="Nouvelle tâche">AJOUTER</Heading>

            <View style={{ flexDirection: 'column', gap: 24, marginTop: 40 }}>
              <View>
                <Text style={{ fontFamily: FontMono, fontSize: 9, fontWeight: '700', letterSpacing: 6.4, textTransform: 'uppercase', color: theme.selected, marginBottom: 12 }}>TITRE</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg, padding: 20, color: theme.title, fontWeight: '700', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.64, width: '100%', fontFamily: FontSans }}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="NOM DE LA TÂCHE..."
                  placeholderTextColor={theme.mute}
                  autoFocus
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FontMono, fontSize: 9, fontWeight: '700', letterSpacing: 6.4, textTransform: 'uppercase', color: theme.mute, marginBottom: 12 }}>HEURE</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg, padding: 20, color: theme.title, fontFamily: FontMono, textAlign: 'center', fontSize: 18, fontWeight: '900', width: '100%' }}
                    value={time}
                    onChangeText={setTime}
                    placeholder="09:00"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FontMono, fontSize: 9, fontWeight: '700', letterSpacing: 6.4, textTransform: 'uppercase', color: theme.mute, marginBottom: 12 }}>RAPPEL</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
                    {NOTIF_INTERVALS.map(ni => (
                      <Touch
                        key={ni.value}
                        style={{
                          paddingHorizontal: 16, paddingVertical: 14,
                          borderWidth: 1,
                          borderColor: reminder === ni.value ? theme.selected : theme.border,
                          backgroundColor: reminder === ni.value ? 'rgba(212,175,55,0.08)' : 'transparent',
                        }}
                        onPress={() => setReminder(ni.value)}
                      >
                        <Text style={{ fontFamily: FontMono, fontSize: 10, fontWeight: '700', letterSpacing: 3.2, textTransform: 'uppercase', color: reminder === ni.value ? theme.selected : theme.mute }}>{ni.label}</Text>
                      </Touch>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View>
                <Text style={{ fontFamily: FontMono, fontSize: 9, fontWeight: '700', letterSpacing: 6.4, textTransform: 'uppercase', color: theme.mute, marginBottom: 12 }}>CATÉGORIE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(categories).map(([k, c]: any) => (
                    <Touch
                      key={k}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 14,
                        borderWidth: 1,
                        borderColor: cat === k ? theme.border : 'transparent',
                        backgroundColor: cat === k ? theme.surface : 'transparent',
                        opacity: cat === k ? 1 : 0.5,
                      }}
                      onPress={() => setCat(k)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 6, height: 6, backgroundColor: c.c }} />
                        <Text style={{ fontFamily: FontMono, fontSize: 10, fontWeight: '700', letterSpacing: 3.2, textTransform: 'uppercase', color: cat === k ? theme.title : c.c }}>{c.l}</Text>
                      </View>
                    </Touch>
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, paddingTop: 16 }}>
                <Touch
                  style={{ flex: 1, height: 64, borderWidth: 1, borderColor: theme.border, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => { setShowModal(false); setTitle(''); setCat('perso'); setReminder(0); }}
                >
                  <Text style={{ fontFamily: FontMono, fontSize: 10, fontWeight: '700', letterSpacing: 6.4, textTransform: 'uppercase', color: theme.mute }}>ANNULER</Text>
                </Touch>
                <Touch
                  style={{ flex: 1, height: 64, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}
                  onPress={addTask}
                >
                  <Text style={{ fontFamily: FontMono, fontSize: 10, fontWeight: '700', letterSpacing: 6.4, textTransform: 'uppercase', color: 'black' }}>VALIDER</Text>
                </Touch>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ position: 'absolute', bottom: 128, right: 32, zIndex: 50 }}>
        <Touch
          style={{ width: 56, height: 56, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}
          onPress={() => setShowModal(true)}
        >
          <Plus size={28} color="black" strokeWidth={3} />
        </Touch>
      </View>
    </View>
  );
}
