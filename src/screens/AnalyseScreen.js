import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, G, Rect } from 'react-native-svg';
import { T, CATS } from '../constants/theme';
import { ds, parseDate } from '../utils/storage';
import { eventsForDate } from '../utils/recurrence';
import { useAppState } from '../context/AppStateContext';

const PERIODS = [
  { key: '7', label: '7 jours', days: 7 },
  { key: '30', label: '30 jours', days: 30 },
  { key: '90', label: '90 jours', days: 90 },
  { key: '365', label: '1 an', days: 365 },
];

const FREE_KEY = '_free';
const FREE_COLOR = T.bg3;
const FREE_LABEL = 'Temps libre';

const TABS = ['Jour', 'Semaine', 'Mois', 'Long terme'];

// ---------------------------------------------------------------
// Helpers analytiques : convertir événements/routines d'un jour en
// répartition de minutes par catégorie (sur 1440 min = 24h).
// ---------------------------------------------------------------
function minutesByCategoryForDate(db, dateStr) {
  const evs = eventsForDate(db, dateStr);
  const totals = {}; // {catKey: minutes}
  let occupied = 0;

  evs.forEach(ev => {
    if (!ev.time) return; // ignore les événements sans heure
    const dur = ev.duration || 30;
    const cat = ev.category || 'perso';
    totals[cat] = (totals[cat] || 0) + dur;
    occupied += dur;
  });

  const free = Math.max(0, 1440 - occupied);
  totals[FREE_KEY] = free;
  return totals; // total = 1440
}

function getColorForKey(key) {
  if (key === FREE_KEY) return FREE_COLOR;
  return CATS[key]?.c || T.gold;
}

function getLabelForKey(key) {
  if (key === FREE_KEY) return FREE_LABEL;
  return CATS[key]?.l || key;
}

// ---------------------------------------------------------------
// Composant camembert SVG
// ---------------------------------------------------------------
function PieChart({ data, size = 180 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={size/2} cy={size/2} r={size/2 - 2} fill={T.bg3} />
      </Svg>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  let cumulative = 0;
  const slices = data.filter(d => d.value > 0).map(d => {
    const startAngle = (cumulative / total) * 2 * Math.PI;
    cumulative += d.value;
    const endAngle = (cumulative / total) * 2 * Math.PI;
    return { ...d, startAngle, endAngle };
  });

  return (
    <Svg width={size} height={size}>
      {slices.map((sl, i) => {
        if (slices.length === 1) {
          return <Circle key={i} cx={cx} cy={cy} r={r} fill={sl.color} />;
        }
        const x1 = cx + r * Math.sin(sl.startAngle);
        const y1 = cy - r * Math.cos(sl.startAngle);
        const x2 = cx + r * Math.sin(sl.endAngle);
        const y2 = cy - r * Math.cos(sl.endAngle);
        const largeArc = sl.endAngle - sl.startAngle > Math.PI ? 1 : 0;
        const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        return <Path key={i} d={d} fill={sl.color} />;
      })}
      <Circle cx={cx} cy={cy} r={r * 0.32} fill={T.bg} />
    </Svg>
  );
}

// ---------------------------------------------------------------
// Composant colonne timeline (vue hebdo : une colonne = un jour)
// ---------------------------------------------------------------
function DayColumn({ totals, label, dateStr, isToday, width = 38, height = 240 }) {
  const total = 1440;
  let cumulative = 0;
  const segments = Object.entries(totals).map(([key, value]) => {
    const y = (cumulative / total) * height;
    const h = (value / total) * height;
    cumulative += value;
    return { key, y, h, color: getColorForKey(key) };
  });

  return (
    <View style={{ alignItems: 'center', width: width + 6 }}>
      <Text style={[s.colDay, isToday && { color: T.gold, fontWeight: '700' }]}>{label}</Text>
      <Svg width={width} height={height}>
        {segments.map((sg, i) => (
          sg.h > 0 ? <Rect key={i} x={0} y={sg.y} width={width} height={sg.h} fill={sg.color} /> : null
        ))}
      </Svg>
      <Text style={s.colDate}>{dateStr.slice(8)}</Text>
    </View>
  );
}

// ---------------------------------------------------------------
// Composant légende (liste % à côté d'un camembert)
// ---------------------------------------------------------------
function Legend({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <Text style={s.empty}>Aucune donnée</Text>;
  }
  return (
    <View style={{ marginTop: 12 }}>
      {data.filter(d => d.value > 0).map(d => {
        const pct = ((d.value / total) * 100).toFixed(1);
        const hours = Math.floor(d.value / 60);
        const mins = d.value % 60;
        const timeLbl = hours > 0 ? `${hours}h${mins > 0 ? String(mins).padStart(2,'0') : ''}` : `${mins}min`;
        return (
          <View key={d.key} style={s.legRow}>
            <View style={[s.legDot, { backgroundColor: d.color }]} />
            <Text style={s.legLbl}>{d.label}</Text>
            <Text style={s.legPct}>{pct}%</Text>
            <Text style={s.legTime}>{timeLbl}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------
// Écran principal
// ---------------------------------------------------------------
export default function AnalyseScreen() {
  const insets = useSafeAreaInsets();
  const { db } = useAppState();
  const [tab, setTab] = useState(0);
  const [dayDate, setDayDate] = useState(new Date());
  const [weekDate, setWeekDate] = useState(new Date());

  const dayData = useMemo(() => {
    if (!db) return [];
    const dstr = ds(dayDate);
    const totals = minutesByCategoryForDate(db, dstr);
    return Object.entries(totals).map(([key, value]) => ({
      key, value, color: getColorForKey(key), label: getLabelForKey(key),
    }));
  }, [db, dayDate]);

  const weekData = useMemo(() => {
    if (!db) return null;
    const d = new Date(weekDate);
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const mon = new Date(d); mon.setDate(d.getDate() - dow);

    const days = [];
    const aggregated = {};
    for (let i = 0; i < 7; i++) {
      const day = new Date(mon); day.setDate(mon.getDate() + i);
      const dstr = ds(day);
      const totals = minutesByCategoryForDate(db, dstr);
      days.push({ date: day, dstr, totals });
      Object.entries(totals).forEach(([k, v]) => {
        aggregated[k] = (aggregated[k] || 0) + v;
      });
    }
    const aggregatedArr = Object.entries(aggregated).map(([key, value]) => ({
      key, value, color: getColorForKey(key), label: getLabelForKey(key),
    }));
    return { days, aggregated: aggregatedArr, monday: mon };
  }, [db, weekDate]);

  const stats = useMemo(() => {
    if (!db) return null;
    const today = new Date();
    const result = {};

    for (const period of PERIODS) {
      let evCount = 0;
      let rtCount = 0;
      for (let i = 0; i < period.days; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = ds(d);
        const events = eventsForDate(db, dateStr);
        evCount += events.filter(e => !e.isRt).length;
        rtCount += events.filter(e => e.isRt).length;
      }
      result[period.key] = { events: evCount, routines: rtCount };
    }

    return result;
  }, [db]);

  const totals = useMemo(() => {
    if (!db) return { events: 0, tasks: 0, routines: 0, tasksDone: 0 };
    return {
      events: (db.events || []).length,
      tasks: (db.tasks || []).length,
      tasksDone: (db.tasks || []).filter(t => t.done).length,
      routines: (db.routines || []).length,
    };
  }, [db]);

  if (!db) {
    return (
      <View style={[s.container, { paddingTop: insets.top + 40 }]}>
        <Text style={s.headerTitle}>Analyse</Text>
        <Text style={s.empty}>Chargement…</Text>
      </View>
    );
  }

  function renderDay() {
    const dateLbl = dayDate.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    return (
      <View>
        <View style={s.dateNav}>
          <TouchableOpacity style={s.navBtn} onPress={() => setDayDate(new Date(dayDate.getTime() - 86400000))}>
            <Text style={s.navTx}>‹</Text>
          </TouchableOpacity>
          <Text style={s.dateLbl}>{dateLbl}</Text>
          <TouchableOpacity style={s.navBtn} onPress={() => setDayDate(new Date(dayDate.getTime() + 86400000))}>
            <Text style={s.navTx}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={s.pieWrap}>
          <PieChart data={dayData} size={200} />
        </View>

        <Legend data={dayData} />
      </View>
    );
  }

  function renderWeek() {
    if (!weekData) return null;
    const { days, aggregated, monday } = weekData;
    const sun = new Date(monday); sun.setDate(monday.getDate() + 6);
    const lbl = monday.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})
      + ' — ' + sun.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'});
    const todayStr = ds(new Date());
    const dayLetters = ['L','M','M','J','V','S','D'];

    return (
      <View>
        <View style={s.dateNav}>
          <TouchableOpacity style={s.navBtn} onPress={() => setWeekDate(new Date(weekDate.getTime() - 7*86400000))}>
            <Text style={s.navTx}>‹</Text>
          </TouchableOpacity>
          <Text style={s.dateLbl}>{lbl}</Text>
          <TouchableOpacity style={s.navBtn} onPress={() => setWeekDate(new Date(weekDate.getTime() + 7*86400000))}>
            <Text style={s.navTx}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.subTitle}>Répartition par jour</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.colsRow}>
            {days.map((day, i) => {
              const isToday = day.dstr === todayStr;
              return (
                <DayColumn
                  key={i}
                  totals={day.totals}
                  label={dayLetters[i]}
                  dateStr={day.dstr}
                  isToday={isToday}
                />
              );
            })}
          </View>
        </ScrollView>

        <Text style={s.subTitle}>Synthèse de la semaine</Text>
        <View style={s.pieWrap}>
          <PieChart data={aggregated} size={200} />
        </View>
        <Legend data={aggregated} />
      </View>
    );
  }

  function renderMonth() {
    return (
      <View style={s.placeholder}>
        <Text style={s.placeholderTx}>Vue mensuelle à définir</Text>
        <Text style={s.placeholderSub}>
          Précise comment tu veux la voir : camembert mensuel, heatmap, évolution semaine par semaine, etc.
        </Text>
      </View>
    );
  }

  function renderLongTerm() {
    return (
      <View>
        <Text style={s.sectionTitle}>Totaux</Text>
        <View style={s.row}>
          <View style={s.card}>
            <Text style={s.cardN}>{totals.events}</Text>
            <Text style={s.cardL}>Événements</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardN}>{totals.routines}</Text>
            <Text style={s.cardL}>Routines</Text>
          </View>
        </View>
        <View style={s.row}>
          <View style={s.card}>
            <Text style={s.cardN}>{totals.tasks}</Text>
            <Text style={s.cardL}>Tâches</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardN}>{totals.tasksDone}</Text>
            <Text style={s.cardL}>Faites</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Activité par période (passée)</Text>
        {PERIODS.map(period => {
          const stat = stats?.[period.key] || { events: 0, routines: 0 };
          return (
            <View key={period.key} style={s.periodRow}>
              <Text style={s.periodLabel}>{period.label}</Text>
              <View style={s.periodStats}>
                <View style={s.miniStat}>
                  <Text style={s.miniN}>{stat.events}</Text>
                  <Text style={s.miniL}>évén.</Text>
                </View>
                <View style={s.miniStat}>
                  <Text style={s.miniN}>{stat.routines}</Text>
                  <Text style={s.miniL}>routines</Text>
                </View>
                <View style={s.miniStat}>
                  <Text style={s.miniN}>{stat.events + stat.routines}</Text>
                  <Text style={s.miniL}>total</Text>
                </View>
              </View>
            </View>
          );
        })}

        <View style={s.note}>
          <Text style={s.noteTx}>
            📊 Les graphiques détaillés arriveront dans les prochains sprints.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.header}>
        <Text style={s.headerTitle}>Analyse</Text>
        <Text style={s.headerSub}>Vue d'ensemble de ton activité</Text>
      </View>

      <View style={s.tabs}>
        {TABS.map((lbl, i) => (
          <TouchableOpacity
            key={i}
            style={[s.tab, tab === i && s.tabOn]}
            onPress={() => setTab(i)}
          >
            <Text style={[s.tabTx, tab === i && s.tabTxOn]}>{lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 0 && renderDay()}
      {tab === 1 && renderWeek()}
      {tab === 2 && renderMonth()}
      {tab === 3 && renderLongTerm()}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: T.bo, marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: T.tx },
  headerSub: { fontSize: 12, color: T.tx2, marginTop: 4 },

  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 16 },
  tab: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16,
    backgroundColor: T.bg3, borderWidth: 1, borderColor: T.bo,
  },
  tabOn: { backgroundColor: T.gold, borderColor: T.gold },
  tabTx: { fontSize: 12, color: T.tx2, fontWeight: '600' },
  tabTxOn: { color: T.bg, fontWeight: '700' },

  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 16,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.bg2, borderWidth: 1, borderColor: T.bo,
  },
  navTx: { fontSize: 22, color: T.tx, lineHeight: 26 },
  dateLbl: {
    flex: 1, textAlign: 'center', fontSize: 14, color: T.tx, fontWeight: '700',
    textTransform: 'capitalize',
  },

  pieWrap: { alignItems: 'center', marginVertical: 16 },

  legRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.bo,
  },
  legDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  legLbl: { flex: 1, fontSize: 13, color: T.tx, fontWeight: '600' },
  legPct: { fontSize: 13, color: T.tx, fontWeight: '700', marginRight: 12 },
  legTime: { fontSize: 11, color: T.tx2 },

  subTitle: {
    fontSize: 12, color: T.tx2, fontWeight: '700', textTransform: 'uppercase',
    paddingHorizontal: 20, marginTop: 8, marginBottom: 10, letterSpacing: 1,
  },
  colsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  colDay: { fontSize: 11, color: T.tx2, fontWeight: '600', marginBottom: 6 },
  colDate: { fontSize: 10, color: T.tx3, marginTop: 4 },

  sectionTitle: {
    fontSize: 12, color: T.tx2, fontWeight: '700', textTransform: 'uppercase',
    paddingHorizontal: 20, marginTop: 16, marginBottom: 10, letterSpacing: 1,
  },
  row: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 10 },
  card: {
    flex: 1, backgroundColor: T.bg2, borderWidth: 1, borderColor: T.bo,
    borderRadius: 12, padding: 16, alignItems: 'center',
  },
  cardN: { fontSize: 28, fontWeight: '700', color: T.tx },
  cardL: { fontSize: 11, color: T.tx2, marginTop: 4, textTransform: 'uppercase' },

  periodRow: {
    marginHorizontal: 16, marginBottom: 10, padding: 14,
    backgroundColor: T.bg2, borderWidth: 1, borderColor: T.bo, borderRadius: 12,
  },
  periodLabel: { fontSize: 13, color: T.tx, fontWeight: '700', marginBottom: 10 },
  periodStats: { flexDirection: 'row', gap: 12 },
  miniStat: { flex: 1, alignItems: 'center', paddingVertical: 6, backgroundColor: T.bg3, borderRadius: 8 },
  miniN: { fontSize: 18, fontWeight: '700', color: T.gold },
  miniL: { fontSize: 9, color: T.tx2, marginTop: 2, textTransform: 'uppercase' },

  note: {
    margin: 16, padding: 14, backgroundColor: T.bg3,
    borderRadius: 10, borderWidth: 1, borderColor: T.bo,
  },
  noteTx: { fontSize: 12, color: T.tx2, lineHeight: 18 },

  placeholder: { padding: 40, alignItems: 'center' },
  placeholderTx: { fontSize: 14, color: T.tx2, fontWeight: '600' },
  placeholderSub: { fontSize: 12, color: T.tx3, marginTop: 8, textAlign: 'center', lineHeight: 18 },

  empty: { padding: 40, textAlign: 'center', color: T.tx3 },
});
