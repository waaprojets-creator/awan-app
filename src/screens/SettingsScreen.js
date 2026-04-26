import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Share, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, AV } from '../constants/theme';
import { buildIntegrity, parseAwanFile, validateDB } from '../utils/storage';
import { useAppState } from '../context/AppStateContext';

// Helpers cross-platform : Alert et Share natifs ne fonctionnent pas sur web
function showAlert(title, message, buttons) {
  if (Platform.OS === 'web') {
    if (!buttons || buttons.length <= 1) {
      window.alert(`${title}\n\n${message}`);
      if (buttons && buttons[0]?.onPress) buttons[0].onPress();
    } else {
      const ok = window.confirm(`${title}\n\n${message}`);
      if (ok) {
        const action = buttons.find(b => b.style === 'destructive' || b.style !== 'cancel');
        if (action?.onPress) action.onPress();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
}

async function shareData(content, title) {
  if (Platform.OS === 'web') {
    if (navigator.share) {
      try { await navigator.share({ text: content, title }); return; } catch (e) {}
    }
    // Fallback : copier dans le presse-papiers
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(content);
      window.alert('Données copiées dans le presse-papiers.');
      return;
    }
    window.alert('Partage non supporté par ce navigateur.');
  } else {
    await Share.share({ message: content, title });
  }
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { db, cfg, updateDb, updateCfg, lock } = useAppState();
  const [busy, setBusy] = useState(false);

  async function toggleDev() {
    await updateCfg({ ...cfg, dev: !cfg.dev });
  }

  async function togglePin() {
    if (!cfg.pinOn) {
      showAlert(
        'PIN non disponible',
        'La configuration du code PIN sera disponible dans le Sprint 2.'
      );
      return;
    }
    await updateCfg({ ...cfg, pinOn: false, pinHash: null });
  }

  async function exportData() {
    if (busy) return;
    setBusy(true);
    try {
      const pkg = {
        awan_format: 'backup',
        awan_version: AV,
        platform: 'apk',
        encrypted: false,
        created_at: new Date().toISOString(),
        integrity: buildIntegrity(db),
        payload: JSON.stringify(db),
      };
      const json = JSON.stringify(pkg, null, 2);
      await shareData(json, `AWAN_export_${new Date().toISOString().slice(0, 10)}.json`);
    } catch (e) {
      showAlert('Erreur export', e.message || 'Impossible d\'exporter');
    } finally {
      setBusy(false);
    }
  }

  async function importData() {
    showAlert(
      'Import',
      'L\'import depuis un fichier sera disponible dans une prochaine version. Pour l\'instant, l\'export fonctionne.',
      [{ text: 'OK' }]
    );
  }

  function confirmReset() {
    showAlert(
      'Réinitialiser',
      'Effacer toutes les données ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout effacer',
          style: 'destructive',
          onPress: async () => {
            const empty = {
              events: [], tasks: [], routines: [], meals: [], sport: [],
              mesures: [], pantry: [], pLog: [],
              obj: { kc: 0, pr: 0, gl: 0, li: 0 },
              cfg: { lat: 48.8566, lon: 2.3522 },
            };
            await updateDb(empty);
            showAlert('Fait', 'Données réinitialisées.');
          },
        },
      ]
    );
  }

  if (!cfg) {
    return (
      <View style={[s.container, { paddingTop: insets.top + 40 }]}>
        <Text style={s.empty}>Chargement…</Text>
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
        <Text style={s.headerTitle}>Réglages</Text>
        <Text style={s.headerSub}>Version {AV}</Text>
      </View>

      <Text style={s.sectionTitle}>Sécurité</Text>

      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.rowTitle}>Mode développeur</Text>
          <Text style={s.rowSub}>Déverrouillage automatique au lancement</Text>
        </View>
        <Switch
          value={!!cfg.dev}
          onValueChange={toggleDev}
          trackColor={{ false: T.bo2, true: T.gold }}
          thumbColor={T.bg2}
        />
      </View>

      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.rowTitle}>Code PIN</Text>
          <Text style={s.rowSub}>{cfg.pinOn ? 'Activé' : 'Désactivé (Sprint 2)'}</Text>
        </View>
        <Switch
          value={!!cfg.pinOn}
          onValueChange={togglePin}
          trackColor={{ false: T.bo2, true: T.gold }}
          thumbColor={T.bg2}
        />
      </View>

      <TouchableOpacity style={s.btnRow} onPress={lock} activeOpacity={0.7}>
        <Text style={s.btnRowTx}>🔒 Verrouiller maintenant</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>Données</Text>

      <TouchableOpacity style={s.btnRow} onPress={exportData} disabled={busy} activeOpacity={0.7}>
        <Text style={s.btnRowTx}>{busy ? 'Export en cours…' : '⤴ Exporter (partager JSON)'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.btnRow} onPress={importData} activeOpacity={0.7}>
        <Text style={s.btnRowTx}>⤵ Importer (à venir)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[s.btnRow, s.btnDanger]} onPress={confirmReset} activeOpacity={0.7}>
        <Text style={[s.btnRowTx, s.btnDangerTx]}>⚠ Tout effacer</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>À propos</Text>
      <View style={s.aboutBox}>
        <Text style={s.aboutTx}>AWAN — أوان</Text>
        <Text style={s.aboutSub}>Planning personnel sécurisé</Text>
        <Text style={s.aboutSub}>Version {AV}</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: T.bo, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: T.tx },
  headerSub: { fontSize: 12, color: T.tx2, marginTop: 4 },

  sectionTitle: {
    fontSize: 12, color: T.tx2, fontWeight: '700', textTransform: 'uppercase',
    paddingHorizontal: 20, marginTop: 20, marginBottom: 8, letterSpacing: 1,
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: T.bg2, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.bo,
    marginBottom: -1,
  },
  rowTitle: { fontSize: 14, color: T.tx, fontWeight: '600' },
  rowSub: { fontSize: 11, color: T.tx2, marginTop: 2 },

  btnRow: {
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: T.bg2, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.bo,
    marginBottom: -1,
  },
  btnRowTx: { fontSize: 14, color: T.tx, fontWeight: '600' },
  btnDanger: { borderColor: T.rd, backgroundColor: T.bg },
  btnDangerTx: { color: T.rd },

  aboutBox: {
    margin: 16, padding: 16, backgroundColor: T.bg2,
    borderRadius: 12, borderWidth: 1, borderColor: T.bo, alignItems: 'center',
  },
  aboutTx: { fontSize: 16, color: T.tx, fontWeight: '700' },
  aboutSub: { fontSize: 11, color: T.tx2, marginTop: 4 },

  empty: { padding: 40, textAlign: 'center', color: T.tx3 },
});
