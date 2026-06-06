import React, { useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Touch } from './Touch';
import { useTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls, Sp, Clr } from '../../theme/tokens';

interface DateSelectPopupProps {
  value: string;
  onChange: (date: string) => void;
  max?: string;
  min?: string;
  label?: string;
}

const MONTHS_FR = [
  'JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
  'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE',
];
const DAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function localDateStr(year: number, month1: number, day: number): string {
  return `${year}-${String(month1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function shift(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return localDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
function formatLabel(date: string): string {
  const todayStr = localToday();
  if (date === todayStr) return "AUJOURD'HUI";
  if (date === shift(todayStr, -1)) return 'HIER';
  const d = new Date(`${date}T00:00:00`);
  const mon = MONTHS_FR[d.getMonth()]?.slice(0, 3) ?? '';
  return `${String(d.getDate()).padStart(2, '0')} ${mon} ${d.getFullYear()}`;
}

export function DateSelectPopup({ value, onChange, max, min, label }: DateSelectPopupProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(value.slice(0, 7));

  const maxDate = max ?? localToday();
  const canNext = value < maxDate;
  const canPrev = min ? value > min : true;

  const [calY, calMStr] = calMonth.split('-');
  const calYear = parseInt(calY ?? '2026', 10);
  const calM = parseInt(calMStr ?? '1', 10) - 1;

  const firstDay = new Date(calYear, calM, 1);
  const lastDay = new Date(calYear, calM + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
  ];

  function prevMonth() {
    const d = new Date(calYear, calM - 1, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  function nextMonth() {
    const d = new Date(calYear, calM + 1, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  function selectDay(day: number) {
    const ds = localDateStr(calYear, calM + 1, day);
    if (ds > maxDate) return;
    if (min && ds < min) return;
    onChange(ds);
    setOpen(false);
  }

  const todayStr = localToday();
  const displayLabel = formatLabel(value);

  return (
    <View>
      <View style={s.row}>
        {/* Précédent */}
        <Touch
          onPress={canPrev ? () => onChange(shift(value, -1)) : () => {}}
          disabled={!canPrev}
          style={[s.navBtn, { backgroundColor: theme.surfaceDim, borderColor: theme.borderSoft, opacity: canPrev ? 1 : 0.3 }]}
        >
          <ChevronLeft size={16} color={theme.selected} />
        </Touch>

        {/* Label date cliquable */}
        <Touch
          onPress={() => { setCalMonth(value.slice(0, 7)); setOpen(v => !v); }}
          style={[s.dateBtn, { backgroundColor: theme.surfaceDim, borderColor: theme.borderSoft }]}
        >
          {label && <Text style={[s.labelSmall, { color: theme.mute }]}>{label}</Text>}
          <Text style={[s.dateLabel, { color: theme.selected }]}>{displayLabel}</Text>
        </Touch>

        {/* Suivant */}
        <Touch
          onPress={canNext ? () => onChange(shift(value, 1)) : () => {}}
          disabled={!canNext}
          style={[s.navBtn, { backgroundColor: theme.surfaceDim, borderColor: theme.borderSoft, opacity: canNext ? 1 : 0.3 }]}
        >
          <ChevronRight size={16} color={canNext ? theme.selected : theme.mute} />
        </Touch>
      </View>

      {/* Calendrier popup */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)} />
        <View style={[s.calendar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header mois */}
          <View style={[s.row, s.monthHeader]}>
            <Touch onPress={prevMonth} style={s.monthBtn}>
              <ChevronLeft size={13} color={theme.text} />
            </Touch>
            <Text style={[s.monthLabel, { color: theme.title }]}>
              {MONTHS_FR[calM]} {calYear}
            </Text>
            <Touch onPress={nextMonth} style={s.monthBtn}>
              <ChevronRight size={13} color={theme.text} />
            </Touch>
          </View>

          {/* Jours de semaine */}
          <View style={s.daysRow}>
            {DAYS_FR.map((d, i) => (
              <Text key={i} style={[s.dayHeader, { color: theme.mute }]}>{d}</Text>
            ))}
          </View>

          {/* Cellules */}
          <View style={s.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={i} style={s.cellEmpty} />;
              const ds = localDateStr(calYear, calM + 1, day);
              const isSel = ds === value;
              const isToday = ds === todayStr;
              const disabled = ds > maxDate || (!!min && ds < min);
              return (
                <Touch
                  key={i}
                  onPress={disabled ? () => {} : () => selectDay(day)}
                  disabled={disabled}
                  style={[
                    s.cell,
                    isSel && { backgroundColor: theme.selected },
                    isToday && !isSel && { borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)', backgroundColor: 'rgba(212,175,55,0.12)' },
                    { opacity: disabled ? 0.22 : 1 },
                  ]}
                >
                  <Text style={[s.cellText, { color: isSel ? '#000' : theme.title, fontWeight: isSel ? Fw.display : Fw.body }]}>
                    {day}
                  </Text>
                </Touch>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CELL_SIZE = 36;
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navBtn: { width: 36, height: 36, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dateBtn: {
    flex: 1, height: 36, borderWidth: 1,
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  },
  labelSmall: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.value, letterSpacing: Ls.xs_02, textTransform: 'uppercase' },
  dateLabel: { fontFamily: FontMono, fontSize: Fs.lg, fontWeight: Fw.value, letterSpacing: Ls.sm_015, textTransform: 'uppercase' },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  calendar: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -132,
    marginTop: -160,
    width: 264,
    borderWidth: 1,
    padding: 12,
  },
  monthHeader: { justifyContent: 'space-between', marginBottom: 8 },
  monthBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: '800', letterSpacing: Ls.md_02, textTransform: 'uppercase' },

  daysRow: { flexDirection: 'row', marginBottom: 4 },
  dayHeader: { width: CELL_SIZE, textAlign: 'center', fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, letterSpacing: Ls.sm_02 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center' },
  cellEmpty: { width: CELL_SIZE, height: CELL_SIZE },
  cellText: { fontFamily: FontMono, fontSize: Fs.lg },
});
