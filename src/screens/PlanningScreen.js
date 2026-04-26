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
// Garde anti-crash : attendre que la DB soit chargée
  if (!db) return null;
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

  // Vue annuelle : 12 mini-mois avec dots indiquant les jours occupés
  function renderAnnual() {
    const yr = annDate.getFullYear();
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.calNav}>
          <TouchableOpacity style={s.cab} onPress={() => setAnnDate(new Date(yr - 1, 0, 1))}>
            <Text style={s.cabTx}>‹</Text>
          </TouchableOpacity>
          <Text style={s.calLbl}>{yr}</Text>
          <TouchableOpacity style={s.cab} onPress={() => setAnnDate(new Date(yr + 1, 0, 1))}>
            <Text style={s.cabTx}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={s.annGrid}>
          {Array.from({ length: 12 }).map((_, mo) => {
            const dim = new Date(yr, mo + 1, 0).getDate();
            const daysSet = daysWithEvents(db, yr, mo);
            const first = new Date(yr, mo, 1).getDay();
            const start = first === 0 ? 6 : first - 1;
            const cells = [];
            for (let i = 0; i < start; i++) cells.push(null);
            for (let day = 1; day <= dim; day++) cells.push({ day, has: daysSet.has(day) });
            return (
              <TouchableOpacity
                key={mo}
                style={s.annMonth}
                onPress={() => { setCalDate(new Date(yr, mo, 1)); setSubTab(0); }}
                activeOpacity={0.7}
              >
                <Text style={s.annMonthLbl}>{MONTHS_S[mo]}</Text>
                <View style={s.annDays}>
                  {cells.map((c, i) => (
                    <View key={i} style={s.annDayCell}>
                      {c && <View style={[s.annDot, c.has && s.annDotOn]} />}
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  // Vue journalière : timeline 24h × 30 min, événements/routines positionnés sur les créneaux
  function renderDaily() {
    const dstr = ds(selDate);
    const evs = eventsForDate(db, dstr);

    const slots = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotEvs = evs.filter(ev => {
          if (!ev.time) return false;
          const [eh, em] = ev.time.split(':').map(Number);
          const evStart = eh * 60 + em;
          const slotStart = h * 60 + m;
          return evStart >= slotStart && evStart < slotStart + 30;
        });
        slots.push({ time, evs: slotEvs, hour: h, min: m });
      }
    }

    const dateLbl = selDate.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    return (
      <View style={{ flex: 1 }}>
        <View style={s.dayHeader}>
          <TouchableOpacity style={s.cab} onPress={backFromDay}>
            <Text style={s.cabTx}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.calLbl}>{dateLbl}</Text>
            <Text style={s.dayHeaderSub}>{evs.length} {evs.length > 1 ? 'créneaux' : 'créneau'}</Text>
          </View>
          <TouchableOpacity style={s.cab} onPress={() => setShowEvModal(true)}>
            <Text style={s.cabTx}>+</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          {slots.map((slot, i) => {
            const isHourMark = slot.min === 0;
            return (
              <View key={i} style={[s.slot, isHourMark && s.slotHour]}>
                <Text style={[s.slotTime, !isHourMark && s.slotTimeHalf]}>{slot.time}</Text>
                <View style={s.slotContent}>
                  {slot.evs.length === 0 ? (
                    <View style={s.slotFree} />
                  ) : (
                    slot.evs.map(ev => (
                      <TouchableOpacity
                        key={ev.id}
                        style={[s.slotEv, { borderLeftColor: ev.color || CATS[ev.category]?.c || T.gold }]}
                        onPress={() => { if (!ev.isRt) { setEditEv(ev); setShowEvModal(true); } }}
                        activeOpacity={0.7}
                      >
                        <Text style={s.slotEvTitle} numberOfLines={1}>
                          {ev.time} · {ev.title}
                        </Text>
                        {ev.duration ? (
                          <Text style={s.slotEvSub}>{ev.duration} min{ev.isRt ? ' · routine' : ''}</Text>
                        ) : null}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  function SummaryRow() {
    const todayStr = today;
    const evToday = eventsForDate(db, todayStr).length;
    const tasksOpen = (db?.tasks || []).filter(t => !t.done).length;
    const routinesActive = (db?.routines || []).length;
    return (
      <View style={s.sumRow}>
        <View style={s.sumCard}>
          <Text style={s.sumN}>{evToday}</Text>
          <Text style={s.sumL}>Aujourd'hui</Text>
        </View>
        <View style={s.sumCard}>
          <Text style={s.sumN}>{tasksOpen}</Text>
          <Text style={s.sumL}>Tâches</Text>
        </View>
        <View style={s.sumCard}>
          <Text style={s.sumN}>{routinesActive}</Text>
          <Text style={s.sumL}>Routines</Text>
        </View>
      </View>
    );
  }

  function EvListSection({ dateStr, onAdd, onAddRt, onEdit }) {
    const evs = eventsForDate(db, dateStr);
    const dateLbl = parseDate(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    return (
      <View>
        <Text style={s.secLbl}>{dateLbl} — {evs.length} {evs.length > 1 ? 'éléments' : 'élément'}</Text>

        <View style={s.actBar}>
          <TouchableOpacity style={s.abt} onPress={onAdd}>
            <Text style={s.abtTx}>+ Événement</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.abt} onPress={onAddRt}>
            <Text style={s.abtTx}>+ Routine</Text>
          </TouchableOpacity>
        </View>

        {evs.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyTx}>Aucun événement ni routine</Text>
          </View>
        ) : (
          evs.map(ev => (
            <TouchableOpacity
              key={ev.id}
              style={s.evCard}
              onPress={() => !ev.isRt && onEdit(ev)}
              activeOpacity={0.7}
            >
              <View style={[s.evBar, { backgroundColor: ev.color || CATS[ev.category]?.c || T.gold }]} />
              <View style={{ flex: 1, paddingVertical: 4 }}>
                {ev.time ? <Text style={s.evTime}>{ev.time}{ev.duration ? ` · ${ev.duration} min` : ''}</Text> : null}
                <Text style={s.evTitle} numberOfLines={1}>{ev.title}</Text>
                {ev.category ? <Text style={s.evSub}>{CATS[ev.category]?.l || ev.category}</Text> : null}
              </View>
              {ev.isRt && <Text style={s.evSrcTx}>Routine</Text>}
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  }

  async function saveEvent(ev) {
    const events = db?.events || [];
    let newEvents;
    if (editEv && editEv.id) {
      newEvents = events.map(e => e.id === editEv.id ? { ...editEv, ...ev } : e);
    } else {
      newEvents = [...events, { id: uid(), ...ev }];
    }
    await updateDb({ ...db, events: newEvents });
    clearEventCache();
    setEditEv(null);
    setShowEvModal(false);
  }

  async function deleteEvent() {
    if (!editEv?.id) return;
    const newEvents = (db?.events || []).filter(e => e.id !== editEv.id);
    await updateDb({ ...db, events: newEvents });
    clearEventCache();
    setEditEv(null);
    setShowEvModal(false);
  }

  async function saveRoutine(rt) {
    const routines = db?.routines || [];
    let newRoutines;
    if (editRt && editRt.id) {
      newRoutines = routines.map(r => r.id === editRt.id ? { ...editRt, ...rt } : r);
    } else {
      newRoutines = [...routines, { id: uid(), ...rt }];
    }
    await updateDb({ ...db, routines: newRoutines });
    clearEventCache();
    setEditRt(null);
    setShowRtModal(false);
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
        initial={editEv}
        defaultDate={ds(selDate)}
        onClose={() => { setShowEvModal(false); setEditEv(null); }}
        onSave={saveEvent}
        onDelete={editEv?.id ? deleteEvent : null}
      />

      <RoutineModal
        visible={showRtModal}
        initial={editRt}
        onClose={() => { setShowRtModal(false); setEditRt(null); }}
        onSave={saveRoutine}
      />
    </View>
  );
}

function EventModal({ visible, initial, defaultDate, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [category, setCategory] = useState('perso');

  React.useEffect(() => {
    if (visible) {
      setTitle(initial?.title || '');
      setDate(initial?.date || defaultDate);
      setTime(initial?.time || '');
      setDuration(initial?.duration ? String(initial.duration) : '30');
      setCategory(initial?.category || 'perso');
    }
  }, [visible, initial, defaultDate]);

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      date,
      time: time || null,
      duration: parseInt(duration, 10) || 30,
      category,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.bg}>
        <View style={m.box}>
          <Text style={m.title}>{initial?.id ? 'Modifier événement' : 'Nouvel événement'}</Text>

          <Text style={m.label}>Titre</Text>
          <TextInput style={m.input} value={title} onChangeText={setTitle} placeholder="Ex : Rendez-vous médecin" placeholderTextColor={T.tx3} />

          <Text style={m.label}>Date (AAAA-MM-JJ)</Text>
          <TextInput style={m.input} value={date} onChangeText={setDate} placeholder="2026-04-26" placeholderTextColor={T.tx3} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={m.label}>Heure</Text>
              <TextInput style={m.input} value={time} onChangeText={setTime} placeholder="14:30" placeholderTextColor={T.tx3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={m.label}>Durée (min)</Text>
              <TextInput style={m.input} value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="30" placeholderTextColor={T.tx3} />
            </View>
          </View>

          <Text style={m.label}>Catégorie</Text>
          <View style={m.catRow}>
            {Object.entries(CATS).map(([key, cat]) => (
              <TouchableOpacity
                key={key}
                style={[m.catBtn, category === key && { backgroundColor: cat.c, borderColor: cat.c }]}
                onPress={() => setCategory(key)}
              >
                <Text style={[m.catTx, category === key && { color: T.bg }]}>{cat.l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={m.btns}>
            {onDelete && (
              <TouchableOpacity style={[m.btn, m.btnDel]} onPress={onDelete}>
                <Text style={m.btnDelTx}>Supprimer</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[m.btn, m.btnCancel]} onPress={onClose}>
              <Text style={m.btnCancelTx}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[m.btn, m.btnOk]} onPress={handleSave}>
              <Text style={m.btnOkTx}>{initial?.id ? 'Modifier' : 'Ajouter'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const FREQS = [
  { k: 'daily',    l: 'Tous les jours' },
  { k: 'weekdays', l: 'Lun-Ven' },
  { k: 'weekend',  l: 'Sam-Dim' },
  { k: 'weekly',   l: 'Hebdo' },
  { k: 'monthly',  l: 'Mensuel' },
];

function RoutineModal({ visible, initial, onClose, onSave }) {
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [frequency, setFrequency] = useState('daily');
  const [color, setColor] = useState(RCOLS[0]);

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name || '');
      setTime(initial?.time || '');
      setDuration(initial?.duration ? String(initial.duration) : '30');
      setFrequency(initial?.frequency || 'daily');
      setColor(initial?.color || RCOLS[0]);
    }
  }, [visible, initial]);

  function handleSave() {
    if (!name.trim()) return;
    const todayStr = ds(new Date());
    onSave({
      name: name.trim(),
      time: time || null,
      duration: parseInt(duration, 10) || 30,
      frequency,
      color,
      startDate: initial?.startDate || todayStr,
      source: 'manual',
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.bg}>
        <View style={m.box}>
          <Text style={m.title}>{initial?.id ? 'Modifier routine' : 'Nouvelle routine'}</Text>

          <Text style={m.label}>Nom</Text>
          <TextInput style={m.input} value={name} onChangeText={setName} placeholder="Ex : Sport matin" placeholderTextColor={T.tx3} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={m.label}>Heure</Text>
              <TextInput style={m.input} value={time} onChangeText={setTime} placeholder="07:00" placeholderTextColor={T.tx3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={m.label}>Durée (min)</Text>
              <TextInput style={m.input} value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="30" placeholderTextColor={T.tx3} />
            </View>
          </View>

          <Text style={m.label}>Fréquence</Text>
          <View style={m.catRow}>
            {FREQS.map(f => (
              <TouchableOpacity
                key={f.k}
                style={[m.catBtn, frequency === f.k && { backgroundColor: T.gold, borderColor: T.gold }]}
                onPress={() => setFrequency(f.k)}
              >
                <Text style={[m.catTx, frequency === f.k && { color: T.bg }]}>{f.l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={m.label}>Couleur</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {RCOLS.map(c => (
              <TouchableOpacity
                key={c}
                style={[m.colorDot, { backgroundColor: c }, color === c && m.colorDotOn]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          <View style={m.btns}>
            <TouchableOpacity style={[m.btn, m.btnCancel]} onPress={onClose}>
              <Text style={m.btnCancelTx}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[m.btn, m.btnOk]} onPress={handleSave}>
              <Text style={m.btnOkTx}>{initial?.id ? 'Modifier' : 'Ajouter'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  stabs: { flexDirection: 'row', padding: 16, gap: 12 },
  stab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: T.bg3 },
  stabOn: { backgroundColor: T.gold },
  stabTx: { fontSize: 13, color: T.tx2, fontFamily: T.fonts.medium },
  stabTxOn: { color: T.bg, fontFamily: T.fonts.bold },
  
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
  calLbl: { fontSize: 18, color: T.tx, fontFamily: T.fonts.bold, textTransform: 'capitalize' },
  cab: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg2, borderRadius: 18, borderWidth: 1, borderColor: T.bo },
  cabTx: { fontSize: 24, color: T.tx, lineHeight: 30 },

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

  sumRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  sumCard: { flex: 1, padding: 12, backgroundColor: T.bg2, borderRadius: 12, borderWidth: 1, borderColor: T.bo },
  sumN: { fontSize: 20, color: T.tx, fontFamily: T.fonts.bold },
  sumL: { fontSize: 10, color: T.tx2, fontFamily: T.fonts.medium, textTransform: 'uppercase' },
  
  secLbl: { paddingHorizontal: 20, fontSize: 14, color: T.tx, fontFamily: T.fonts.bold, marginBottom: 12 },
  
  evCard: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 10, backgroundColor: T.bg2, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: T.bo },
  evBar: { width: 5 },
  evTime: { fontSize: 12, color: T.tx2, fontFamily: T.fonts.bold, marginTop: 10, marginLeft: 12 },
  evTitle: { fontSize: 15, color: T.tx, fontFamily: T.fonts.bold, marginLeft: 12, marginBottom: 2 },
  evSub: { fontSize: 12, color: T.tx3, fontFamily: T.fonts.regular, marginLeft: 12, marginBottom: 10 },
  evSrcTx: { fontSize: 9, color: T.tx3, fontFamily: T.fonts.medium, textTransform: 'uppercase', marginTop: 12, marginRight: 12 },
  
  actBar: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 15 },
  abt: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: T.bo, backgroundColor: T.bg2 },
  abtTx: { fontSize: 12, color: T.tx, fontFamily: T.fonts.bold },

  wkHeader: { alignItems: 'center', paddingVertical: 10, borderRadius: 10, marginBottom: 8 },
  wkToday: { backgroundColor: T.bg3 },
  wkSel: { backgroundColor: T.gold },
  wkDn: { fontSize: 10, color: T.tx3, fontFamily: T.fonts.bold, textTransform: 'uppercase' },
  wkDt: { fontSize: 16, color: T.tx, fontFamily: T.fonts.bold },
  wkEv: { padding: 4, borderLeftWidth: 2, backgroundColor: T.bg2, marginBottom: 4, borderRadius: 4 },
  wkEvTx: { fontSize: 9, color: T.tx, fontFamily: T.fonts.medium },

  annGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, gap: 8 },
  annMonth: {
    width: '31%', backgroundColor: T.bg2, borderRadius: 10,
    borderWidth: 1, borderColor: T.bo, padding: 8, marginBottom: 8,
  },
  annMonthLbl: { fontSize: 11, color: T.gold, fontWeight: '700', textAlign: 'center', marginBottom: 6, textTransform: 'uppercase' },
  annDays: { flexDirection: 'row', flexWrap: 'wrap' },
  annDayCell: { width: `${100/7}%`, height: 12, alignItems: 'center', justifyContent: 'center' },
  annDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: T.bg4 },
  annDotOn: { backgroundColor: T.gold },

  dayHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: T.bo,
  },
  dayHeaderSub: { fontSize: 11, color: T.tx2, marginTop: 2 },

  slot: {
    flexDirection: 'row', minHeight: 32, paddingHorizontal: 16,
    borderTopWidth: 0.5, borderTopColor: T.bo,
  },
  slotHour: { borderTopWidth: 1, borderTopColor: T.bo2 },
  slotTime: { width: 50, fontSize: 11, color: T.tx, fontWeight: '600', paddingTop: 6 },
  slotTimeHalf: { color: T.tx3, fontWeight: '400' },
  slotContent: { flex: 1, paddingVertical: 4, paddingLeft: 8 },
  slotFree: { flex: 1, minHeight: 24 },
  slotEv: {
    backgroundColor: T.bg2, borderLeftWidth: 3, borderRadius: 6,
    padding: 8, marginBottom: 4,
    borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: T.bo,
  },
  slotEvTitle: { fontSize: 13, color: T.tx, fontWeight: '600' },
  slotEvSub: { fontSize: 10, color: T.tx2, marginTop: 2 },

  emptyBox: {
    marginHorizontal: 20, paddingVertical: 24, paddingHorizontal: 16,
    backgroundColor: T.bg2, borderRadius: 12, borderWidth: 1, borderColor: T.bo,
    alignItems: 'center',
  },
  emptyTx: { fontSize: 12, color: T.tx3, fontStyle: 'italic' },
});

const m = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  box: { backgroundColor: T.bg, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  title: { fontSize: 18, fontWeight: '700', color: T.tx, marginBottom: 16 },
  label: { fontSize: 11, color: T.tx2, fontWeight: '600', marginBottom: 6, marginTop: 4, textTransform: 'uppercase' },
  input: {
    backgroundColor: T.bg2, borderWidth: 1, borderColor: T.bo, borderRadius: 10,
    padding: 12, fontSize: 14, color: T.tx, marginBottom: 8,
  },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  catBtn: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16,
    borderWidth: 1, borderColor: T.bo, backgroundColor: T.bg2,
  },
  catTx: { fontSize: 12, color: T.tx, fontWeight: '600' },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  colorDotOn: { borderColor: T.tx },
  btns: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  btnCancel: { backgroundColor: T.bg3 },
  btnCancelTx: { color: T.tx, fontWeight: '600' },
  btnOk: { backgroundColor: T.gold },
  btnOkTx: { color: T.bg, fontWeight: '700' },
  btnDel: { backgroundColor: T.rd },
  btnDelTx: { color: T.bg, fontWeight: '700' },
});
