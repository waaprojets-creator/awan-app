import React, { useEffect, useState, useCallback } from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Rect, G, Line, Path, Circle, Text as SvgText } from 'react-native-svg';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  startOfMonth,
  endOfMonth,
  getISOWeek,
  getYear,
  startOfYear,
  endOfYear,
  addYears,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { Touch } from '@/components/ui/Touch';
import { Heading } from '@/components/ui/Heading';
import { SleepService } from '@/services/sleepService';
import { WorkoutService } from '@/services/workoutService';
import { getStorage } from '@/data/storage/storageService';
import { migrateMealEntry } from '@/data/schemas/nutrition/mealEntry';
import { migratePrayerLog, PRAYER_NAMES } from '@/data/schemas/islam/prayerLog';
import type { PrayerLogLatest } from '@/data/schemas/islam/prayerLog';
import type { MealEntryLatest } from '@/data/schemas/nutrition/mealEntry';
import type { SleepEntryLatest } from '@/data/schemas/sleep/sleepEntry';
import type { WorkoutSessionLatest } from '@/data/schemas/sport/routine';
import { ds } from '@/utils/storage';

// ─── SVG aliased wrappers (avoid implicit any on SVG elements) ────────────────
const SvgRect = Rect as any;
const SvgG = G as any;
const SvgLine = Line as any;
const SvgPath = Path as any;
const SvgCircle = Circle as any;
const SvgTextEl = SvgText as any;

// ─── Types ────────────────────────────────────────────────────────────────────
type TimeView = 'jour' | 'semaine' | 'mois' | 'annee';
type LayerKey = 'sommeil' | 'islam' | 'nutrition' | 'travail' | 'sport' | 'trajet' | 'libre';

interface DayLayers {
  date: string;
  sommeilH: number;
  islamH: number;
  nutritionH: number;
  travailH: number;
  sportH: number;
  trajetH: number;
  libreH: number;
}

interface DaySlot {
  startMin: number;
  durationMin: number;
  layer: LayerKey;
}

interface AllData {
  sessions: WorkoutSessionLatest[];
  sleepByDate: Record<string, SleepEntryLatest>;
  mealsByDate: Record<string, MealEntryLatest[]>;
  prayersByDate: Record<string, PrayerLogLatest>;
}

// ─── Layer definitions ────────────────────────────────────────────────────────
const LAYERS: { key: LayerKey; label: string; color: string }[] = [
  { key: 'sommeil',   label: 'SOMMEIL',       color: 'var(--color-awan-status-info)' },
  { key: 'islam',     label: 'ISLAM',          color: 'var(--color-awan-status-spirit)' },
  { key: 'nutrition', label: 'NUTRITION',      color: 'var(--color-awan-status-ok)' },
  { key: 'travail',   label: 'TRAVAIL',        color: 'var(--color-awan-tx-dim)' },
  { key: 'sport',     label: 'SPORT',          color: 'var(--color-awan-status-warn)' },
  { key: 'trajet',    label: 'TRAJETS (V5)',   color: 'var(--color-awan-tx-mute)' },
  { key: 'libre',     label: 'TEMPS LIBRE',    color: 'var(--color-awan-border)' },
];

// ─── Canonical times (minutes from midnight) ─────────────────────────────────
const PRAYER_TIMES: Record<string, number> = {
  fajr: 300, dhuhr: 750, asr: 930, maghrib: 1110, isha: 1230,
};
const MEAL_TIMES: Record<string, number> = {
  suhoor: 300, dejeuner: 750, diner: 1140, collation: 960,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function hhmmToMin(hhmm: string): number {
  const parts = hhmm.split(':').map(Number);
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

function computeDayLayers(date: string, data: AllData): DayLayers {
  const sleep = data.sleepByDate[date];
  const sommeilH = sleep?.durationH ?? 0;

  const prayers = data.prayersByDate[date];
  const donePrayers = prayers
    ? PRAYER_NAMES.filter(p => prayers.prayers[p]).length
    : 0;
  const islamH = donePrayers * 0.25;

  const meals = data.mealsByDate[date] ?? [];
  const nutritionH = meals.length * 0.5;

  const travailH = 0;

  const daySessions = data.sessions.filter(s => s.date === date);
  const sportH = daySessions.reduce((sum, s) => sum + s.duration / 3600, 0);

  const trajetH = 0; // V5 — GPS tracker

  const total = sommeilH + islamH + nutritionH + travailH + sportH + trajetH;
  const libreH = Math.max(0, 24 - total);

  return { date, sommeilH, islamH, nutritionH, travailH, sportH, trajetH, libreH };
}

function computeDaySlots(date: string, data: AllData): DaySlot[] {
  const slots: DaySlot[] = [];

  // Sleep
  const sleep = data.sleepByDate[date];
  if (sleep && sleep.durationH > 0) {
    const durationMin = Math.round(sleep.durationH * 60);
    const wakeMin = sleep.wakeTime ? hhmmToMin(sleep.wakeTime) : 420;
    let bedMin = wakeMin - durationMin;
    if (bedMin < 0) bedMin += 1440;
    slots.push({ startMin: bedMin, durationMin, layer: 'sommeil' });
  }

  // Prayers
  const prayers = data.prayersByDate[date];
  if (prayers) {
    PRAYER_NAMES.forEach(p => {
      if (prayers.prayers[p]) {
        slots.push({
          startMin: PRAYER_TIMES[p] ?? 0,
          durationMin: 15,
          layer: 'islam',
        });
      }
    });
  }

  // Meals
  const meals = data.mealsByDate[date] ?? [];
  meals.forEach(meal => {
    let startMin: number;
    if (meal.timeHHMM) {
      startMin = hhmmToMin(meal.timeHHMM);
    } else {
      const mealType = meal.meal ?? (meal.mealLabel as string | undefined) ?? '';
      startMin = MEAL_TIMES[mealType] ?? MEAL_TIMES['dejeuner'] ?? 750;
    }
    slots.push({ startMin, durationMin: 30, layer: 'nutrition' });
  });

  // Workouts
  data.sessions
    .filter(s => s.date === date)
    .forEach(s => {
      const d = new Date(s.startTime);
      const startMin = d.getHours() * 60 + d.getMinutes();
      const durationMin = Math.round(s.duration / 60);
      slots.push({ startMin, durationMin, layer: 'sport' });
    });

  return slots;
}

// ─── Period computation ───────────────────────────────────────────────────────
function computePeriod(view: TimeView, offset: number): { label: string; days: string[] } {
  const today = new Date();

  if (view === 'jour') {
    const d = addDays(today, offset);
    const label = format(d, 'EEE d MMM', { locale: fr }).toUpperCase();
    return { label, days: [ds(d)] };
  }

  if (view === 'semaine') {
    const base = addWeeks(today, offset);
    const start = startOfWeek(base, { weekStartsOn: 1 });
    const end = endOfWeek(base, { weekStartsOn: 1 });
    const weekNum = getISOWeek(start);
    const startLabel = format(start, 'd', { locale: fr });
    const endLabel = format(end, 'd MMM', { locale: fr }).toUpperCase();
    const label = `SEM ${weekNum} · ${startLabel}–${endLabel}`;
    const days = eachDayOfInterval({ start, end }).map(d => ds(d));
    return { label, days };
  }

  if (view === 'mois') {
    const base = addMonths(today, offset);
    const start = startOfMonth(base);
    const end = endOfMonth(base);
    const label = format(base, 'MMMM yyyy', { locale: fr }).toUpperCase();
    const days = eachDayOfInterval({ start, end }).map(d => ds(d));
    return { label, days };
  }

  // annee
  const base = addYears(today, offset);
  const start = startOfYear(base);
  const end = endOfYear(base);
  const label = String(getYear(base));
  const days = eachDayOfInterval({ start, end }).map(d => ds(d));
  return { label, days };
}

// ─── ClockPie chart (JOUR) ────────────────────────────────────────────────────
interface ClockPieProps {
  slots: DaySlot[];
  date: string;
}

function ClockPie({ slots, date }: ClockPieProps) {
  const screenW = Dimensions.get('window').width;
  const size = Math.min(screenW - 48, 300);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 20;
  const innerR = outerR * 0.55;

  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const layerColorMap: Record<LayerKey, string> = Object.fromEntries(
    LAYERS.map(l => [l.key, l.color]),
  ) as Record<LayerKey, string>;

  function arcPath(startMin: number, durationMin: number): string {
    const startAngle = (startMin / 1440) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((startMin + durationMin) / 1440) * 2 * Math.PI - Math.PI / 2;
    const x1outer = cx + outerR * Math.cos(startAngle);
    const y1outer = cy + outerR * Math.sin(startAngle);
    const x2outer = cx + outerR * Math.cos(endAngle);
    const y2outer = cy + outerR * Math.sin(endAngle);
    const x1inner = cx + innerR * Math.cos(startAngle);
    const y1inner = cy + innerR * Math.sin(startAngle);
    const x2inner = cx + innerR * Math.cos(endAngle);
    const y2inner = cy + innerR * Math.sin(endAngle);
    const largeArc = durationMin > 720 ? 1 : 0;
    return `M ${x1inner} ${y1inner} L ${x1outer} ${y1outer} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2outer} ${y2outer} L ${x2inner} ${y2inner} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1inner} ${y1inner} Z`;
  }

  const tickOuter = outerR + 2;

  return (
    <View style={{ alignItems: 'center', marginVertical: 12 }}>
      <View style={{ position: 'relative', width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <SvgCircle
            cx={cx}
            cy={cy}
            r={outerR}
            fill="var(--color-awan-border-soft)"
          />
          {/* Inner hole */}
          <SvgCircle
            cx={cx}
            cy={cy}
            r={innerR}
            fill="var(--color-awan-bg)"
          />

          {/* Tick marks */}
          {Array.from({ length: 24 }, (_, h) => {
            const angle = (h / 24) * 2 * Math.PI - Math.PI / 2;
            const isMajor = h % 6 === 0;
            const tickLen = isMajor ? 8 : 3;
            const r1 = tickOuter;
            const r2 = tickOuter - tickLen;
            const x1 = cx + r1 * Math.cos(angle);
            const y1 = cy + r1 * Math.sin(angle);
            const x2 = cx + r2 * Math.cos(angle);
            const y2 = cy + r2 * Math.sin(angle);
            return (
              <SvgLine
                key={h}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--color-awan-border)"
                strokeWidth={isMajor ? 1.5 : 0.5}
              />
            );
          })}

          {/* Hour labels at 0, 6, 12, 18 */}
          {[0, 6, 12, 18].map(h => {
            const angle = (h / 24) * 2 * Math.PI - Math.PI / 2;
            const labelR = tickOuter + 10;
            const lx = cx + labelR * Math.cos(angle);
            const ly = cy + labelR * Math.sin(angle);
            return (
              <SvgTextEl
                key={h}
                x={lx}
                y={ly + 4}
                textAnchor="middle"
                fontSize={9}
                fontFamily="var(--font-mono)"
                fill="var(--color-awan-tx-dim)"
              >
                {`${h}H`}
              </SvgTextEl>
            );
          })}

          {/* Slots */}
          {slots.map((slot, i) => (
            <SvgPath
              key={i}
              d={arcPath(slot.startMin, slot.durationMin)}
              fill={layerColorMap[slot.layer]}
              opacity={0.9}
            />
          ))}
        </Svg>

        {/* Center overlay */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          pointerEvents="none"
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-awan-tx-mute)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            {format(parseISO(date), 'd MMM', { locale: fr }).toUpperCase()}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 16,
              fontWeight: 'bold',
              color: 'var(--color-awan-tx)',
              letterSpacing: '0.1em',
              marginTop: 2,
            }}
          >
            {currentTimeStr}
          </span>
        </View>
      </View>
    </View>
  );
}

// ─── StackedBars chart (SEMAINE / MOIS) ──────────────────────────────────────
interface StackedBarsProps {
  days: string[];
  dayLayersList: DayLayers[];
  activeBar: number | null;
  onBarPress: (i: number) => void;
  view: 'semaine' | 'mois';
}

function StackedBars({ days, dayLayersList, activeBar, onBarPress, view }: StackedBarsProps) {
  const screenW = Dimensions.get('window').width;
  const width = screenW - 48;
  const height = 220;
  const padTop = 10;
  const padBottom = 20;
  const padLeft = 28;
  const chartH = height - padTop - padBottom;
  const chartW = width - padLeft;

  const layerColorMap: Record<LayerKey, string> = Object.fromEntries(
    LAYERS.map(l => [l.key, l.color]),
  ) as Record<LayerKey, string>;

  const barSpacing = chartW / days.length;
  const barWidth = Math.max(2, barSpacing - (view === 'mois' ? 1 : 3));

  function getLayerH(dl: DayLayers, key: LayerKey): number {
    return dl[`${key}H` as keyof DayLayers] as number;
  }

  return (
    <View style={{ position: 'relative', width, height }}>
      <Svg width={width} height={height}>
        {/* Y axis labels */}
        {['24H', '12H', '0H'].map((label, i) => {
          const frac = i === 0 ? 1 : i === 1 ? 0.5 : 0;
          const y = padTop + chartH - frac * chartH;
          return (
            <SvgTextEl
              key={label}
              x={padLeft - 4}
              y={y + 4}
              textAnchor="end"
              fontSize={8}
              fontFamily="var(--font-mono)"
              fill="var(--color-awan-tx-mute)"
            >
              {label}
            </SvgTextEl>
          );
        })}

        {/* Gridlines at 0, 12, 24h */}
        {[0, 0.5, 1].map((frac, i) => {
          const y = padTop + chartH - frac * chartH;
          return (
            <SvgLine
              key={i}
              x1={padLeft}
              y1={y}
              x2={width}
              y2={y}
              stroke="var(--color-awan-border-soft)"
              strokeWidth={1}
            />
          );
        })}

        {/* Bars */}
        {days.map((date, i) => {
          const dl = dayLayersList[i];
          if (!dl) return null;
          const x = padLeft + i * barSpacing + (barSpacing - barWidth) / 2;
          const opacity = activeBar === null || activeBar === i ? 1 : 0.3;
          let cumulativeH = 0;
          const rects: React.ReactNode[] = [];

          LAYERS.forEach(layer => {
            const lh = getLayerH(dl, layer.key);
            if (lh <= 0) return;
            const barH = (lh / 24) * chartH;
            const y = padTop + chartH - ((cumulativeH + lh) / 24) * chartH;
            rects.push(
              <SvgRect
                key={layer.key}
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                fill={layer.color}
                opacity={opacity}
              />,
            );
            cumulativeH += lh;
          });

          return (
            <SvgG key={i}>
              {rects}
            </SvgG>
          );
        })}

        {/* X axis labels */}
        {days.map((date, i) => {
          // For mois: only show every 5th; for semaine: show all
          const showLabel = view === 'semaine' || i % 5 === 0 || i === days.length - 1;
          if (!showLabel) return null;
          const x = padLeft + i * barSpacing + barSpacing / 2;
          const label = view === 'semaine'
            ? format(parseISO(date), 'EEE', { locale: fr }).slice(0, 3).toUpperCase()
            : format(parseISO(date), 'dd', { locale: fr });
          return (
            <SvgTextEl
              key={i}
              x={x}
              y={height - 4}
              textAnchor="middle"
              fontSize={8}
              fontFamily="var(--font-mono)"
              fill="var(--color-awan-tx-mute)"
            >
              {label}
            </SvgTextEl>
          );
        })}
      </Svg>

      {/* Invisible hit areas for bar press */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: padLeft,
          right: 0,
          bottom: padBottom,
          flexDirection: 'row',
        }}
      >
        {days.map((_, i) => (
          <Touch
            key={i}
            style={{ flex: 1, height: '100%' }}
            onPress={() => onBarPress(i)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── StackedArea chart (ANNÉE) ────────────────────────────────────────────────
interface StackedAreaProps {
  days: string[];
  dayLayersList: DayLayers[];
}

function StackedArea({ days, dayLayersList }: StackedAreaProps) {
  const screenW = Dimensions.get('window').width;
  const width = screenW - 48;
  const height = 220;
  const padTop = 10;
  const padBottom = 20;
  const padLeft = 32;
  const chartH = height - padTop - padBottom;
  const chartW = width - padLeft;

  // Group into 52 weeks
  const WEEKS = 52;
  const weekSize = 7;
  const weekData: DayLayers[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const slice = dayLayersList.slice(w * weekSize, (w + 1) * weekSize);
    if (slice.length > 0) weekData.push(slice);
  }
  const totalWeeks = weekData.length;

  // For each week, compute summed layer hours
  function weekSum(wData: DayLayers[], key: LayerKey): number {
    return wData.reduce((s, d) => s + (d[`${key}H` as keyof DayLayers] as number), 0);
  }

  const maxH = 24 * 7; // 168h

  function xFor(w: number): number {
    return padLeft + (w / (totalWeeks - 1 || 1)) * chartW;
  }

  function yFor(cumH: number): number {
    return padTop + chartH - (cumH / maxH) * chartH;
  }

  // Build stacked polygon paths for each layer
  const paths: { color: string; d: string }[] = [];
  const stackedTops: number[][] = Array.from({ length: totalWeeks }, () => []);

  // Compute cumulative stacks
  const cumulativeByWeek: number[] = new Array(totalWeeks).fill(0);

  const layerPolygons: { key: LayerKey; color: string; points: { x: number; yTop: number; yBot: number }[] }[] = [];

  LAYERS.forEach(layer => {
    const poly: { x: number; yTop: number; yBot: number }[] = [];
    for (let w = 0; w < totalWeeks; w++) {
      const wData = weekData[w];
      const lh = wData ? weekSum(wData, layer.key) : 0;
      const bot = cumulativeByWeek[w] ?? 0;
      const top = bot + lh;
      poly.push({ x: xFor(w), yTop: yFor(top), yBot: yFor(bot) });
      cumulativeByWeek[w] = top;
    }
    layerPolygons.push({ key: layer.key, color: layer.color, points: poly });
  });

  // Build SVG paths for each layer (filled polygon)
  layerPolygons.forEach(lp => {
    if (lp.points.length === 0) return;
    // Top edge left→right
    const first = lp.points[0];
    if (!first) return;
    let d = `M ${first.x} ${first.yTop}`;
    for (let i = 1; i < lp.points.length; i++) {
      const pt = lp.points[i];
      if (pt) d += ` L ${pt.x} ${pt.yTop}`;
    }
    // Bottom edge right→left
    for (let i = lp.points.length - 1; i >= 0; i--) {
      const pt = lp.points[i];
      if (pt) d += ` L ${pt.x} ${pt.yBot}`;
    }
    d += ' Z';
    paths.push({ color: lp.color, d });
  });

  // Month labels: find which week index each month starts at
  const monthLabels: { x: number; label: string }[] = [];
  const seenMonths = new Set<string>();
  days.forEach((date, di) => {
    const w = Math.floor(di / weekSize);
    if (w >= totalWeeks) return;
    const monthKey = format(parseISO(date), 'yyyy-MM');
    if (!seenMonths.has(monthKey)) {
      seenMonths.add(monthKey);
      const x = padLeft + (w / (totalWeeks - 1 || 1)) * chartW;
      monthLabels.push({
        x,
        label: format(parseISO(date), 'MMM', { locale: fr }).toUpperCase().slice(0, 3),
      });
    }
  });

  return (
    <Svg width={width} height={height}>
      {/* Y axis labels */}
      {[
        { label: '168H', frac: 1 },
        { label: '84H', frac: 0.5 },
        { label: '0H', frac: 0 },
      ].map(({ label, frac }) => {
        const y = padTop + chartH - frac * chartH;
        return (
          <SvgTextEl
            key={label}
            x={padLeft - 4}
            y={y + 4}
            textAnchor="end"
            fontSize={8}
            fontFamily="var(--font-mono)"
            fill="var(--color-awan-tx-mute)"
          >
            {label}
          </SvgTextEl>
        );
      })}

      {/* Gridlines */}
      {[0, 0.5, 1].map((frac, i) => {
        const y = padTop + chartH - frac * chartH;
        return (
          <SvgLine
            key={i}
            x1={padLeft}
            y1={y}
            x2={width}
            y2={y}
            stroke="var(--color-awan-border-soft)"
            strokeWidth={1}
          />
        );
      })}

      {/* Area layers */}
      {paths.map((p, i) => (
        <SvgPath key={i} d={p.d} fill={p.color} opacity={0.8} />
      ))}

      {/* Month labels */}
      {monthLabels.map((ml, i) => (
        <SvgTextEl
          key={i}
          x={ml.x}
          y={height - 4}
          textAnchor="middle"
          fontSize={8}
          fontFamily="var(--font-mono)"
          fill="var(--color-awan-tx-mute)"
        >
          {ml.label}
        </SvgTextEl>
      ))}
    </Svg>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
interface LegendProps {
  dayLayersList: DayLayers[];
  activeBar: number | null;
  view: TimeView;
}

function Legend({ dayLayersList, activeBar, view }: LegendProps) {
  function getValue(key: LayerKey): number {
    if (view === 'annee') {
      // Always global
      return dayLayersList.reduce((s, d) => s + (d[`${key}H` as keyof DayLayers] as number), 0);
    }
    if (activeBar !== null && dayLayersList[activeBar]) {
      return (dayLayersList[activeBar][`${key}H` as keyof DayLayers] as number);
    }
    return dayLayersList.reduce((s, d) => s + (d[`${key}H` as keyof DayLayers] as number), 0);
  }

  return (
    <View style={{ marginTop: 16 }}>
      {LAYERS.map(layer => {
        const val = getValue(layer.key);
        const label = layer.label;
        return (
          <View
            key={layer.key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 6,
              paddingBottom: 6,
              borderBottomWidth: 1,
              borderBottomColor: 'var(--color-awan-border-soft)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: layer.color,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--color-awan-tx-dim)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </span>
            </View>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 'bold',
                color: 'var(--color-awan-tx)',
                letterSpacing: '0.05em',
              }}
            >
              {val.toFixed(1)}H
            </span>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TempsTab() {
  const [view, setView] = useState<TimeView>('semaine');
  const [offset, setOffset] = useState(0);
  const [allData, setAllData] = useState<AllData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBar, setActiveBar] = useState<number | null>(null);

  // Load all data once
  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const [sessions, sleepEntries, storage] = await Promise.all([
          WorkoutService.getAllSessions(),
          SleepService.getAll(),
          getStorage(),
        ]);

        const sleepByDate: Record<string, SleepEntryLatest> = {};
        sleepEntries.forEach(e => { sleepByDate[e.date] = e; });

        // Load meals
        const mealKeys = await storage.list('nutrition.meal');
        const mealEntries = await Promise.all(
          mealKeys.map(k => storage.get(k, migrateMealEntry)),
        );
        const mealsByDate: Record<string, MealEntryLatest[]> = {};
        mealEntries.forEach(e => {
          if (!e) return;
          if (!mealsByDate[e.date]) mealsByDate[e.date] = [];
          (mealsByDate[e.date] as MealEntryLatest[]).push(e);
        });

        // Load prayers
        const prayerKeys = await storage.list('islam.prayer');
        const prayerEntries = await Promise.all(
          prayerKeys.map(k => storage.get(k, migratePrayerLog)),
        );
        const prayersByDate: Record<string, PrayerLogLatest> = {};
        prayerEntries.forEach(e => {
          if (!e) return;
          prayersByDate[e.date] = e;
        });

        if (!active) return;
        setAllData({ sessions, sleepByDate, mealsByDate, prayersByDate });
      } catch (_) {
        // silently fail — show empty state
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  const period = computePeriod(view, offset);

  const dayLayersList: DayLayers[] = allData
    ? period.days.map(date => computeDayLayers(date, allData))
    : period.days.map(date => ({
        date,
        sommeilH: 0, islamH: 0, nutritionH: 0, travailH: 0, sportH: 0, trajetH: 0, libreH: 24,
      }));

  const daySlots: DaySlot[] =
    allData && view === 'jour' && period.days[0]
      ? computeDaySlots(period.days[0], allData)
      : [];

  const handlePrev = useCallback(() => {
    setOffset(o => o - 1);
    setActiveBar(null);
  }, []);

  const handleNext = useCallback(() => {
    setOffset(o => Math.min(0, o + 1));
    setActiveBar(null);
  }, []);

  const handleViewChange = useCallback((v: TimeView) => {
    setView(v);
    setOffset(0);
    setActiveBar(null);
  }, []);

  const handleBarPress = useCallback((i: number) => {
    setActiveBar(prev => (prev === i ? null : i));
  }, []);

  const handleResetActiveBar = useCallback(() => {
    setActiveBar(null);
  }, []);

  const canGoForward = offset < 0;

  const VIEW_LABELS: Record<TimeView, string> = {
    jour: 'JOUR',
    semaine: 'SEMAINE',
    mois: 'MOIS',
    annee: 'ANNÉE',
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Sub-view selector */}
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          marginBottom: 16,
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        {(Object.keys(VIEW_LABELS) as TimeView[]).map(v => {
          const isActive = view === v;
          return (
            <Touch
              key={v}
              onPress={() => handleViewChange(v)}
              style={{
                flex: 1,
                paddingTop: 8,
                paddingBottom: 8,
                alignItems: 'center',
                justifyContent: 'center',
                border: isActive
                  ? '1px solid var(--color-awan-gold)'
                  : '1px solid var(--color-awan-border)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 'bold',
                  letterSpacing: '0.1em',
                  color: isActive
                    ? 'var(--color-awan-gold)'
                    : 'var(--color-awan-tx-mute)',
                }}
              >
                {VIEW_LABELS[v]}
              </span>
            </Touch>
          );
        })}
      </View>

      {/* Period navigator */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 24,
          paddingRight: 24,
          marginBottom: 16,
        }}
      >
        <Touch onPress={handlePrev} style={{ padding: 8 }}>
          <ChevronLeft size={18} color="var(--color-awan-tx-dim)" />
        </Touch>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 'bold',
            color: 'var(--color-awan-tx)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            flex: 1,
            textAlign: 'center',
          }}
        >
          {period.label}
        </span>
        <Touch
          onPress={handleNext}
          disabled={!canGoForward}
          style={{ padding: 8, opacity: canGoForward ? 1 : 0.3 }}
        >
          <ChevronRight size={18} color="var(--color-awan-tx-dim)" />
        </Touch>
      </View>

      {/* Chart card */}
      <View style={{ paddingLeft: 24, paddingRight: 24 }}>
        <Card variant="flat">
          <Touch onPress={handleResetActiveBar} style={{ width: '100%' }}>
            <Heading level={4} mono subtitle="Répartition du temps">
              TEMPS · {VIEW_LABELS[view]}
            </Heading>
          </Touch>

          {loading ? (
            <View
              style={{
                height: 220,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--color-awan-tx-mute)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                }}
              >
                CHARGEMENT...
              </span>
            </View>
          ) : (
            <>
              {view === 'jour' && period.days[0] && (
                <ClockPie slots={daySlots} date={period.days[0]} />
              )}

              {(view === 'semaine' || view === 'mois') && (
                <StackedBars
                  days={period.days}
                  dayLayersList={dayLayersList}
                  activeBar={activeBar}
                  onBarPress={handleBarPress}
                  view={view}
                />
              )}

              {view === 'annee' && (
                <StackedArea
                  days={period.days}
                  dayLayersList={dayLayersList}
                />
              )}

              <Legend
                dayLayersList={dayLayersList}
                activeBar={activeBar}
                view={view}
              />
            </>
          )}
        </Card>
      </View>
    </View>
  );
}
