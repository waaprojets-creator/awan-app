import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { T, CATS } from '../constants/theme';
import { TRANSPORT_ICONS } from '../constants/icons';
import { L, DATE_FORMAT_BANNER, TRANSPORT_OPTIONS } from '../constants/labels';
import { useAppState } from '../context/AppStateContext';
import { ds } from '../utils/storage';
import { eventsForDate } from '../utils/recurrence';

/**
 * Dashboard — écran d'accueil avec widgets variés.
 * `navigate(route)` est passé en prop par MainLayout.
 */
export default function DashboardScreen({ navigate }) {
  const { db, cfg, updateCfg } = useAppState();
  const [transport, setTransport] = useState('car');

  // Synchronise le state local quand cfg arrive (chargement asynchrone)
  useEffect(() => {
    if (cfg?.transport && cfg.transport !== transport) {
      setTransport(cfg.transport);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg?.transport]);

  if (!db) {
    return (
      <View style={s.loading}>
        <Text style={s.loadingTx}>{L.state.loading}</Text>
      </View>
    );
  }

  // === Données réelles ====================================================
  const todayStr = ds(new Date());
  const allTasks = db.tasks || [];
  const tasksToday = allTasks.filter(t => !t.done && t.date === todayStr).length;
  const tasksLate  = allTasks.filter(t => !t.done && t.date < todayStr).length;
  const tasksTotal = tasksToday + tasksLate;
  const tasksSubtitle = tasksTotal === 0
    ? L.dash.tasks.none
    : [
        tasksLate  > 0 ? L.dash.tasks.late(tasksLate)   : null,
        tasksToday > 0 ? L.dash.tasks.today(tasksToday) : null,
      ].filter(Boolean).join(' · ');

  const todayEvents = eventsForDate(db, todayStr).filter(e => e.time);
  const nextEvents  = todayEvents.slice(0, 3);

  // === Calcul donut analyse jour =========================================
  const dayDonut = useMemo(() => {
    const totals = {}; let occupied = 0;
    todayEvents.forEach(ev => {
      const dur = ev.duration || 30;
      const cat = ev.category || 'perso';
      totals[cat] = (totals[cat] || 0) + dur;
      occupied += dur;
    });
    const free = Math.max(0, 1440 - occupied);
    const slices = Object.entries(totals).map(([k, v]) => ({
      key: k, value: v, color: CATS[k]?.c || T.gold, label: CATS[k]?.l || k,
    }));
    slices.push({ key: '_free', value: free, color: T.bg3, label: L.dash.analyse.free });
    return { slices, occupied, free };
  }, [todayEvents]);

  // === Sélection transport ================================================
  async function selectTransport(key) {
    setTransport(key);
    if (cfg) await updateCfg({ ...cfg, transport: key });
  }

  // === Données fictives ===================================================
  const fakeMacros = [
    { key: 'proteins', label: L.dash.macros.proteins, current: 98,   goal: 140,  color: T.bl,   unit: 'g' },
    { key: 'carbs',    label: L.dash.macros.carbs,    current: 210,  goal: 280,  color: T.or,   unit: 'g' },
    { key: 'lipids',   label: L.dash.macros.lipids,   current: 52,   goal: 70,   color: T.gr,   unit: 'g' },
    { key: 'kcal',     label: L.dash.macros.kcal,     current: 1680, goal: 2200, color: T.gold, unit: 'kcal' },
  ];

  const fakeWeekBars   = [3, 5, 4, 7, 2, 6, 4];
  const fakeWeekLabels = ['L','M','M','J','V','S','D'];

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.dateBanner}>
        {new Date().toLocaleDateString('fr-FR', DATE_FORMAT_BANNER).toUpperCase()}
      </Text>

      <Card
        title={L.dash.widgets.tasks}
        onPress={() => navigate('Tasks')}
        highlight={tasksLate > 0}
      >
        <Text style={[s.bigTx, tasksLate > 0 && { color: T.gold }]}>
          {tasksTotal === 0 ? '0' : tasksTotal}
        </Text>
        <Text style={s.subTx}>{tasksSubtitle}</Text>
      </Card>

      <Card
        title={L.dash.widgets.trajet}
        onPress={() => navigate('Trajet')}
        demo
      >
        <View style={s.trajetRow}>
          <View style={s.trajetTime}>
            <Text style={s.trajetHour}>14h30</Text>
            <Text style={s.trajetSub}>{L.dash.trajet.departIn(45)}</Text>
          </View>
          <View style={s.trajetSep} />
          <View style={{ flex: 1 }}>
            <Text style={s.trajetDest}>Cabinet médical</Text>
            <Text style={s.trajetDur}>{L.dash.trajet.duration(18)} · 6 km</Text>
          </View>
        </View>
      </Card>

      <Card title={L.dash.widgets.transport}>
        <View style={s.transportRow}>
          {TRANSPORT_OPTIONS.map(opt => {
            const Icon = TRANSPORT_ICONS[opt.key];
            const active = transport === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[s.transportBtn, active && s.transportBtnOn]}
                onPress={() => selectTransport(opt.key)}
                activeOpacity={0.7}
              >
                <Icon size={22} color={active ? T.gold : T.tx2} />
                <Text style={[s.transportLbl, active && s.transportLblOn]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      <Card
        title={L.dash.widgets.analyse}
        onPress={() => navigate('Analyse')}
      >
        <View style={s.donutRow}>
          <MiniDonut slices={dayDonut.slices} size={90} />
          <View style={s.donutLegend}>
            <View style={s.donutLine}>
              <Text style={s.donutLbl}>{L.dash.analyse.total}</Text>
              <Text style={s.donutVal}>{minToHM(dayDonut.occupied)}</Text>
            </View>
            <View style={s.donutLine}>
              <Text style={s.donutLbl}>{L.dash.analyse.free}</Text>
              <Text style={s.donutVal}>{minToHM(dayDonut.free)}</Text>
            </View>
            <Text style={s.donutTap}>{L.dash.analyse.tapDetails}</Text>
          </View>
        </View>
      </Card>

      <Card
        title={L.dash.widgets.macros}
        onPress={() => navigate('Sante')}
        demo
      >
        {fakeMacros.map(m => (
          <View key={m.key} style={s.macroRow}>
            <Text style={s.macroLbl}>{m.label}</Text>
            <View style={s.macroBarBg}>
              <View
                style={[
                  s.macroBarFg,
                  {
                    width: `${Math.min(100, (m.current / m.goal) * 100)}%`,
                    backgroundColor: m.color,
                  },
                ]}
              />
            </View>
            <Text style={s.macroVal}>{m.current}/{m.goal}{m.unit}</Text>
          </View>
        ))}
      </Card>

      <Card
        title={L.dash.widgets.sport}
        onPress={() => navigate('Sante')}
        demo
      >
        <View style={s.sportRow}>
          <View style={s.sportCol}>
            <Text style={s.sportTitle}>{L.dash.sport.last}</Text>
            <Text style={s.sportName}>Cardio 45 min</Text>
            <Text style={s.sportSub}>il y a 2 jours</Text>
          </View>
          <View style={s.sportSep} />
          <View style={s.sportCol}>
            <Text style={s.sportTitle}>{L.dash.sport.next}</Text>
            <Text style={s.sportName}>Musculation</Text>
            <Text style={s.sportSub}>demain · 18h00</Text>
          </View>
        </View>
      </Card>

      <Card
        title={L.dash.widgets.courses}
        onPress={() => navigate('Sante')}
        demo
      >
        <View style={s.coursesRow}>
          <View style={s.coursesCol}>
            <Text style={s.coursesDay}>{L.dash.courses.today}</Text>
            <Text style={s.coursesMeal}>Poulet · Riz · Brocoli</Text>
          </View>
          <View style={s.coursesCol}>
            <Text style={s.coursesDay}>{L.dash.courses.tomorrow}</Text>
            <Text style={s.coursesMeal}>Avoine · Amandes</Text>
          </View>
          <View style={s.coursesCol}>
            <Text style={s.coursesDay}>{L.dash.courses.after}</Text>
            <Text style={s.coursesMeal}>Thon · Patates douces</Text>
          </View>
        </View>
      </Card>

      <Card
        title={L.dash.widgets.week}
        onPress={() => navigate('Analyse')}
        demo
      >
        <View style={s.weekBars}>
          {fakeWeekBars.map((v, i) => {
            const max = Math.max(...fakeWeekBars);
            const h = (v / max) * 50;
            return (
              <View key={i} style={s.weekBarCol}>
                <View style={[s.weekBar, { height: h, backgroundColor: T.gold }]} />
                <Text style={s.weekBarLbl}>{fakeWeekLabels[i]}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Card
        title={L.dash.widgets.planning}
        onPress={() => navigate('Planning')}
      >
        {nextEvents.length === 0 ? (
          <Text style={s.subTx}>Aucun événement aujourd'hui</Text>
        ) : (
          nextEvents.map(ev => (
            <View key={ev.id} style={s.evRow}>
              <View style={[s.evBar, { backgroundColor: ev.color || CATS[ev.category]?.c || T.gold }]} />
              <View style={{ flex: 1, position: 'relative' }}>
                <Text style={s.evTime}>{ev.time}{ev.duration ? ` · ${ev.duration}min` : ''}</Text>
                <Text style={s.evTitle} numberOfLines={1}>{ev.title}</Text>
                {ev.isRt && <Text style={s.routineMark}>R</Text>}
              </View>
            </View>
          ))
        )}
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Card({ title, children, onPress, highlight, demo }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.7 } : {};
  return (
    <Wrapper style={[s.card, highlight && s.cardHighlight]} {...wrapperProps}>
      <View style={s.cardHead}>
        <Text style={s.cardTitle}>{title}</Text>
        {demo && <Text style={s.cardDemo}>{L.dash.demo}</Text>}
      </View>
      <View style={s.cardBody}>{children}</View>
    </Wrapper>
  );
}

function MiniDonut({ slices, size = 90 }) {
  const total = slices.reduce((a, b) => a + b.value, 0) || 1;
  const cx = size / 2; const cy = size / 2; const r = size / 2 - 2;
  let cumulative = 0;
  const arcs = slices.filter(sl => sl.value > 0).map(sl => {
    const start = (cumulative / total) * 2 * Math.PI;
    cumulative += sl.value;
    const end   = (cumulative / total) * 2 * Math.PI;
    return { ...sl, start, end };
  });
  return (
    <Svg width={size} height={size}>
      {arcs.map((a, i) => {
        if (arcs.length === 1) return <Circle key={i} cx={cx} cy={cy} r={r} fill={a.color}/>;
        const x1 = cx + r * Math.sin(a.start);
        const y1 = cy - r * Math.cos(a.start);
        const x2 = cx + r * Math.sin(a.end);
        const y2 = cy - r * Math.cos(a.end);
        const large = a.end - a.start > Math.PI ? 1 : 0;
        return (
          <Path
            key={i}
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
            fill={a.color}
          />
        );
      })}
      <Circle cx={cx} cy={cy} r={r * 0.5} fill={T.bg2} />
    </Svg>
  );
}

function minToHM(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { padding: 16, paddingBottom: 30 },

  loading:   { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg },
  loadingTx: { color: T.tx3 },

  dateBanner: {
    fontSize: 11, color: T.tx2, letterSpacing: 2, fontWeight: '600',
    textAlign: 'center', marginVertical: 12,
  },

  card: {
    backgroundColor: T.bg2,
    borderWidth: 1, borderColor: T.bo,
    borderRadius: 14,
    padding: 16, marginBottom: 12,
  },
  cardHighlight: { borderColor: T.gold, borderWidth: 1.5 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontSize: 11, color: T.gold, letterSpacing: 1.5, fontWeight: '700' },
  cardDemo:  { fontSize: 9, color: T.tx3, fontStyle: 'italic', letterSpacing: 0.5 },

  bigTx: { fontSize: 28, color: T.tx, fontWeight: '700' },
  subTx: { fontSize: 13, color: T.tx2, marginTop: 4 },

  trajetRow: { flexDirection: 'row', alignItems: 'center' },
  trajetTime: { width: 80 },
  trajetHour: { fontSize: 22, color: T.tx, fontWeight: '700' },
  trajetSub:  { fontSize: 10, color: T.gold, marginTop: 2, letterSpacing: 0.5 },
  trajetSep:  { width: 1, height: 40, backgroundColor: T.bo, marginHorizontal: 14 },
  trajetDest: { fontSize: 14, color: T.tx, fontWeight: '600' },
  trajetDur:  { fontSize: 11, color: T.tx2, marginTop: 4 },

  transportRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  transportBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4,
    borderRadius: 10, borderWidth: 1, borderColor: T.bo, backgroundColor: T.bg,
  },
  transportBtnOn: { backgroundColor: T.bg3, borderColor: T.gold },
  transportLbl:   { fontSize: 9, color: T.tx2, marginTop: 4, fontWeight: '600' },
  transportLblOn: { color: T.gold },

  donutRow:    { flexDirection: 'row', alignItems: 'center' },
  donutLegend: { flex: 1, marginLeft: 16 },
  donutLine:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  donutLbl:    { fontSize: 12, color: T.tx2 },
  donutVal:    { fontSize: 12, color: T.tx, fontWeight: '600' },
  donutTap:    { fontSize: 10, color: T.tx3, marginTop: 8, fontStyle: 'italic' },

  macroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  macroLbl: { width: 70, fontSize: 11, color: T.tx2 },
  macroBarBg: { flex: 1, height: 6, backgroundColor: T.bg3, borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
  macroBarFg: { height: '100%' },
  macroVal:   { width: 70, fontSize: 10, color: T.tx2, textAlign: 'right' },

  sportRow: { flexDirection: 'row' },
  sportCol: { flex: 1 },
  sportSep: { width: 1, backgroundColor: T.bo, marginHorizontal: 12 },
  sportTitle: { fontSize: 9, color: T.tx3, letterSpacing: 1, textTransform: 'uppercase' },
  sportName:  { fontSize: 14, color: T.tx, fontWeight: '600', marginTop: 4 },
  sportSub:   { fontSize: 10, color: T.tx2, marginTop: 2 },

  coursesRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  coursesCol:  { flex: 1, paddingRight: 8 },
  coursesDay:  { fontSize: 9, color: T.gold, letterSpacing: 1, fontWeight: '700' },
  coursesMeal: { fontSize: 10, color: T.tx2, marginTop: 4, lineHeight: 14 },

  weekBars:    { flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 6 },
  weekBarCol:  { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  weekBar:     { width: '100%', borderRadius: 4 },
  weekBarLbl:  { fontSize: 10, color: T.tx3, marginTop: 4 },

  evRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  evBar:    { width: 3, height: 30, borderRadius: 2, marginRight: 10 },
  evTime:   { fontSize: 10, color: T.tx2, fontWeight: '600' },
  evTitle:  { fontSize: 13, color: T.tx, fontWeight: '600' },
  routineMark: { position: 'absolute', top: 0, right: 4, fontSize: 10, color: T.gold, fontWeight: '700' },
});
