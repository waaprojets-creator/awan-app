import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Touch } from './Touch';
import { useTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';

interface DateSelectPopupProps {
  value: string;              // YYYY-MM-DD
  onChange: (date: string) => void;
  max?: string;               // YYYY-MM-DD, defaults to today
  min?: string;               // YYYY-MM-DD, optional lower bound
  label?: string;             // override label above the date
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
  const [calMonth, setCalMonth] = useState(value.slice(0, 7)); // YYYY-MM

  const maxDate = max ?? localToday();
  const canNext = value < maxDate;
  const canPrev = min ? value > min : true;

  const [calY, calMStr] = calMonth.split('-');
  const calYear = parseInt(calY ?? '2026', 10);
  const calM = parseInt(calMStr ?? '1', 10) - 1; // 0-indexed

  const firstDay = new Date(calYear, calM, 1);
  const lastDay = new Date(calYear, calM + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0

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
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {/* Prev */}
        <Touch
          onPress={canPrev ? () => onChange(shift(value, -1)) : () => {}}
          disabled={!canPrev}
          style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: theme.surfaceDim, border: `1px solid ${theme.borderSoft}`,
            opacity: canPrev ? 1 : 0.3,
          }}
        >
          <ChevronLeft size={16} color={theme.selected} />
        </Touch>

        {/* Date label — clickable */}
        <Touch
          onPress={() => { setCalMonth(value.slice(0, 7)); setOpen(v => !v); }}
          style={{
            flex: 1, height: 36, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: theme.surfaceDim, border: `1px solid ${theme.borderSoft}`,
          }}
        >
          {label && (
            <span style={{ fontFamily: FontMono, fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: theme.mute, textTransform: 'uppercase' }}>
              {label}
            </span>
          )}
          <span style={{ fontFamily: FontMono, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: theme.selected, textTransform: 'uppercase' }}>
            {displayLabel}
          </span>
        </Touch>

        {/* Next */}
        <Touch
          onPress={canNext ? () => onChange(shift(value, 1)) : () => {}}
          disabled={!canNext}
          style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: theme.surfaceDim, border: `1px solid ${theme.borderSoft}`,
            opacity: canNext ? 1 : 0.3,
          }}
        >
          <ChevronRight size={16} color={canNext ? theme.selected : theme.mute} />
        </Touch>
      </div>

      {/* Calendar popup */}
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            marginTop: 4, zIndex: 999, width: 264,
            background: theme.surface, border: `1px solid ${theme.border}`,
            padding: 12,
          }}>
            {/* Month header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Touch onPress={prevMonth} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={13} color={theme.text} />
              </Touch>
              <span style={{ fontFamily: FontMono, fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: theme.title, textTransform: 'uppercase' }}>
                {MONTHS_FR[calM]} {calYear}
              </span>
              <Touch onPress={nextMonth} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={13} color={theme.text} />
              </Touch>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {DAYS_FR.map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontFamily: FontMono, fontSize: 9, fontWeight: 700, color: theme.mute, letterSpacing: '0.1em' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {cells.map((day, i) => {
                if (day === null) return <div key={i} style={{ height: 32 }} />;
                const ds = localDateStr(calYear, calM + 1, day);
                const isSel = ds === value;
                const isToday = ds === todayStr;
                const disabled = ds > maxDate || (!!min && ds < min);
                return (
                  <Touch
                    key={i}
                    onPress={disabled ? () => {} : () => selectDay(day)}
                    disabled={disabled}
                    style={{
                      height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isSel ? theme.selected : isToday ? 'rgba(212,175,55,0.12)' : 'transparent',
                      border: isToday && !isSel ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
                      opacity: disabled ? 0.22 : 1,
                    }}
                  >
                    <span style={{
                      fontFamily: FontMono, fontSize: 11,
                      fontWeight: isSel ? 800 : 400,
                      color: isSel ? '#000' : theme.title,
                    }}>
                      {day}
                    </span>
                  </Touch>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
