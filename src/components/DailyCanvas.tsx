// @ts-nocheck — legacy, rewritten per sprint
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { BaseDailyEntry } from '../types/daily';
import { useDaily } from '../context/DailyContext';
import { ds } from '../utils/storage';
import { TokenIcon } from '../constants/tokenIcons';

interface DailyCanvasProps {
  dateId?: string;
  filterModule?: string;
  module?: string; // alias for filterModule
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
  const s = React.useMemo(() => makeStyles(theme), [theme]);
  const { getEntriesByDate } = useDaily();
  const m = filterModule || module;
  
  const displayEntries = React.useMemo(() => {
    const all = getEntriesByDate(dateId);
    return m ? all.filter(e => e.module === m) : all;
  }, [getEntriesByDate, dateId, m]);

  if (displayEntries.length === 0) {
    return (
      <View style={s.emptyState}>
        <Text style={s.emptyText}>Aucune donnée textuelle pour le {dateId}</Text>
      </View>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 12 }}>
      {displayEntries.map((entry) => (
        <div key={entry.id}>
          {renderItem ? renderItem(entry) : (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-row items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-awan-gold/10 flex items-center justify-center border border-awan-gold/20">
                  <TokenIcon iconKey={entry.tokens[0]?.icon || 'clipboard'} size={16} />
                </div>
                <div className="flex-1">
                  <span className="text-awan-sm font-black text-awan-gold tracking-widest uppercase mb-1 block">{entry.module}</span>
                  <span className="text-sm font-bold text-awan-tx">{entry.tokens[0]?.value} {entry.tokens[0]?.unit}</span>
                  {entry.rawText && <span className="text-awan-md text-awan-tx-mute italic block opacity-70">"{entry.rawText}"</span>}
                </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  emptyState: { padding: 20, alignItems: 'center' },
  emptyText: { color: theme.text, fontStyle: 'italic', fontSize: 13 },
  entryCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.text,
    borderRadius: 12,
    padding: 16,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleTag: { color: theme.title, fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  dragHandle: { color: theme.text, fontSize: 14 },
  tokensContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  token: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4
  },
  tokenIcon: { color: theme.title, fontSize: 12 },
  tokenValue: { color: theme.title, fontSize: 14, fontWeight: '600' },
  tokenLabel: { color: theme.text, fontSize: 10, letterSpacing: 0.5 },
  rawText: {
    marginTop: 12,
    color: theme.text,
    fontSize: 12,
    fontStyle: 'italic',
  }
});
