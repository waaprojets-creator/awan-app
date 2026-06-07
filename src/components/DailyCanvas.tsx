// @ts-nocheck — legacy, rewritten per sprint
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { BaseDailyEntry } from '../types/daily';
import { useDaily } from '../context/DailyContext';
import { ds } from '../utils/storage';
import { TokenIcon } from '../constants/tokenIcons';
import { FontSans, FontMono } from '../constants/typography';
import { Fs, Fw, Ls, Sp, Clr } from '../theme/tokens';

interface DailyCanvasProps {
  dateId?: string;
  filterModule?: string;
  module?: string;
  renderItem?: (item: BaseDailyEntry) => React.ReactNode;
  onReorder?: (activeId: string, overId: string) => void;
}

export function DailyCanvas({
  dateId = ds(new Date()),
  filterModule,
  module,
  renderItem,
}: DailyCanvasProps) {
  const theme = useTheme();
  const { getEntriesByDate } = useDaily();
  const m = filterModule || module;

  const displayEntries = React.useMemo(() => {
    const all = getEntriesByDate(dateId);
    return m ? all.filter(e => e.module === m) : all;
  }, [getEntriesByDate, dateId, m]);

  if (displayEntries.length === 0) {
    return (
      <View style={s.emptyState}>
        <Text style={[s.emptyText, { color: theme.text }]}>Aucune donnée pour le {dateId}</Text>
      </View>
    );
  }

  return (
    <View style={s.list}>
      {displayEntries.map((entry) => (
        <View key={entry.id}>
          {renderItem ? renderItem(entry) : (
            <View style={[s.defaultCard, { backgroundColor: Clr.white5, borderColor: Clr.white10 }]}>
              <View style={[s.iconBox, { backgroundColor: Clr.gold10, borderColor: Clr.gold20 }]}>
                <TokenIcon iconKey={entry.tokens[0]?.icon || 'clipboard'} size={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.moduleName, { color: theme.selected }]}>{entry.module}</Text>
                <Text style={[s.tokenVal, { color: theme.title }]}>
                  {entry.tokens[0]?.value} {entry.tokens[0]?.unit}
                </Text>
                {entry.rawText && (
                  <Text style={[s.rawText, { color: theme.mute }]}>"{entry.rawText}"</Text>
                )}
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  list: { flexDirection: 'column', width: '100%', gap: 12 },
  emptyState: { padding: 20, alignItems: 'center' },
  emptyText: { fontStyle: 'italic', fontSize: 13 },
  defaultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  iconBox: {
    width: 40, height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  moduleName: {
    fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display,
    letterSpacing: Ls.sm_02, textTransform: 'uppercase', marginBottom: 4,
  },
  tokenVal: { fontFamily: FontSans, fontSize: Fs.body, fontWeight: Fw.value },
  rawText: { fontFamily: FontSans, fontSize: Fs.md, fontStyle: 'italic', opacity: 0.7 },
});
