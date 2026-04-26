import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../constants/theme';
import { uid, ds } from '../utils/storage';
import { useAppState } from '../context/AppStateContext';

// Helper Alert cross-platform (Alert.alert ne s'affiche pas sur web)
function showAlert(title, message, buttons) {
  if (Platform.OS === 'web') {
    if (!buttons || buttons.length <= 1) {
      window.alert(`${title}\n\n${message}`);
      if (buttons && buttons[0]?.onPress) buttons[0].onPress();
    } else {
      const ok = window.confirm(`${title}\n\n${message}`);
      if (ok) {
        const action = buttons.find(b => b.style === 'destructive' || (b.style !== 'cancel' && b.onPress));
        if (action?.onPress) action.onPress();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
}

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { db, updateDb } = useAppState();

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(ds(new Date()));

  const tasks = db?.tasks || [];

  async function addTask() {
    if (!title.trim()) {
      showAlert('Titre requis', 'Saisis un titre pour la tâche.');
      return;
    }
    const newTask = {
      id: uid(),
      title: title.trim(),
      date,
      done: false,
      createdAt: new Date().toISOString(),
    };
    const newDb = { ...db, tasks: [...tasks, newTask] };
    await updateDb(newDb);
    setTitle('');
    setDate(ds(new Date()));
    setShowModal(false);
  }

  async function toggleDone(id) {
    const newTasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    await updateDb({ ...db, tasks: newTasks });
  }

  async function deleteTask(id) {
    showAlert('Supprimer', 'Supprimer cette tâche ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const newTasks = tasks.filter(t => t.id !== id);
          await updateDb({ ...db, tasks: newTasks });
        },
      },
    ]);
  }

  function renderItem({ item }) {
    return (
      <View style={s.taskCard}>
        <TouchableOpacity
          style={[s.checkbox, item.done && s.checkboxOn]}
          onPress={() => toggleDone(item.id)}
          activeOpacity={0.7}
        >
          {item.done && <Text style={s.checkMark}>✓</Text>}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.taskTitle, item.done && s.taskTitleDone]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={s.taskDate}>{item.date}</Text>
        </View>
        <TouchableOpacity onPress={() => deleteTask(item.id)} style={s.deleteBtn}>
          <Text style={s.deleteTx}>×</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + 10, paddingBottom: insets.bottom }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Tâches</Text>
        <Text style={s.headerSub}>{tasks.length} au total · {tasks.filter(t => !t.done).length} en cours</Text>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTx}>Aucune tâche pour le moment</Text>
            <Text style={s.emptySub}>Touche le bouton + pour en ajouter une</Text>
          </View>
        }
      />

      <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)} activeOpacity={0.85}>
        <Text style={s.fabTx}>+</Text>
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Nouvelle tâche</Text>

            <Text style={s.label}>Titre</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex : Appeler le médecin"
              placeholderTextColor={T.tx3}
            />

            <Text style={s.label}>Date (AAAA-MM-JJ)</Text>
            <TextInput
              style={s.input}
              value={date}
              onChangeText={setDate}
              placeholder="2026-04-26"
              placeholderTextColor={T.tx3}
            />

            <View style={s.modalBtns}>
              <TouchableOpacity style={[s.btn, s.btnCancel]} onPress={() => setShowModal(false)}>
                <Text style={s.btnCancelTx}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.btnOk]} onPress={addTask}>
                <Text style={s.btnOkTx}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: T.bo },
  headerTitle: { fontSize: 22, fontWeight: '700', color: T.tx },
  headerSub: { fontSize: 12, color: T.tx2, marginTop: 4 },

  taskCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: T.bg2,
    borderWidth: 1, borderColor: T.bo, borderRadius: 12, padding: 12, marginBottom: 10,
  },
  checkbox: {
    width: 26, height: 26, borderRadius: 6, borderWidth: 1.5, borderColor: T.bo2,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  checkboxOn: { backgroundColor: T.gold, borderColor: T.gold },
  checkMark: { color: T.bg, fontSize: 16, fontWeight: '700' },
  taskTitle: { fontSize: 14, color: T.tx, fontWeight: '600' },
  taskTitleDone: { textDecorationLine: 'line-through', color: T.tx3 },
  taskDate: { fontSize: 11, color: T.tx2, marginTop: 2 },
  deleteBtn: { paddingHorizontal: 8 },
  deleteTx: { fontSize: 22, color: T.tx3 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTx: { fontSize: 14, color: T.tx2, fontWeight: '600' },
  emptySub: { fontSize: 11, color: T.tx3, marginTop: 6 },

  fab: {
    position: 'absolute', right: 20, bottom: 80,
    width: 56, height: 56, borderRadius: 28, backgroundColor: T.gold,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  fabTx: { color: T.bg, fontSize: 30, fontWeight: '300', lineHeight: 32 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: T.bg, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: T.tx, marginBottom: 16 },
  label: { fontSize: 11, color: T.tx2, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: T.bg2, borderWidth: 1, borderColor: T.bo, borderRadius: 10,
    padding: 12, fontSize: 14, color: T.tx, marginBottom: 14,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  btnCancel: { backgroundColor: T.bg3 },
  btnCancelTx: { color: T.tx, fontWeight: '600' },
  btnOk: { backgroundColor: T.gold },
  btnOkTx: { color: T.bg, fontWeight: '700' },
});
