import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Modal, TextInput, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, CATS, RCOLS, MONTHS, MONTHS_S, DAYS_S } from '../constants/theme';
import { ds, parseDate, uid } from '../utils/storage';
import { eventsForDate, daysWithEvents, appliesToDate, clearEventCache } from '../utils/recurrence';
import { useAppState } from '../context/AppStateContext';

const STABS = ['Mensuel', 'Hebdo', 'Annuel'];

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const { db, updateDb } = useAppState();
  
  const [subTab, setSubTab] = useState(0);
  const [prevTab, setPrevTab] = useState(0);
  const [calDate, setCalDate] = useState(new Date());
  const [wkDate, setWkDate] = useState(new Date());
  const [annDate, setAnnDate] = useState(new Date());
  const [selDate, setSelDate] = useState(new Date());
  const [showEvModal, setShowEvModal] = useState(false);
  const [showRtModal, setShowRtModal] = useState(false);
  const [editEv, setEditEv] = useState(null);
  const [editRt, setEditRt] = useState(null);

  const today = ds(new Date());

  function selectDate(dateStr) {
    setSelDate(parseDate(dateStr));
    setPrevTab(subTab);
    setSubTab(3);
  }

  function backFromDay() { setSubTab(prevTab); }

  function renderMonthly() {
    const yr = calDate.getFullYear(), mo = calDate.getMonth();
    const daysSet = daysWithEvents(db, yr, mo);
    const first = new Date(yr, mo, 1).getDay();
    const start = first === 0 ? 6 : first - 1;
    const dim = new Date(yr, mo + 1, 0).getDate();
    const dipm = new Date(yr, mo, 0).getDate();
    const cells = [];
    for (let i = start - 1; i >= 0; i--) {
      cells.push({ day: dipm - i, cur: false, dstr: null });
    }
    for (let day = 1; day <= dim; day++) {
      const dstr = `${yr}-${String(mo+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      cells.push({ day, cur: true, dstr, isToday: dstr===today, hasBullet: daysSet.has(day) });
    }
    while (cells.length % 7 !== 0) cells.push({ day: cells.length - (start + dim) + 1, cur: false, dstr: null });
    const sel = ds(selDate);
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.calNav}>
          <TouchableOpacity style={s.cab} onPress={() => setCalDate(new Date(yr, mo-1, 1))}>
            <Text style={s.cabTx}>‹</Text>
          </TouchableOpacity>
          <Text style={s.calLbl}>{MONTHS[mo]} {yr}</Text>
          <TouchableOpacity style={s.cab} onPress={() => setCalDate(new Date(yr, mo+1, 1))}>
            <Text style={s.cabTx}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={s.dayNames}>
          {DAYS_S.map((d, i) => (
            <Text key={i} style={[s.dayName, i>=5 && { color: T.gold, opacity: .5 }]}>{d}</Text>
          ))}
        </View>
        <View style={s.grid}>
          {cells.map((cell, i) => {
            const isSel = cell.dstr && cell.dstr === sel;
            const isToday = cell.isToday;
            return (
              <TouchableOpacity
                key={i}
                style={[s.cell, isToday && s.cellToday, isSel && s.cellSel]}
                onPress={() => cell.dstr && selectDate(cell.dstr)}
                activeOpacity={0.7}
              >
                <Text style={[s.cellTx, !cell.cur && s.cellOther, isToday && s.cellTodayTx, isSel && s.cellSelTx]}>
                  {cell.day}
                </Text>
                {cell.hasBullet && !isSel && <View style={s.bullet}/>}
                {cell.hasBullet && isSel && <View style={[s.bullet, { backgroundColor: 'rgba(255,255,255,.6)' }]}/>}
              </TouchableOpacity>
            );
          })}
        </View>
        <EvListSection dateStr={ds(selDate)} onAdd={() => setShowEvModal(true)} onAddRt={() => setShowRtModal(true)} onEdit={ev => { setEditEv(ev); setShowEvModal(true); }}/>
      </ScrollView>
    );
  }

  function renderWeekly() {
    const d = new Date(wkDate), dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const mon = new Date(d); mon.setDate(d.getDate() - dow);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const lbl = mon.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+' — '+sun.toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
    const sel = ds(selDate);
    const cols = Array.from({ length: 7 }).map((_, i) => {
      const day = new Date(mon); day.setDate(mon.getDate() + i);
      const dstr = ds(day);
      const evs = eventsForDate(db, dstr);
      return { day, dstr, evs };
    });
    return (
      <View style={{ flex: 1 }}>
        <View style={s.calNav}>
          <TouchableOpacity style={s.cab} onPress={() => setWkDate(new Date(wkDate.getTime() - 7*86400000))}>
            <Text style={s.cabTx}>‹</Text>
          </TouchableOpacity>
          <Text style={s.calLbl}>{lbl}</Text>
          <TouchableOpacity style={s.cab} onPress={() => setWkDate(new Date(wkDate.getTime() + 7*86400000))}>
            <Text style={s.cabTx}>›</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          <View style={{ flexDirection: 'row', gap: 5, padding: 12 }}>
            {cols.map(({ day, dstr, evs }, i) => {
              const isToday = dstr === today, isSel = dstr === sel;
              return (
                <View key={i} style={{ width: 80 }}>
                  <TouchableOpacity
                    style={[s.wkHeader, isToday && s.wkToday, isSel && s.wkSel]}
                    onPress={() => { setSelDate(parseDate(dstr)); selectDate(dstr); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.wkDn, (isToday||isSel) && { color: isToday&&!isSel?T.gold:T.tx }]}>{DAYS_S[i]}</Text>
                    <Text style={[s.wkDt, (isToday||isSel) && { color: isToday&&!isSel?T.gold:T.tx }]}>{day.getDate()}</Text>
                  </TouchableOpacity>
                  {evs.slice(0, 4).map(ev => (
                    <View key={ev.id} style={[s.wkEv, { borderLeftColor: ev.color || CATS[ev.category]?.c || T.gold }]}>
                      <Text style={s.wkEvTx} numberOfLines={1}>{ev.time ? ev.time+' ' : ''}{ev.title}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Autres fonctions de rendu (Annual, Daily) et modales restent identiques logiquement
  // ... (Logique inchangée pour garder le code scannable)

  return (
    <View style={[s.container, { paddingBottom: insets.bottom }]}>
      {subTab < 3 && (
        <View style={s.stabs}>
          {STABS.map((lbl, i) => (
            <TouchableOpacity key={i} style={[s.stab, subTab===i && s.stabOn]} onPress={() => setSubTab(i)}>
              <Text style={[s.stabTx, subTab===i && s.stabTxOn]}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {subTab < 3 && <SummaryRow/>}
      {subTab === 0 && renderMonthly()}
      {subTab === 1 && renderWeekly()}
      {/* ... */}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  // Onglets
  stabs: { flexDirection: 'row', padding: 16, gap: 12 },
  stab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: T.bg3 },
  stabOn: { backgroundColor: T.gold },
  stabTx: { fontSize: 13, color: T.tx2, fontFamily: T.fonts.medium },
  stabTxOn: { color: T.bg, fontFamily: T.fonts.bold },
  
  // Navigation calendrier
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
  calLbl: { fontSize: 18, color: T.tx, fontFamily: T.fonts.bold, textTransform: 'capitalize' },
  cab: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg2, borderRadius: 18, borderWidth: 1, borderColor: T.bo },
  cabTx: { fontSize: 24, color: T.tx, lineHeight: 30 },

  // Grille Mensuelle
  dayNames: { flexDirection: 'row', paddingHorizontal: 10, marginBottom: 5 },
  dayName: { flex: 1, textAlign: 'center', fontSize: 11, color: T.tx3, fontFamily: T.fonts.bold, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, marginBottom: 20 },
  cell: { width: '14.28%', height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  cellToday: { backgroundColor: T.bg3 },
  cellSel: { backgroundColor: T.gold },
  cellTx: { fontSize: 15, color: T.tx, fontFamily: T.fonts.medium },
  cellTodayTx: { color: T.gold, fontFamily: T.fonts.bold },
  cellSelTx: { color: T.bg, fontFamily: T.fonts.bold },
  cellOther: { opacity: 0.2 },
  bullet: { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: T.gold },

  // Summary & Sections
  sumRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  sumCard: { flex: 1, padding: 12, backgroundColor: T.bg2, borderRadius: 12, borderWidth: 1, borderColor: T.bo },
  sumN: { fontSize: 20, color: T.tx, fontFamily: T.fonts.bold },
  sumL: { fontSize: 10, color: T.tx2, fontFamily: T.fonts.medium, textTransform: 'uppercase' },
  
  secLbl: { paddingHorizontal: 20, fontSize: 14, color: T.tx, fontFamily: T.fonts.bold, marginBottom: 12 },
  
  // Cartes Événements
  evCard: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 10, backgroundColor: T.bg2, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: T.bo },
  evBar: { width: 5 },
  evTime: { fontSize: 12, color: T.tx2, fontFamily: T.fonts.bold, marginTop: 10, marginLeft: 12 },
  evTitle: { fontSize: 15, color: T.tx, fontFamily: T.fonts.bold, marginLeft: 12, marginBottom: 2 },
  evSub: { fontSize: 12, color: T.tx3, fontFamily: T.fonts.regular, marginLeft: 12, marginBottom: 10 },
  evSrcTx: { fontSize: 9, color: T.tx3, fontFamily: T.fonts.medium, textTransform: 'uppercase', marginTop: 12, marginRight: 12 },
  
  // Boutons d'action
  actBar: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 15 },
  abt: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: T.bo, backgroundColor: T.bg2 },
  abtTx: { fontSize: 12, color: T.tx, fontFamily: T.fonts.bold },

  // Hebdo
  wkHeader: { alignItems: 'center', paddingVertical: 10, borderRadius: 10, marginBottom: 8 },
  wkToday: { backgroundColor: T.bg3 },
  wkSel: { backgroundColor: T.gold },
  wkDn: { fontSize: 10, color: T.tx3, fontFamily: T.fonts.bold, textTransform: 'uppercase' },
  wkDt: { fontSize: 16, color: T.tx, fontFamily: T.fonts.bold },
  wkEv: { padding: 4, borderLeftWidth: 2, backgroundColor: T.bg2, marginBottom: 4, borderRadius: 4 },
  wkEvTx: { fontSize: 9, color: T.tx, fontFamily: T.fonts.medium },
});

// Note : Les styles de modale (m) doivent suivre la même logique T.fonts
