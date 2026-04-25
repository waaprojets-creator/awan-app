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
                {cell.hasBullet && isSel && <View style={[s.bullet, { backgroundColor: 'rgba(0,0,0,.4)' }]}/>}
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
                    <Text style={[s.wkDn, (isToday||isSel) && { color: isToday&&!isSel?T.gold:'#000' }]}>{DAYS_S[i]}</Text>
                    <Text style={[s.wkDt, (isToday||isSel) && { color: isToday&&!isSel?T.gold:'#000' }]}>{day.getDate()}</Text>
                  </TouchableOpacity>
                  {evs.slice(0, 4).map(ev => (
                    <View key={ev.id} style={[s.wkEv, { borderLeftColor: ev.color || CATS[ev.category]?.c || T.gold }]}>
                      <Text style={s.wkEvTx} numberOfLines={1}>{ev.time ? ev.time+' ' : ''}{ev.title}</Text>
                    </View>
                  ))}
                  {evs.length > 4 && <Text style={{ fontSize: 9, color: T.tx3, paddingHorizontal: 4 }}>+{evs.length-4}</Text>}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  function renderAnnual() {
    const yr = annDate.getFullYear();
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18 }}>
        <View style={s.calNav}>
          <TouchableOpacity style={s.cab} onPress={() => setAnnDate(new Date(yr-1, 0, 1))}>
            <Text style={s.cabTx}>‹</Text>
          </TouchableOpacity>
          <Text style={s.calLbl}>{yr}</Text>
          <TouchableOpacity style={s.cab} onPress={() => setAnnDate(new Date(yr+1, 0, 1))}>
            <Text style={s.cabTx}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {Array.from({ length: 12 }).map((_, mo) => {
            const daysSet = daysWithEvents(db, yr, mo);
            const dim = new Date(yr, mo+1, 0).getDate();
            const first = new Date(yr, mo, 1).getDay();
            const start = first === 0 ? 6 : first - 1;
            const cells = [];
            for (let i = 0; i < start; i++) cells.push(null);
            for (let d = 1; d <= dim; d++) cells.push(d);
            const dstr0 = `${yr}-${String(mo+1).padStart(2,'0')}`;
            return (
              <View key={mo} style={s.annMonth}>
                <Text style={s.annMlbl}>{MONTHS_S[mo]}</Text>
                <View style={s.annGrid}>
                  {cells.map((day, i) => {
                    if (!day) return <View key={i} style={s.annCell}/>;
                    const dstr = `${dstr0}-${String(day).padStart(2,'0')}`;
                    const isT = dstr === today, hasEv = daysSet.has(day);
                    return (
                      <TouchableOpacity key={i} style={[s.annCell, isT && s.annToday]} onPress={() => selectDate(dstr)} activeOpacity={0.7}>
                        <Text style={[s.annDayTx, isT && { color: '#000' }]}>{day}</Text>
                        {hasEv && !isT && <View style={s.annBullet}/>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  function renderDaily() {
    const dstr = ds(selDate);
    const evs = eventsForDate(db, dstr);
    const dateLabel = selDate.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })
      .replace(/^\w/, c => c.toUpperCase());
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.dailyHdr}>
          <TouchableOpacity style={s.backBtn} onPress={backFromDay}>
            <Text style={s.backTx}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={s.dailyTitle}>{dateLabel}</Text>
            <Text style={s.dailySub}>{selDate.getFullYear()}</Text>
          </View>
        </View>
        <ActBar onAdd={() => setShowEvModal(true)} onAddRt={() => setShowRtModal(true)}/>
        {evs.length ? evs.map(ev => <EvCard key={ev.id} ev={ev} onPress={() => { if(!ev.isRt){ setEditEv(ev); setShowEvModal(true); } }}/>) :
          <EmptyState title="Aucun événement" sub="Appuyez sur + pour en créer un"/>}
      </ScrollView>
    );
  }

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
      {subTab === 2 && renderAnnual()}
      {subTab === 3 && renderDaily()}
      <EventModal
        visible={showEvModal}
        ev={editEv}
        defaultDate={ds(selDate)}
        onClose={() => { setShowEvModal(false); setEditEv(null); }}
        onSave={async ev => {
          const newDb = { ...db };
          if (editEv) { newDb.events = db.events.map(e => e.id === ev.id ? ev : e); }
          else { newDb.events = [...db.events, ev]; }
          await updateDb(newDb);
          clearEventCache();
          setShowEvModal(false); setEditEv(null);
        }}
        onDelete={async id => {
          const newDb = { ...db, events: db.events.filter(e => e.id !== id) };
          await updateDb(newDb);
          clearEventCache();
          setShowEvModal(false); setEditEv(null);
        }}
      />
      <RoutineModal
        visible={showRtModal}
        rt={editRt}
        onClose={() => { setShowRtModal(false); setEditRt(null); }}
        onSave={async rt => {
          const newDb = { ...db };
          if (editRt) { newDb.routines = db.routines.map(r => r.id === rt.id ? rt : r); }
          else { newDb.routines = [...db.routines, rt]; }
          await updateDb(newDb);
          clearEventCache();
          setShowRtModal(false); setEditRt(null);
        }}
        onDelete={async id => {
          const newDb = { ...db, routines: db.routines.filter(r => r.id !== id) };
          await updateDb(newDb);
          clearEventCache();
          setShowRtModal(false); setEditRt(null);
        }}
      />
    </View>
  );
}

function SummaryRow() {
  const { db } = useAppState();
  const t = ds(new Date());
  const evCount = eventsForDate(db, t).filter(e => !e.isRt).length;
  return (
    <View style={s.sumRow}>
      {[
        { n: evCount, l: 'événements' },
        { n: db.tasks.length, l: 'tâches' },
        { n: db.routines.length, l: 'routines' },
      ].map(({ n, l }, i) => (
        <View key={i} style={s.sumCard}>
          <Text style={s.sumN}>{n}</Text>
          <Text style={s.sumL}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

function ActBar({ onAdd, onAddRt }) {
  return (
    <View style={s.actBar}>
      <TouchableOpacity style={s.abt} onPress={onAdd} activeOpacity={0.7}>
        <Text style={s.abtTx}>+ Événement</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.abt} onPress={onAddRt} activeOpacity={0.7}>
        <Text style={s.abtTx}>⏱ Routine</Text>
      </TouchableOpacity>
    </View>
  );
}

function EvListSection({ dateStr, onAdd, onAddRt, onEdit }) {
  const { db } = useAppState();
  const evs = eventsForDate(db, dateStr);
  const d = parseDate(dateStr);
  const lbl = dateStr === ds(new Date())
    ? "Aujourd'hui"
    : d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' }).replace(/^\w/, c => c.toUpperCase());
  return (
    <View>
      <Text style={s.secLbl}>{lbl}</Text>
      <ActBar onAdd={onAdd} onAddRt={onAddRt}/>
      {evs.length ? evs.map(ev => <EvCard key={ev.id} ev={ev} onPress={() => !ev.isRt && onEdit(ev)}/>) :
        <EmptyState title="Aucun événement" sub="Cliquez sur une date ou sur +"/>}
    </View>
  );
}

function EvCard({ ev, onPress }) {
  const cat = CATS[ev.category] || CATS.perso;
  const col = ev.color || cat.c;
  const srcLabel = ev.source === 'claude' ? 'Claude' : 'Manuel';
  return (
    <TouchableOpacity style={s.evCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.evBar, { backgroundColor: col }]}/>
      <Text style={s.evTime}>{ev.time || '—'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.evTitle} numberOfLines={1}>{ev.title}</Text>
        <Text style={s.evSub}>{cat.l}{ev.duration ? ' · ' + ev.duration + 'min' : ''}</Text>
        {ev.steps?.length > 0 && (
          <Text style={s.evSteps} numberOfLines={1}>
            ↳ {ev.steps.slice(0,2).map(st => st.name || st).join(' → ')}{ev.steps.length > 2 ? '…' : ''}
          </Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={[s.evCat, { backgroundColor: col + '18' }]}>
          <Text style={[s.evCatTx, { color: col }]}>{ev.isRt ? 'Routine' : cat.l}</Text>
        </View>
        <Text style={s.evSrcTx}>{srcLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ title, sub }) {
  return (
    <View style={{ alignItems: 'center', padding: 28 }}>
      <Text style={{ color: T.tx3, fontSize: 12, marginBottom: 4 }}>{title}</Text>
      <Text style={{ color: T.tx3, fontSize: 10, opacity: .6 }}>{sub}</Text>
    </View>
  );
}

function EventModal({ visible, ev, defaultDate, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate || ds(new Date()));
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [cat, setCat] = useState('perso');
  const [notes, setNotes] = useState('');
  const [src, setSrc] = useState('manual');

  // Only init when modal opens, not on every render
  React.useEffect(() => {
    if (!visible) return;
    if (ev) {
      setTitle(ev.title || ''); setDate(ev.date || defaultDate);
      setTime(ev.time || ''); setDuration(String(ev.duration || 60));
      setCat(ev.category || 'perso'); setNotes(ev.notes || '');
      setSrc(ev.source || 'manual');
    } else {
      setTitle(''); setDate(defaultDate || ds(new Date())); setTime('');
      setDuration('60'); setCat('perso'); setNotes(''); setSrc('manual');
    }
  }, [ev, visible, defaultDate]);

  function handleSave() {
    if (!title.trim()) return;
    onSave({ id: ev?.id || uid(), title: title.trim(), date, time: time || null,
      duration: parseInt(duration) || 60, category: cat, source: src,
      notes: notes.trim() || null, created_at: ev?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString() });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={m.container}>
        <View style={m.handle}/>
        <View style={m.hdr}>
          <Text style={m.title}>{ev ? "Modifier l'événement" : 'Nouvel événement'}</Text>
          <TouchableOpacity style={m.closeBtn} onPress={onClose}><Text style={m.closeTx}>×</Text></TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }}>
          <Field label="Titre"><TextInput style={m.input} value={title} onChangeText={setTitle} placeholder="Ex : Réunion…" placeholderTextColor={T.tx3}/></Field>
          <View style={m.row}>
            <Field label="Date" style={{ flex: 1 }}><TextInput style={m.input} value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" placeholderTextColor={T.tx3}/></Field>
            <Field label="Heure" style={{ flex: 1 }}><TextInput style={m.input} value={time} onChangeText={setTime} placeholder="HH:MM" placeholderTextColor={T.tx3}/></Field>
          </View>
          <Field label="Durée (min)"><TextInput style={m.input} value={duration} onChangeText={setDuration} keyboardType="numeric" placeholderTextColor={T.tx3}/></Field>
          <Text style={m.lbl}>Catégorie</Text>
          <View style={m.catGrid}>
            {Object.entries(CATS).map(([k, v]) => (
              <TouchableOpacity key={k} style={[m.catOpt, cat===k && m.catOn]} onPress={() => setCat(k)} activeOpacity={0.7}>
                <View style={[m.catDot, { backgroundColor: v.c }]}/>
                <Text style={[m.catTx, cat===k && { color: T.gold }]}>{v.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="Notes"><TextInput style={m.input} value={notes} onChangeText={setNotes} placeholder="Optionnel…" placeholderTextColor={T.tx3}/></Field>
          <TouchableOpacity style={m.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={m.saveTx}>Enregistrer</Text>
          </TouchableOpacity>
          {ev && <TouchableOpacity style={m.delBtn} onPress={() => onDelete(ev.id)} activeOpacity={0.85}>
            <Text style={m.delTx}>Supprimer</Text>
          </TouchableOpacity>}
          <View style={{ height: 24 }}/>
        </ScrollView>
      </View>
    </Modal>
  );
}

function RoutineModal({ visible, rt, onClose, onSave, onDelete }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(RCOLS[0]);
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [freq, setFreq] = useState('daily');
  const [days, setDays] = useState([]);
  const [startDate, setStartDate] = useState(ds(new Date()));
  const [endDate, setEndDate] = useState('');
  const [desc, setDesc] = useState('');
  const [steps, setSteps] = useState([]);
  const [src, setSrc] = useState('manual');

  const FREQS = ['daily','weekdays','weekend','custom','weekly','monthly','once'];
  const FREQ_LBL = { daily:'Quotidien', weekdays:'Lun-Ven', weekend:'Week-end', custom:'Spécifique', weekly:'Hebdo', monthly:'Mensuel', once:'Unique' };

  // Only init when modal opens, not on every render
  React.useEffect(() => {
    if (!visible) return;
    if (rt) {
      setName(rt.name||''); setColor(rt.color||RCOLS[0]); setTime(rt.time||'');
      setDuration(String(rt.duration||30)); setFreq(rt.frequency||'daily');
      setDays(rt.days||[]); setStartDate(rt.startDate||ds(new Date())); setEndDate(rt.endDate||'');
      setDesc(rt.description||''); setSteps(rt.steps||[]); setSrc(rt.source||'manual');
    } else {
      setName(''); setColor(RCOLS[0]); setTime(''); setDuration('30');
      setFreq('daily'); setDays([]); setStartDate(ds(new Date())); setEndDate('');
      setDesc(''); setSteps([]); setSrc('manual');
    }
  }, [rt, visible]);

  function togDay(i) { setDays(prev => prev.includes(i) ? prev.filter(d => d!==i) : [...prev, i]); }

  function handleSave() {
    if (!name.trim()) return;
    onSave({ id: rt?.id || uid(), name: name.trim(), color, time: time||null,
      duration: parseInt(duration)||30, frequency: freq,
      days: freq==='custom' ? days : null, startDate, endDate: endDate||null,
      description: desc.trim()||null, source: src,
      steps: steps.filter(s => (s.name||s).trim()).map((s,i) => ({order:i+1, name: s.name||s})),
      created_at: rt?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={m.container}>
        <View style={m.handle}/>
        <View style={m.hdr}>
          <Text style={m.title}>{rt ? 'Modifier la routine' : 'Nouvelle routine'}</Text>
          <TouchableOpacity style={m.closeBtn} onPress={onClose}><Text style={m.closeTx}>×</Text></TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }}>
          <Field label="Nom"><TextInput style={m.input} value={name} onChangeText={setName} placeholder="Ex : Soin visage…" placeholderTextColor={T.tx3}/></Field>
          <Text style={m.lbl}>Couleur</Text>
          <View style={{ flexDirection:'row', gap:8, paddingHorizontal:18, marginBottom:11, flexWrap:'wrap' }}>
            {RCOLS.map(c => (
              <TouchableOpacity key={c} style={[m.csw, { backgroundColor:c }, color===c && m.cswOn]} onPress={() => setColor(c)} activeOpacity={0.7}/>
            ))}
          </View>
          <View style={m.row}>
            <Field label="Heure" style={{flex:1}}><TextInput style={m.input} value={time} onChangeText={setTime} placeholder="HH:MM" placeholderTextColor={T.tx3}/></Field>
            <Field label="Durée (min)" style={{flex:1}}><TextInput style={m.input} value={duration} onChangeText={setDuration} keyboardType="numeric" placeholderTextColor={T.tx3}/></Field>
          </View>
          <Text style={m.lbl}>Fréquence</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:11 }}>
            <View style={{ flexDirection:'row', gap:6, paddingHorizontal:18 }}>
              {FREQS.map(f => (
                <TouchableOpacity key={f} style={[m.freqBtn, freq===f && m.freqOn]} onPress={() => setFreq(f)} activeOpacity={0.7}>
                  <Text style={[m.freqTx, freq===f && { color:T.gold }]}>{FREQ_LBL[f]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {freq==='custom' && (
            <View style={{ flexDirection:'row', gap:4, paddingHorizontal:18, marginBottom:11 }}>
              {['Lu','Ma','Me','Je','Ve','Sa','Di'].map((d,i) => (
                <TouchableOpacity key={i} style={[m.dayBtn, days.includes(i) && m.dayOn]} onPress={() => togDay(i)} activeOpacity={0.7}>
                  <Text style={[m.dayTx, days.includes(i) && { color:T.gold }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={m.row}>
            <Field label="Début" style={{flex:1}}><TextInput style={m.input} value={startDate} onChangeText={setStartDate} placeholder="AAAA-MM-JJ" placeholderTextColor={T.tx3}/></Field>
            <Field label="Fin (opt.)" style={{flex:1}}><TextInput style={m.input} value={endDate} onChangeText={setEndDate} placeholder="AAAA-MM-JJ" placeholderTextColor={T.tx3}/></Field>
          </View>
          <Field label="Description"><TextInput style={[m.input,{minHeight:60}]} value={desc} onChangeText={setDesc} multiline placeholder="Optionnel…" placeholderTextColor={T.tx3}/></Field>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:18, marginBottom:8 }}>
            <Text style={m.lbl}>Étapes</Text>
            <TouchableOpacity onPress={() => setSteps(prev => [...prev, {order:prev.length+1, name:''}])}>
              <Text style={{ color:T.gold, fontSize:12 }}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>
          {steps.map((st, i) => (
            <View key={i} style={{ flexDirection:'row', gap:8, paddingHorizontal:18, marginBottom:6, alignItems:'center' }}>
              <View style={m.snum}><Text style={{ color:T.gold, fontSize:9 }}>{i+1}</Text></View>
              <TextInput style={[m.input,{flex:1,marginBottom:0}]} value={st.name||st} onChangeText={v => setSteps(prev => prev.map((x,j) => j===i ? {...x, name:v} : x))} placeholder={`Étape ${i+1}`} placeholderTextColor={T.tx3}/>
              <TouchableOpacity onPress={() => setSteps(prev => prev.filter((_,j) => j!==i))}>
                <Text style={{ color:T.rd, fontSize:18 }}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={[m.saveBtn,{marginTop:14}]} onPress={handleSave} activeOpacity={0.85}>
            <Text style={m.saveTx}>Enregistrer la routine</Text>
          </TouchableOpacity>
          {rt && <TouchableOpacity style={m.delBtn} onPress={() => onDelete(rt.id)} activeOpacity={0.85}>
            <Text style={m.delTx}>Supprimer</Text>
          </TouchableOpacity>}
          <View style={{ height: 24 }}/>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Field({ label, children, style }) {
  return (
    <View style={[{ paddingHorizontal:18, marginBottom:11 }, style]}>
      <Text style={m.lbl}>{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  stabs: { flexDirection:'row', borderBottomWidth:1, borderBottomColor:T.bo, paddingHorizontal:10 },
  stab: { paddingVertical:9, paddingHorizontal:14, borderBottomWidth:2, borderBottomColor:'transparent' },
  stabOn: { borderBottomColor:T.gold },
  stabTx: { fontSize:11, color:T.tx3, letterSpacing:.5 },
  stabTxOn: { color:T.gold },
  sumRow: { flexDirection:'row', gap:8, padding:10, paddingBottom:4 },
  sumCard: { flex:1, backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:12, padding:11, alignItems:'center' },
  sumN: { fontSize:22, fontWeight:'300', color:T.gold },
  sumL: { fontSize:9, color:T.tx3, marginTop:4 },
  calNav: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:18, paddingVertical:10 },
  calLbl: { fontSize:13, fontWeight:'500', color:T.tx },
  cab: { width:28, height:28, backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:8, alignItems:'center', justifyContent:'center' },
  cabTx: { fontSize:14, color:T.tx2 },
  dayNames: { flexDirection:'row', paddingHorizontal:18, marginBottom:3 },
  dayName: { flex:1, textAlign:'center', fontSize:10, color:T.tx3 },
  grid: { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:14 },
  cell: { width:'14.28%', aspectRatio:1, alignItems:'center', justifyContent:'center', borderRadius:999 },
  cellToday: { backgroundColor:T.bg3, borderWidth:1, borderColor:T.gdim },
  cellSel: { backgroundColor:T.gold },
  cellTx: { fontSize:12, color:T.tx3 },
  cellOther: { opacity:.4 },
  cellTodayTx: { color:T.gold, fontWeight:'500' },
  cellSelTx: { color:'#000', fontWeight:'600' },
  bullet: { position:'absolute', bottom:2, width:3, height:3, borderRadius:2, backgroundColor:T.gold },
  secLbl: { fontSize:9, letterSpacing:4, color:T.tx3, paddingHorizontal:18, paddingTop:12, paddingBottom:7, textTransform:'uppercase' },
  actBar: { flexDirection:'row', gap:7, paddingHorizontal:18, paddingBottom:12, flexWrap:'wrap' },
  abt: { backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:12, paddingVertical:9, paddingHorizontal:10 },
  abtTx: { fontSize:11, color:T.tx2 },
  evCard: { backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:12, padding:11, marginHorizontal:18, marginBottom:6, flexDirection:'row', gap:10, alignItems:'flex-start' },
  evBar: { width:3, borderRadius:2, alignSelf:'stretch', flexShrink:0, minHeight:28 },
  evTime: { fontSize:11, color:T.tx3, minWidth:36, paddingTop:2 },
  evTitle: { fontSize:13, fontWeight:'500', color:T.tx },
  evSub: { fontSize:10, color:T.tx3, marginTop:2 },
  evSteps: { fontSize:10, color:T.tx3, marginTop:2, opacity:.8 },
  evCat: { paddingHorizontal:7, paddingVertical:2, borderRadius:4 },
  evCatTx: { fontSize:9 },
  evSrcTx: { fontSize:9, color:T.tx3 },
  dailyHdr: { flexDirection:'row', alignItems:'center', gap:10, padding:12, paddingHorizontal:18 },
  backBtn: { width:30, height:30, backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:8, alignItems:'center', justifyContent:'center' },
  backTx: { fontSize:16, color:T.tx2 },
  dailyTitle: { fontSize:15, fontWeight:'500', color:T.tx },
  dailySub: { fontSize:10, color:T.tx3, marginTop:2 },
  wkHeader: { padding:5, borderRadius:8, alignItems:'center' },
  wkToday: { backgroundColor:T.gdim, borderWidth:1, borderColor:T.gold },
  wkSel: { backgroundColor:T.gold },
  wkDn: { fontSize:9, color:T.tx3 },
  wkDt: { fontSize:13, fontWeight:'500', color:T.tx },
  wkEv: { backgroundColor:T.bg2, borderRadius:4, padding:3, borderLeftWidth:2.5, marginBottom:2 },
  wkEvTx: { fontSize:9, color:T.tx },
  annMonth: { width:'47%', backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:12, padding:9 },
  annMlbl: { fontSize:10, fontWeight:'500', color:T.tx2, marginBottom:6 },
  annGrid: { flexDirection:'row', flexWrap:'wrap' },
  annCell: { width:'14.28%', aspectRatio:1, alignItems:'center', justifyContent:'center', borderRadius:999, position:'relative' },
  annToday: { backgroundColor:T.gold },
  annDayTx: { fontSize:8, color:T.tx3 },
  annBullet: { position:'absolute', bottom:0, width:2, height:2, borderRadius:1, backgroundColor:T.gold },
});

const m = StyleSheet.create({
  container: { flex:1, backgroundColor:T.bg3 },
  handle: { width:36, height:3, backgroundColor:T.bo, borderRadius:2, marginTop:12, marginBottom:4, alignSelf:'center' },
  hdr: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:12, paddingHorizontal:18, paddingBottom:14 },
  title: { fontSize:15, fontWeight:'500', color:T.tx },
  closeBtn: { width:28, height:28, backgroundColor:T.bg2, borderRadius:14, alignItems:'center', justifyContent:'center' },
  closeTx: { fontSize:17, color:T.tx3, lineHeight:20 },
  lbl: { fontSize:10, letterSpacing:2, color:T.tx3, textTransform:'uppercase', marginBottom:5, paddingHorizontal:18 },
  input: { backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:8, padding:10, color:T.tx, fontSize:14 },
  row: { flexDirection:'row', gap:10, paddingHorizontal:18, marginBottom:11 },
  catGrid: { flexDirection:'row', flexWrap:'wrap', gap:6, paddingHorizontal:18, marginBottom:11 },
  catOpt: { backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:8, padding:7, alignItems:'center', minWidth:70 },
  catOn: { borderColor:T.gold },
  catDot: { width:7, height:7, borderRadius:4, marginBottom:3 },
  catTx: { fontSize:9, color:T.tx3 },
  saveBtn: { backgroundColor:T.gold, borderRadius:12, padding:13, marginHorizontal:18, marginTop:8, alignItems:'center' },
  saveTx: { color:'#000', fontSize:14, fontWeight:'700', letterSpacing:.5 },
  delBtn: { borderWidth:1, borderColor:'rgba(196,74,74,.28)', borderRadius:12, padding:12, marginHorizontal:18, marginTop:5, alignItems:'center' },
  delTx: { color:T.rd, fontSize:13 },
  csw: { width:26, height:26, borderRadius:13, borderWidth:2, borderColor:'transparent' },
  cswOn: { borderColor:'#fff', transform:[{scale:1.2}] },
  freqBtn: { backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:8, paddingVertical:8, paddingHorizontal:12 },
  freqOn: { borderColor:T.gold, backgroundColor:T.gdim },
  freqTx: { fontSize:11, color:T.tx3 },
  dayBtn: { flex:1, backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:8, paddingVertical:7, alignItems:'center' },
  dayOn: { backgroundColor:T.gdim, borderColor:T.gold },
  dayTx: { fontSize:10, color:T.tx3 },
  snum: { width:18, height:18, borderRadius:9, backgroundColor:T.gdim, alignItems:'center', justifyContent:'center' },
});
