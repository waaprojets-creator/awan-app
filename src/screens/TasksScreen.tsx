import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput as RNTextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Search, CheckCircle, Circle, Trash2, Repeat } from 'lucide-react-native';

import { useTheme } from '../hooks/useTheme';
import { FontSans, FontMono } from '../constants/typography';
import { Fs, Fw, Ls, Sp, Clr } from '../theme/tokens';
import { L } from '../constants/labels';
import { Touch } from '../components/ui/Touch';
import { Heading } from '../components/ui/Heading';

import { getStorage } from '../data/storage/storageService';
import { Planner } from '../modules/planning/api';
import { HabitService } from '../services/habitService';
import { useTaskInventory } from '../hooks/useTaskInventory';
import { applyFilters, collectFacets, EMPTY_FILTERS, type TaskFilters, type TaskListItem } from '../modules/tasks/inventory';
import { TaskCreateModal } from '../components/tasks/TaskCreateModal';
import { domainColor, priorityColor, PRIORITY_LABEL, DOW_LABELS } from '../components/tasks/taskColors';

const TextInput = RNTextInput as React.ComponentType<any>;

export default function TasksScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { items, reload, today } = useTaskInventory();
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  const [showCreate, setShowCreate] = useState(false);

  const facets = useMemo(() => collectFacets(items), [items]);
  const filtered = useMemo(() => applyFilters(items, filters), [items, filters]);
  const todoCount = items.filter(i => !i.done).length;
  const doneCount = items.filter(i => i.done).length;

  const toggleDone = async (it: TaskListItem) => {
    if (it.source === 'task') {
      const planner = new Planner(await getStorage());
      const t = await planner.getTask(it.refId);
      if (t) await planner.saveTask({ ...t, status: t.status === 'done' ? 'active' : 'done' });
    } else {
      await HabitService.toggle(today, it.refId, it.title);
    }
    reload();
  };

  const remove = async (it: TaskListItem) => {
    if (it.source === 'task') {
      const planner = new Planner(await getStorage());
      await planner.deleteTask(it.refId);
    } else {
      await HabitService.deleteDefinition(it.refId);
    }
    reload();
  };

  const patch = (p: Partial<TaskFilters>) => setFilters(f => ({ ...f, ...p }));
  const toggleTag = (t: string) => setFilters(f => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter(x => x !== t) : [...f.tags, t] }));

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 150, paddingTop: insets.top + Sp[2] }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: Sp[6], paddingBottom: Sp[3] }}>
          <Heading level={1} subtitle="Inventaire & dossiers">TÂCHES</Heading>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <Stat label="À FAIRE" value={todoCount} color={theme.selected} />
          <Stat label="TERMINÉES" value={doneCount} color={theme.mute} />
        </View>

        {/* Recherche */}
        <View style={{ paddingHorizontal: Sp[6], marginBottom: Sp[4] }}>
          <View style={[s.search, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Search size={16} color={theme.selected} />
            <TextInput
              value={filters.search}
              onChangeText={(v: string) => patch({ search: v })}
              placeholder="RECHERCHE…"
              placeholderTextColor={theme.mute}
              style={[s.searchInput, { color: theme.title }]}
            />
          </View>
        </View>

        {/* Filtres */}
        <FilterRow label="STATUT">
          {(['all', 'todo', 'done'] as const).map(st => (
            <Chip key={st} label={st === 'all' ? L.common.all : st === 'todo' ? L.common.todo : L.common.done}
              active={filters.status === st} onPress={() => patch({ status: st })} />
          ))}
        </FilterRow>

        <FilterRow label="TYPE">
          {(['all', 'oneoff', 'recurring'] as const).map(rc => (
            <Chip key={rc} label={rc === 'all' ? 'Tout' : rc === 'oneoff' ? 'Ponctuelles' : 'Récurrentes'}
              active={filters.recurrence === rc} onPress={() => patch({ recurrence: rc })} />
          ))}
        </FilterRow>

        <FilterRow label="PRIORITÉ">
          {([1, 2, 3] as const).map(p => (
            <Chip key={p} label={PRIORITY_LABEL[p]} color={priorityColor(theme, p)}
              active={filters.priority === p} onPress={() => patch({ priority: filters.priority === p ? null : p })} />
          ))}
        </FilterRow>

        {facets.domains.length > 0 && (
          <FilterRow label="DOMAINE">
            {facets.domains.map(d => (
              <Chip key={d} label={d} dot={domainColor(theme, d)}
                active={filters.domain === d} onPress={() => patch({ domain: filters.domain === d ? null : d })} />
            ))}
          </FilterRow>
        )}

        {facets.tags.length > 0 && (
          <FilterRow label="DOSSIERS">
            {facets.tags.map(t => (
              <Chip key={t} label={t} active={filters.tags.includes(t)} onPress={() => toggleTag(t)} />
            ))}
          </FilterRow>
        )}

        {/* Liste */}
        <View style={{ paddingHorizontal: Sp[6], marginTop: Sp[4] }}>
          {filtered.map(it => (
            <Row key={it.id} item={it} onToggle={() => toggleDone(it)} onDelete={() => remove(it)} />
          ))}
          {filtered.length === 0 && (
            <View style={s.empty}>
              <Text style={[s.emptyText, { color: theme.mute }]}>{L.state.empty}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <View style={{ position: 'absolute', bottom: 128, right: 32, zIndex: 50 }}>
        <Touch onPress={() => setShowCreate(true)} style={[s.fab, { backgroundColor: theme.selected, borderColor: theme.border }]}>
          <Plus size={28} color={theme.bg} strokeWidth={3} />
        </Touch>
      </View>

      <TaskCreateModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={reload}
        existingDomains={facets.domains}
        existingTags={facets.tags}
      />
    </View>
  );
}

// ── Sous-composants ──────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const theme = useTheme();
  return (
    <View style={[s.stat, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Text style={[s.statLabel, { color }]}>{label}</Text>
      <Text style={[s.statValue, { color: theme.title }]}>{value}</Text>
    </View>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: Sp[3] }}>
      <Text style={[s.filterLabel, { color: theme.mute }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Sp[2], paddingHorizontal: Sp[6] }}>
        {children}
      </ScrollView>
    </View>
  );
}

function Chip({ label, active, onPress, color, dot }: { label: string; active: boolean; onPress: () => void; color?: string; dot?: string }) {
  const theme = useTheme();
  const accent = color ?? theme.selected;
  return (
    <Touch onPress={onPress} style={[s.chip, { borderColor: active ? accent : theme.border, backgroundColor: active ? (color ?? Clr.gold8) : 'transparent' }]}>
      {dot ? <View style={[s.chipDot, { backgroundColor: dot }]} /> : null}
      <Text style={[s.chipText, { color: active ? (color ? theme.bg : theme.selected) : theme.mute }]}>{label}</Text>
    </Touch>
  );
}

function Row({ item, onToggle, onDelete }: { item: TaskListItem; onToggle: () => void; onDelete: () => void }) {
  const theme = useTheme();
  const barColor = domainColor(theme, item.domain);
  const recurrenceLabel = item.daysOfWeek == null
    ? null
    : item.daysOfWeek.length === 0
      ? 'TOUS LES JOURS'
      : item.daysOfWeek.map(d => DOW_LABELS[d]).join(' ');

  return (
    <View style={[s.row, { borderColor: theme.border, backgroundColor: item.done ? 'transparent' : theme.surface, opacity: item.done ? 0.45 : 1 }]}>
      <View style={[s.rowBar, { backgroundColor: barColor }]} />
      <Touch onPress={onToggle} style={s.check}>
        {item.done ? <CheckCircle size={22} color={theme.selected} /> : <Circle size={22} color={theme.border} />}
      </Touch>

      <View style={{ flex: 1 }}>
        <Text style={[s.rowTitle, { color: theme.title, textDecorationLine: item.done ? 'line-through' : 'none' }]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={s.metaRow}>
          {item.recurring ? (
            <View style={s.meta}>
              <Repeat size={10} color={theme.mute} />
              <Text style={[s.metaText, { color: theme.mute }]}>{recurrenceLabel}</Text>
            </View>
          ) : item.priority ? (
            <Text style={[s.metaText, { color: priorityColor(theme, item.priority) }]}>{PRIORITY_LABEL[item.priority]}</Text>
          ) : null}

          {item.domain ? (
            <View style={s.meta}>
              <View style={[s.chipDot, { backgroundColor: barColor }]} />
              <Text style={[s.metaText, { color: theme.mute }]}>{item.domain}</Text>
            </View>
          ) : null}

          {item.tags.map(t => (
            <Text key={t} style={[s.tag, { color: theme.selected }]}>#{t}</Text>
          ))}
        </View>
      </View>

      <Touch onPress={onDelete} style={[s.del, { borderColor: theme.border }]}>
        <Trash2 size={15} color={theme.mute} />
      </Touch>
    </View>
  );
}

const s = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: Sp[4], paddingHorizontal: Sp[6], marginBottom: Sp[5] },
  stat: { flex: 1, borderWidth: 1, paddingVertical: Sp[4], alignItems: 'center' },
  statLabel: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, letterSpacing: Ls.sm_02, textTransform: 'uppercase', marginBottom: Sp[1] },
  statValue: { fontFamily: FontMono, fontSize: Fs.data, fontWeight: Fw.display },

  search: { flexDirection: 'row', alignItems: 'center', gap: Sp[3], borderWidth: 1, paddingHorizontal: Sp[4], height: 52 },
  searchInput: { flex: 1, fontFamily: FontMono, fontSize: Fs.lg, fontWeight: Fw.value, letterSpacing: Ls.lg_02, textTransform: 'uppercase' },

  filterLabel: { fontFamily: FontMono, fontSize: Fs.xxs, fontWeight: Fw.display, letterSpacing: Ls.xxs_02, textTransform: 'uppercase', paddingHorizontal: Sp[6], marginBottom: Sp[2] },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Sp[4], paddingVertical: Sp[2], borderWidth: 1 },
  chipDot: { width: 6, height: 6 },
  chipText: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, letterSpacing: Ls.sm_015, textTransform: 'uppercase' },

  row: { flexDirection: 'row', alignItems: 'stretch', gap: Sp[3], borderWidth: 1, paddingVertical: Sp[4], paddingRight: Sp[3], marginBottom: Sp[3] },
  rowBar: { width: 3, alignSelf: 'stretch' },
  check: { paddingLeft: Sp[3], justifyContent: 'center' },
  rowTitle: { fontFamily: FontSans, fontSize: Fs.body, fontWeight: Fw.value, letterSpacing: Ls.body_005, textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Sp[3], marginTop: Sp[2] },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: FontMono, fontSize: Fs.xxs, fontWeight: Fw.value, letterSpacing: Ls.xxs_02, textTransform: 'uppercase' },
  tag: { fontFamily: FontMono, fontSize: Fs.xxs, fontWeight: Fw.value, letterSpacing: Ls.xxs_02 },

  del: { width: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, alignSelf: 'center', height: 38 },

  empty: { paddingVertical: 80, alignItems: 'center' },
  emptyText: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.md_02 },

  fab: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
