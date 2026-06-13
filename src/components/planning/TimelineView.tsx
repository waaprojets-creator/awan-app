import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';

import { useTheme } from '../../hooks/useTheme';
import { FontSans, FontMono } from '../../constants/typography';
import { Fs, Fw, Ls, Sp } from '../../theme/tokens';
import { L } from '../../constants/labels';
import { ds } from '../../utils/storage';
import { Touch } from '../ui/Touch';
import { DayStateControl } from './DayStateControl';
import { stateColor, STATE_BG_OPACITY } from './stateColor';
import { useTimeline } from '../../hooks/useTimeline';
import { useDayState } from '../../hooks/useDayState';
import { stateAtMinute } from '../../modules/planning/dayState';
import { TASK_TYPE_META, type TaskType } from '../../data/schemas/planning/taskType';
import type { LifeState } from '../../data/schemas/planning/dayState';
import type { TimelineItem } from '../../modules/planning/timeline';

// Couleur par type : index stable dans la palette design-system (10 teintes).
const TYPE_PALETTE_INDEX: Record<TaskType, number> = {
  sport: 0,
  nutrition: 1,
  islam: 2,
  sommeil: 3,
  mensuration: 4,
  journal: 5,
  habitude: 6,
  tache: 7,
};

function minToHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dateLabel(cursor: Date): string {
  if (ds(cursor) === ds(new Date())) return L.common.today.toUpperCase();
  return cursor
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();
}

/**
 * Visionneur AWAN dans le temps — vue d'une journée.
 * Agrège tous les types de tâches (8 domaines) via useTimeline (getByDate + event bus)
 * et les place sur un axe horaire. Navigation jour par jour.
 */
export function TimelineView() {
  const theme = useTheme();
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const { items, loading } = useTimeline(ds(cursor));
  const { segments, setSegment, reset } = useDayState(ds(cursor));

  const goPrev = useCallback(() => setCursor(c => addDays(c, -1)), []);
  const goNext = useCallback(() => setCursor(c => addDays(c, 1)), []);
  const goToday = useCallback(() => setCursor(new Date()), []);

  const isToday = ds(cursor) === ds(new Date());

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Navigateur de date */}
      <View style={[s.navRow, { borderBottomColor: theme.border }]}>
        <Touch onPress={goPrev} style={s.navBtn} accessibilityLabel="Jour précédent">
          <ChevronLeft size={18} color={theme.mute} />
        </Touch>

        <Touch onPress={goToday} style={s.navCenter}>
          <Text style={[s.navDate, { color: isToday ? theme.selected : theme.title }]}>
            {dateLabel(cursor)}
          </Text>
          <Text style={[s.navCount, { color: theme.mute }]}>
            {loading ? L.state.loading : `${items.length} activité${items.length > 1 ? 's' : ''}`}
          </Text>
        </Touch>

        <Touch onPress={goNext} style={s.navBtn} accessibilityLabel="Jour suivant">
          <ChevronRight size={18} color={theme.mute} />
        </Touch>
      </View>

      {/* États de vie (segments intra-journée) — éditeur + fond du calendrier */}
      <DayStateControl segments={segments} setSegment={setSegment} reset={reset} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: Sp[6], paddingTop: Sp[3] }}
        showsVerticalScrollIndicator={false}
      >
        {!loading && items.length === 0 && (
          <View style={s.empty}>
            <Calendar size={28} color={theme.mute} />
            <Text style={[s.emptyText, { color: theme.mute }]}>{L.state.nothingToday}</Text>
          </View>
        )}

        {items.map((item, i) => (
          <Row
            key={item.id}
            item={item}
            index={i}
            tint={item.startMin != null ? stateAtMinute(segments, item.startMin) : null}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Row({ item, index, tint }: { item: TimelineItem; index: number; tint: LifeState | null }) {
  const theme = useTheme();
  // « libre » = état par défaut → pas de teinte (seuls les états notables ressortent).
  const tintColor = tint && tint !== 'libre' ? stateColor(theme, tint) : null;
  const color = theme.palette[TYPE_PALETTE_INDEX[item.type]] ?? theme.selected;
  const time = item.startMin != null ? minToHHMM(item.startMin) : '—';
  const tag =
    item.origin === 'planned'
      ? (item.done ? L.common.done.toUpperCase() : L.common.todo.toUpperCase())
      : 'LOG';

  return (
    <Animated.View entering={FadeInDown.duration(220).delay(Math.min(index * 20, 200))}>
      <View style={[s.row, { borderBottomColor: theme.borderSoft }]}>
        {/* Calque état en fond (opacité 10%) — les tâches restent au premier plan */}
        {tintColor ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tintColor, opacity: STATE_BG_OPACITY }]} />
        ) : null}
        <Text style={[s.time, { color: item.startMin != null ? theme.text : theme.mute }]}>{time}</Text>
        <View style={[s.bar, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <View style={s.metaRow}>
            <Text style={[s.type, { color }]}>{TASK_TYPE_META[item.type].label}</Text>
            <Text style={[s.tag, { color: theme.mute }]}>{tag}</Text>
          </View>
          <Text
            style={[s.title, { color: theme.title, opacity: item.done && item.origin === 'planned' ? 0.5 : 1 }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {item.subtitle ? <Text style={[s.sub, { color: theme.mute }]}>{item.subtitle}</Text> : null}
        </View>
        {item.endMin != null && item.startMin != null ? (
          <Text style={[s.end, { color: theme.mute }]}>{minToHHMM(item.endMin)}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Sp[5],
    paddingVertical: Sp[3],
    borderBottomWidth: 1,
  },
  navBtn: { padding: Sp[2] },
  navCenter: { flex: 1, alignItems: 'center' },
  navDate: {
    fontFamily: FontMono,
    fontSize: Fs.lg,
    fontWeight: Fw.display,
    letterSpacing: Ls.lg_02,
    textTransform: 'uppercase',
  },
  navCount: {
    fontFamily: FontMono,
    fontSize: Fs.xs,
    fontWeight: Fw.value,
    letterSpacing: Ls.xs_02,
    marginTop: 2,
  },
  empty: { paddingVertical: 80, alignItems: 'center', gap: Sp[3] },
  emptyText: {
    fontFamily: FontMono,
    fontSize: Fs.md,
    fontWeight: Fw.display,
    textTransform: 'uppercase',
    letterSpacing: Ls.md_02,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Sp[3],
    paddingVertical: Sp[2],
    borderBottomWidth: 1,
  },
  time: {
    width: 42,
    fontFamily: FontMono,
    fontSize: Fs.lg,
    fontWeight: Fw.value,
    letterSpacing: Ls.neg,
    paddingTop: 1,
  },
  bar: { width: 3, alignSelf: 'stretch' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  type: {
    fontFamily: FontMono,
    fontSize: Fs.xxs,
    fontWeight: Fw.display,
    letterSpacing: Ls.xxs_02,
    textTransform: 'uppercase',
  },
  tag: {
    fontFamily: FontMono,
    fontSize: Fs.xxs,
    fontWeight: Fw.value,
    letterSpacing: Ls.xxs_02,
  },
  title: {
    fontFamily: FontSans,
    fontSize: Fs.body,
    fontWeight: Fw.value,
    letterSpacing: Ls.body_005,
    marginTop: 2,
  },
  sub: {
    fontFamily: FontMono,
    fontSize: Fs.xs,
    letterSpacing: Ls.xs_02,
    marginTop: 2,
  },
  end: {
    fontFamily: FontMono,
    fontSize: Fs.sm,
    fontWeight: Fw.value,
    paddingTop: 1,
  },
});
