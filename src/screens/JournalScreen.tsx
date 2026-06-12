import React, { useState } from 'react';
import { View, Text, TextInput as RNTextInput, ScrollView, StyleSheet } from 'react-native';

const TextInput = RNTextInput as React.ComponentType<any>;
import { useDaily } from '../context/DailyContext';
import { DailyCanvas } from '../components/DailyCanvas';
import { useAppState } from '../context/AppStateContext';
import { useJournalStore } from '../hooks/useJournalStore';
import { ds, dateId } from '../utils/storage';
import { ModuleType } from '../types/daily';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';
import { ChevronLeft, Plus, History, Layout, Filter, Terminal, BookMarked, Trash2 } from 'lucide-react-native';
import { TokenIcon, MODULE_ICON_KEY } from '../constants/tokenIcons';
import { L } from '../constants/labels';
import { useTheme } from '../hooks/useTheme';
import { Fs, Fw, Ls, Sp, Clr, T } from '../theme/tokens';
import { FontMono } from '../constants/typography';

const MODULE_LABELS: Record<string, string> = {
  nutrition:   (L as any).modules.nutrition?.name ?? 'NUTRITION',
  sport:       (L as any).modules.sport?.name     ?? 'SPORT',
  trajet:      (L as any).modules.trajet?.name    ?? 'TRAJET',
  islam:       (L as any).modules.spirit?.name    ?? 'ISLAM',
  mesure:      'MESURE',
  task:        'TÂCHE',
  sante:       (L as any).modules.sante?.name     ?? 'SANTÉ',
  mental:      'MENTAL',
  mensuration: 'SCAN',
};

export default function JournalScreen() {
  const { navigate } = useAppState() as any;
  const { getEntriesByDate, moveEntry } = useDaily();
  const today = ds(new Date());

  const [selectedDate, setSelectedDate] = useState(today);
  const [inputText, setInputText] = useState('');
  const [activeModule, setActiveModule] = useState<ModuleType>('nutrition');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [moodValue, setMoodValue] = useState(3);

  const entries = getEntriesByDate(selectedDate);
  const journalStore = useJournalStore(selectedDate);
  const theme = useTheme();

  const handleAddEntry = () => {
    if (!inputText.trim()) return;

    const entryId = dateId(selectedDate);

    journalStore.save({
      v: 1,
      id: entryId,
      date: selectedDate,
      content: inputText,
      mood: moodValue as 1 | 2 | 3 | 4 | 5,
      module: activeModule,
      tags: [activeModule],
      timestamp: Date.now(),
    });
    setInputText('');
  };

  const MODULES: ModuleType[] = ['nutrition', 'sport', 'trajet', 'islam', 'mesure', 'task', 'sante', 'mental', 'mensuration'];

  return (
    <View style={{ flex: 1 }}>
      {/* Tactical Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Touch onPress={() => navigate('Dashboard')} style={styles.iconBtn}>
            <ChevronLeft size={20} color={theme.mute} />
          </Touch>
          <Heading level={1} subtitle="Archive Chronologique">JOURNAL</Heading>
          <View style={styles.headerActions}>
            <Touch style={styles.iconBtn}>
              <History size={18} color={theme.mute} />
            </Touch>
            <Touch
              onPress={() => setIsFilterOpen(!isFilterOpen)}
              style={[styles.iconBtn, { backgroundColor: isFilterOpen ? theme.selected : Clr.white5 }]}
            >
              <Filter size={18} color={isFilterOpen ? '#000' : theme.mute} />
            </Touch>
          </View>
        </View>

        <View style={[styles.dateNav, { backgroundColor: theme.surface }]}>
          <Touch style={styles.navArrow}>
            <ChevronLeft size={16} color={Clr.white20} />
          </Touch>
          <View style={styles.dateCenter}>
            <Text style={[styles.dateText, { color: theme.title }]}>{selectedDate}</Text>
            <Text style={[styles.dateSubLabel, { color: theme.selected }]}>SÉQUENCE OPÉRATIVE</Text>
          </View>
          <Touch style={styles.navArrow}>
            <Plus size={16} color={Clr.white20} />
          </Touch>
        </View>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Module Injector */}
        <View style={{ padding: Sp[6] }}>
          {/* INPUT TERMINAL */}
          <View style={{ marginBottom: Sp[10] }}>
            <View style={styles.sectionHeaderRow}>
              <Heading level={4} mono subtitle="Injection de Données">INPUT TERMINAL</Heading>
              <Text style={styles.syncLabel}>Ready for Sync</Text>
            </View>

            <View style={[styles.inputCard, { backgroundColor: theme.surface }]}>
              {/* Module selector */}
              <View style={styles.moduleRow}>
                {MODULES.map((mod) => (
                  <Touch
                    key={mod}
                    style={[
                      styles.modulePill,
                      activeModule === mod
                        ? { backgroundColor: theme.selected, borderColor: theme.selected }
                        : { backgroundColor: Clr.white5, borderColor: Clr.white5 },
                    ]}
                    onPress={() => setActiveModule(mod)}
                  >
                    <View style={styles.modulePillInner}>
                      <TokenIcon
                        iconKey={MODULE_ICON_KEY[mod.toLowerCase()] ?? 'file'}
                        size={12}
                        color={activeModule === mod ? '#000' : theme.mute}
                      />
                      <Text style={[
                        styles.modulePillText,
                        { color: activeModule === mod ? '#000' : theme.mute },
                      ]}>
                        {MODULE_LABELS[mod] ?? mod.toUpperCase()}
                      </Text>
                    </View>
                  </Touch>
                ))}
              </View>

              {/* Mood selector */}
              <View style={styles.moodRow}>
                {([1, 2, 3, 4, 5] as const).map(v => (
                  <Touch
                    key={v}
                    onPress={() => setMoodValue(v)}
                    style={[
                      styles.moodBtn,
                      moodValue === v
                        ? { backgroundColor: theme.selected, borderColor: theme.selected }
                        : { backgroundColor: Clr.white5, borderColor: Clr.white10 },
                    ]}
                  >
                    <Text style={[styles.moodBtnText, { color: moodValue === v ? '#000' : theme.mute }]}>
                      {v}
                    </Text>
                  </Touch>
                ))}
              </View>

              {/* Text input row */}
              <View style={styles.inputRow}>
                <View style={[styles.inputWrapper, { backgroundColor: theme.surface }]}>
                  <Terminal size={14} color={theme.selected} style={{ opacity: 0.5, marginRight: 12 }} />
                  <TextInput
                    style={[styles.textInput, { color: theme.title }]}
                    placeholder="SYSTÈME LOG: CAPTURE..."
                    placeholderTextColor="rgba(255,255,255,0.15)"
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleAddEntry}
                  />
                </View>
                <Touch
                  onPress={handleAddEntry}
                  style={[styles.addBtn, { backgroundColor: theme.selected }]}
                >
                  <Plus size={24} color="black" strokeWidth={3} />
                </Touch>
              </View>
            </View>
          </View>

          {/* CANVAS JOURNALIER */}
          <View style={{ marginBottom: Sp[10] }}>
            <View style={styles.sectionHeaderRow}>
              <Heading level={4} mono subtitle="Récupération Chrono">CANVAS JOURNALIER</Heading>
              <View style={styles.dotRow}>
                <View style={[styles.dot, { backgroundColor: theme.selected }]} />
                <View style={[styles.dot, { backgroundColor: theme.selected, opacity: 0.5 }]} />
                <View style={[styles.dot, { backgroundColor: theme.selected, opacity: 0.2 }]} />
              </View>
            </View>

            <View style={[styles.canvasContainer, { backgroundColor: Clr.white5 }]}>
              <DailyCanvas
                dateId={selectedDate}
                onReorder={(activeId: string, overId: string) => moveEntry(selectedDate, activeId, overId)}
              />
              {entries.length === 0 && (
                <View style={styles.emptyCanvas}>
                  <Layout size={48} color={theme.mute} />
                  <Text style={[styles.emptyText, { color: theme.mute }]}>Aucune séquence archivée</Text>
                </View>
              )}
            </View>
          </View>

          {/* ARCHIVE JOURNAL */}
          <View style={{ marginBottom: 56 }}>
            <View style={styles.sectionHeaderRow}>
              <Heading level={4} mono subtitle="Entrées Structurées">ARCHIVE JOURNAL</Heading>
              <BookMarked size={14} color={theme.mute} />
            </View>

            {journalStore.loading ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: theme.mute, opacity: 0.3 }]}>Chargement...</Text>
              </View>
            ) : journalStore.entries.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: theme.mute, opacity: 0.2 }]}>Aucune entrée pour ce jour</Text>
              </View>
            ) : (
              <View style={styles.entriesList}>
                {journalStore.entries.map((entry) => (
                  <View
                    key={entry.id}
                    style={[styles.entryCard, { backgroundColor: theme.surface, borderColor: Clr.white5 }]}
                  >
                    <View style={styles.entryCardHeader}>
                      <View style={styles.entryCardLeft}>
                        <TokenIcon iconKey={MODULE_ICON_KEY[entry.module] || 'file'} size={18} />
                        <View style={{ marginLeft: 12 }}>
                          <Text style={[styles.entryModule, { color: theme.selected }]}>{entry.module}</Text>
                          <View style={styles.moodDots}>
                            {([1, 2, 3, 4, 5] as const).map(v => (
                              <View
                                key={v}
                                style={[
                                  styles.moodDot,
                                  { backgroundColor: v <= entry.mood ? theme.selected : Clr.white10 },
                                ]}
                              />
                            ))}
                          </View>
                        </View>
                      </View>
                      <View style={styles.entryCardRight}>
                        <Text style={[styles.entryTime, { color: theme.mute }]}>
                          {new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <Touch
                          onPress={() => journalStore.remove(entry.id)}
                          style={[styles.deleteBtn, { backgroundColor: `${theme.danger}1A`, borderColor: `${theme.danger}33` }]}
                        >
                          <Trash2 size={12} color={theme.danger} />
                        </Touch>
                      </View>
                    </View>
                    <Text style={[styles.entryContent, { color: theme.title }]}>{entry.content}</Text>
                    {entry.tags.length > 0 && (
                      <View style={styles.tagsRow}>
                        {entry.tags.map(tag => (
                          <View key={tag} style={[styles.tagChip, { backgroundColor: Clr.white5, borderColor: Clr.white5 }]}>
                            <Text style={[styles.tagText, { color: theme.mute }]}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Sp[6],
    paddingTop: Sp[4],
    paddingBottom: Sp[4],
    borderBottomWidth: 1,
    borderBottomColor: Clr.white5,
    backgroundColor: Clr.white5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: Sp[4],
  },
  iconBtn: {
    width: 40,
    height: 40,
    backgroundColor: Clr.white5,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Sp[4],
    borderWidth: 1,
    borderColor: Clr.white5,
  },
  navArrow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateText: {
    fontFamily: FontMono,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: Ls.tight,
  },
  dateSubLabel: {
    fontFamily: FontMono,
    fontSize: Fs.sm,
    fontWeight: Fw.display,
    letterSpacing: 3.6,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Sp[4],
    paddingHorizontal: Sp[1],
  },
  syncLabel: {
    fontFamily: FontMono,
    fontSize: Fs.sm,
    fontWeight: Fw.display,
    color: 'rgba(212,175,55,0.5)',
    textTransform: 'uppercase',
    letterSpacing: Ls.sm_02,
  },
  inputCard: {
    padding: Sp[6],
    borderWidth: 1,
    borderColor: Clr.white10,
  },
  moduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Sp[6],
  },
  modulePill: {
    paddingHorizontal: Sp[4],
    paddingVertical: Sp[2],
    borderWidth: 1,
  },
  modulePillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modulePillText: {
    fontFamily: FontMono,
    fontSize: Fs.md,
    fontWeight: Fw.display,
    textTransform: 'uppercase',
    letterSpacing: Ls.md_03,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Sp[4],
  },
  moodBtn: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodBtnText: {
    fontFamily: FontMono,
    fontSize: Fs.xs,
    fontWeight: Fw.display,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: Clr.white10,
    paddingHorizontal: Sp[5],
    paddingVertical: Sp[2],
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: Fs.body,
    fontWeight: Fw.value,
  },
  addBtn: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  canvasContainer: {
    borderWidth: 1,
    borderColor: Clr.white5,
    minHeight: 200,
    padding: Sp[2],
  },
  emptyCanvas: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    opacity: 0.2,
  },
  emptyText: {
    fontFamily: FontMono,
    fontSize: Fs.md,
    fontWeight: Fw.display,
    textTransform: 'uppercase',
    letterSpacing: 5,
    textAlign: 'center',
    marginTop: Sp[4],
  },
  emptyState: {
    paddingVertical: Sp[10],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontFamily: FontMono,
    fontSize: Fs.md,
    fontWeight: Fw.display,
    textTransform: 'uppercase',
    letterSpacing: Ls.md_03,
  },
  entriesList: {
    flexDirection: 'column',
    gap: 12,
  },
  entryCard: {
    borderWidth: 1,
    padding: Sp[5],
    marginBottom: 12,
  },
  entryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  entryCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryModule: {
    fontFamily: FontMono,
    fontSize: Fs.sm,
    fontWeight: Fw.display,
    letterSpacing: Ls.sm_02,
    textTransform: 'uppercase',
  },
  moodDots: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entryCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entryTime: {
    fontFamily: FontMono,
    fontSize: Fs.sm,
    fontWeight: Fw.value,
    opacity: 0.5,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  entryContent: {
    fontSize: Fs.body,
    fontWeight: Fw.body,
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tagChip: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: FontMono,
    fontSize: Fs.sm,
    fontWeight: Fw.display,
    textTransform: 'uppercase',
    letterSpacing: Ls.sm_02,
  },
});
