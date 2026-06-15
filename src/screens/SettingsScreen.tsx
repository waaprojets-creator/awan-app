import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput as RNTextInput, Alert, Switch, Modal, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemeMode } from '../hooks/useTheme';
import { useAppStore } from '../store/appStore';
import { useAppState } from '../context/AppStateContext';
import { Shield, Database, Key, Trash2, Navigation, Brain, BookOpen, Check, X, Activity } from 'lucide-react-native';
import { HexagonLogo } from '../constants/icons';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { safeStorage } from '../utils/safeStorage';
import { moonMenuEvents } from '../utils/moonMenuEvents';
import { PageWrapper } from '../components/Animated';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';
import { getStorage } from '../data/storage/storageService';
import { DbFillGauge } from '../components/DbFillGauge';
import { L } from '../constants/labels';
import { SYMBOLS } from '../constants/symbols';
import { FontMono } from '../constants/typography';
import { Fs, Fw, Ls, Clr } from '../theme/tokens';

const TextInput = RNTextInput as React.ComponentType<any>;

const AWAN_LS_KEYS = [
  'awan.seed.loaded', 'awan.theme', 'awan.sport.activeSession',
  'awan.sport.bestOneRM', 'awan.sport.routineDraft', 'awan.mensuration.goals',
  'awan.nutrition.profile', 'awan.user.location', 'awan.coach.profiles',
];

type CoachProfile = 'bodybuilding' | 'sports_medicine' | 'nutrition' | 'streetworkout';
const COACH_PROFILES_KEY = 'awan.coach.profiles';
const DEFAULT_PROFILES: CoachProfile[] = ['bodybuilding', 'sports_medicine', 'nutrition'];
const PROFILE_IDS: CoachProfile[] = ['bodybuilding', 'sports_medicine', 'nutrition', 'streetworkout'];

function loadCoachProfiles(): CoachProfile[] {
  const raw = safeStorage.get(COACH_PROFILES_KEY);
  if (!raw) return DEFAULT_PROFILES;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_PROFILES;
    return parsed.filter((p): p is CoachProfile =>
      ['bodybuilding', 'sports_medicine', 'nutrition', 'streetworkout'].includes(p)
    );
  } catch { return DEFAULT_PROFILES; }
}

function buildExportFilename(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `awan${yy}${mm}${dd}v4.0.json`;
}

async function exportBackup(): Promise<{ ok: boolean; path?: string; error?: string }> {
  const storage = await getStorage();
  const json = await storage.exportAll();
  const filename = buildExportFilename();

  if (Platform.OS !== 'web') {
    try {
      const FileSystem = await import('expo-file-system');
      const Sharing = await import('expo-sharing');
      const uri = (FileSystem.documentDirectory ?? '') + filename;
      await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(uri);
      return { ok: true, path: filename };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function purgeAllData() {
  try {
    const storage = await getStorage();
    await storage.clear();
  } catch { /* ignore */ }
  AWAN_LS_KEYS.forEach(k => safeStorage.remove(k));
}

type DiagEntry = { label: string; value: string; ok?: boolean };

/** Constats runtime (preuves J0 : plateforme, backend de stockage, mode WAL, permissions). */
async function loadDiagnostics(): Promise<DiagEntry[]> {
  const entries: DiagEntry[] = [
    { label: 'PLATEFORME', value: `${Platform.OS.toUpperCase()} ${String(Platform.Version ?? '')}`.trim() },
  ];

  if (Platform.OS !== 'web') {
    try {
      const [{ SqliteStorage }, storage] = await Promise.all([
        import('../data/storage/SqliteStorage'),
        getStorage(),
      ]);
      if (storage instanceof SqliteStorage) {
        entries.push({ label: 'STOCKAGE', value: 'SQLITE (NATIF)' });
        const mode = await storage.getJournalMode();
        entries.push({ label: 'MODE JOURNAL', value: mode ? mode.toUpperCase() : 'INCONNU', ok: mode === 'wal' });
      } else {
        entries.push({ label: 'STOCKAGE', value: 'MÉMOIRE (SECOURS)', ok: false });
      }
    } catch {
      entries.push({ label: 'STOCKAGE', value: 'ERREUR DE LECTURE', ok: false });
    }

    try {
      const Notifications = await import('expo-notifications');
      const { status } = await Notifications.getPermissionsAsync();
      entries.push({ label: 'NOTIFICATIONS', value: status.toUpperCase(), ok: status === 'granted' });
    } catch {
      entries.push({ label: 'NOTIFICATIONS', value: 'INDISPONIBLE', ok: false });
    }
  } else {
    entries.push({ label: 'STOCKAGE', value: typeof indexedDB !== 'undefined' ? 'INDEXEDDB' : 'MÉMOIRE' });
  }

  return entries;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { db, updateDb } = useAppState() as any;
  const theme = useTheme();
  const themeMode = useThemeMode();
  const setTheme = useAppStore((s: any) => s.setTheme);
  const showNetworkBanner = useAppStore((s: any) => s.showNetworkBanner);
  const toggleNetworkBanner = useAppStore((s: any) => s.toggleNetworkBanner);
  const jitFactor = useAppStore((s: any) => s.jitFactor);
  const setJitFactor = useAppStore((s: any) => s.setJitFactor);
  const [purgeModal, setPurgeModal] = useState(false);
  const [purging, setPurging] = useState(false);
  const [diagModal, setDiagModal] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagEntries, setDiagEntries] = useState<DiagEntry[]>([]);
  const [pendingAction, setPendingAction] = useState<'cache' | 'export' | 'lock' | null>(null);
  const [cacheState, setCacheState] = useState<'idle' | 'loading' | 'ok'>('idle');
  const [exportState, setExportState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [exportMsg, setExportMsg] = useState('');
  const [coachProfiles, setCoachProfiles] = useState<CoachProfile[]>(loadCoachProfiles);

  useEffect(() => {
    safeStorage.set(COACH_PROFILES_KEY, JSON.stringify(coachProfiles));
  }, [coachProfiles]);

  const toggleCoachProfile = (id: CoachProfile) => {
    setCoachProfiles(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  if (!db) return null;
  const config = db.config || { corsApiKey: '', jitFactor: 1.2 };

  const updateCfg = (key: string, val: any) => {
    updateDb({ ...db, config: { ...config, [key]: val } });
  };

  const purgeCache = () => {
    if (cacheState === 'loading') return;
    setCacheState('loading');
    setTimeout(() => {
      updateDb({ ...db, tasks: (db.tasks || []).filter((t: any) => !t.done) });
      setCacheState('ok');
      setTimeout(() => setCacheState('idle'), 3000);
    }, 600);
  };

  const handlePurgeConfirm = async () => {
    setPurging(true);
    await purgeAllData();
    setPurging(false);
    setPurgeModal(false);
    navigation.navigate('Dashboard' as never);
  };

  const openDiagnostics = () => {
    setDiagModal(true);
    setDiagLoading(true);
    loadDiagnostics().then(entries => {
      setDiagEntries(entries);
      setDiagLoading(false);
    });
  };

  const THEME_LABELS: Record<string, string> = { light: 'LIGHT', dark: 'DARK', black: 'BLACK' };

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 150 }}
        style={{ flex: 1, backgroundColor: theme.bg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.sectionBorder, { borderBottomColor: theme.border }]}>
          <ScreenHeader tag="SYS" title="SYSTÈME" />
        </View>

        <View style={s.content}>

          {/* PERSONNALISATION */}
          <View style={s.section}>
            <Heading level={4} mono subtitle="Interface" style={s.sectionHeading}>PERSONNALISATION</Heading>
            <Touch
              onPress={() => {
                safeStorage.set('awan.moonmenu.pending-edit', '1');
                moonMenuEvents.emitOpenEdit();
                navigation.navigate('Dashboard' as never);
              }}
              style={[s.row88, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: Clr.white5 }]}
            >
              <View style={[s.iconBox, { backgroundColor: Clr.white5 }]}>
                <Navigation size={18} color={theme.mute} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.labelTitle, { color: theme.title }]}>MODIFIER MOONMENU</Text>
                <Text style={[s.labelDesc, { color: theme.mute }]}>Repositionner les nœuds de navigation · Ouvrir le menu lune</Text>
              </View>
            </Touch>
          </View>

          {/* PROFIL COACH */}
          <View style={s.section}>
            <Heading level={4} mono subtitle={L.coach.profile.sub} style={s.sectionHeading}>{L.coach.profile.section}</Heading>
            <View style={[s.card, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: Clr.white5 }]}>
              {PROFILE_IDS.map((id, idx) => {
                const active = coachProfiles.includes(id);
                const meta = L.coach.profile[id];
                return (
                  <Touch
                    key={id}
                    onPress={() => toggleCoachProfile(id)}
                    style={[s.profileRow, idx > 0 && { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' }]}
                  >
                    <View style={[s.iconBox, { backgroundColor: Clr.white5 }]}>
                      <Brain size={18} color={active ? theme.selected : theme.mute} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.labelTitle, { color: active ? theme.selected : theme.title }]}>{meta.label}</Text>
                      <Text style={[s.labelDesc, { color: theme.mute }]}>{meta.desc}</Text>
                    </View>
                    <Text style={[s.diamond, { color: active ? theme.selected : 'rgba(255,255,255,0.40)' }]}>
                      {active ? SYMBOLS.diamondFilled : SYMBOLS.diamondOutline}
                    </Text>
                  </Touch>
                );
              })}
            </View>
            <Text style={[s.helpText, { color: theme.mute }]}>{L.coach.profile.help}</Text>
          </View>

          {/* THÈME */}
          <View style={s.section}>
            <Heading level={4} mono subtitle="Apparence Visuelle" style={s.sectionHeading}>THÈME D'AFFICHAGE</Heading>
            <Card variant="flat" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: Clr.white5 }}>
              <View style={s.themeModeRow}>
                <View>
                  <Text style={[s.labelTitle, { color: theme.title }]}>MODE ACTIF</Text>
                  <Text style={[s.labelDesc, { color: theme.mute }]}>Bascule clair / sombre</Text>
                </View>
                <Text style={[s.themeActive, { color: theme.selected }]}>{THEME_LABELS[themeMode] ?? 'LIGHT'}</Text>
              </View>
              <View style={[s.themePicker, { backgroundColor: theme.surface }]}>
                {(['light', 'dark', 'black'] as const).map(m => (
                  <Touch
                    key={m}
                    onPress={() => setTheme(m)}
                    style={[s.themeBtn, { backgroundColor: themeMode === m ? theme.selected : 'transparent' }]}
                  >
                    <Text style={[s.labelMd, { color: themeMode === m ? '#000' : theme.mute }]}>{m.toUpperCase()}</Text>
                  </Touch>
                ))}
              </View>
            </Card>
          </View>

          {/* PALETTE */}
          <View style={s.section}>
            <Heading level={4} mono subtitle="Couleurs Utilisateur" style={s.sectionHeading}>PALETTE DISPONIBLE</Heading>
            <Card variant="flat" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: Clr.white5 }}>
              <View style={s.palette}>
                {theme.palette.map((color, idx) => (
                  <View key={idx} style={s.paletteItem}>
                    <View style={[s.paletteColor, { backgroundColor: color, borderColor: Clr.white10 }]} />
                    <Text style={[s.labelXs, { color: theme.mute }]}>P{idx}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>

          {/* CONNECTIVITÉ */}
          <View style={s.section}>
            <Heading level={4} mono subtitle="Indicateurs Réseau" style={s.sectionHeading}>CONNECTIVITÉ</Heading>
            <View style={[s.card, { backgroundColor: theme.surface, borderColor: Clr.white5 }]}>
              <View style={s.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.labelTitle, { color: theme.title }]}>BANDEAU HORS-LIGNE</Text>
                  <Text style={[s.labelDesc, { color: theme.mute }]}>Afficher un indicateur si réseau absent</Text>
                </View>
                <Switch
                  value={showNetworkBanner}
                  onValueChange={toggleNetworkBanner}
                  trackColor={{ false: 'rgba(255,255,255,0.08)', true: theme.statusWarn }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>

          {/* ORS */}
          <View style={s.section}>
            <Heading level={4} mono subtitle="Intégrations Externes" style={s.sectionHeading}>PROTOCOLES ORS</Heading>
            <View style={[s.card, { backgroundColor: theme.surface, borderColor: Clr.white5, marginBottom: 8 }]}>
              <View style={s.inputRow}>
                <Key size={16} color={theme.selected} style={{ marginRight: 16 }} />
                <TextInput
                  style={[s.textInput, { color: theme.title }]}
                  placeholder="API_KEY_ORS..."
                  placeholderTextColor="rgba(255,255,255,0.1)"
                  value={config.corsApiKey}
                  onChangeText={(t: string) => updateCfg('corsApiKey', t)}
                  secureTextEntry
                />
              </View>
            </View>
            <Text style={[s.labelSmall, { color: theme.mute }]}>
              Requis pour les calculs de vecteurs géographiques et routiers.
            </Text>
          </View>

          {/* JIT */}
          <View style={s.section}>
            <Heading level={4} mono subtitle="Optimisation Temporelle" style={s.sectionHeading}>PARAMÈTRES JIT</Heading>
            <Card variant="flat" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: Clr.white5 }}>
              <View style={s.themeModeRow}>
                <View>
                  <Text style={[s.labelTitle, { color: theme.title }]}>FACTEUR JIT</Text>
                  <Text style={[s.labelDesc, { color: theme.mute }]}>Marge de sécurité temporelle</Text>
                </View>
                <Text style={[s.themeActive, { color: theme.selected }]}>{jitFactor.toFixed(1)}x</Text>
              </View>
              <View style={[s.themePicker, { backgroundColor: theme.surface }]}>
                {[1.0, 1.1, 1.2, 1.3, 1.4, 1.5].map(v => {
                  const active = Math.abs(jitFactor - v) < 0.01;
                  return (
                    <Touch key={v} onPress={() => setJitFactor(v)}
                      style={[s.themeBtn, { backgroundColor: active ? theme.selected : 'transparent' }]}>
                      <Text style={[s.labelMd, { color: active ? '#000' : 'rgba(255,255,255,0.20)' }]}>{v.toFixed(1)}</Text>
                    </Touch>
                  );
                })}
              </View>
            </Card>
          </View>

          {/* MANIFESTE */}
          <View style={s.section}>
            <Heading level={4} mono subtitle="Identité & Vision" style={s.sectionHeading}>MANIFESTE</Heading>
            <Touch
              onPress={() => navigation.navigate('Philosophie' as never)}
              style={[s.row88, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: Clr.white5 }]}
            >
              <View style={[s.iconBox, { backgroundColor: 'rgba(212,175,55,0.10)' }]}>
                <BookOpen size={18} color={theme.selected} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.labelTitle, { color: theme.title }]}>PHILOSOPHIE AWAN</Text>
                <Text style={[s.labelDesc, { color: theme.mute }]}>La devise · Les trois temps · Les 8 principes</Text>
              </View>
            </Touch>
          </View>

          {/* DIAGNOSTIC */}
          <View style={s.section}>
            <Heading level={4} mono subtitle="Vérification Runtime" style={s.sectionHeading}>DIAGNOSTIC SYSTÈME</Heading>
            <Touch
              onPress={openDiagnostics}
              style={[s.row88, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: Clr.white5 }]}
            >
              <View style={[s.iconBox, { backgroundColor: Clr.white5 }]}>
                <Activity size={18} color={theme.mute} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.labelTitle, { color: theme.title }]}>DIAGNOSTIC SYSTÈME</Text>
                <Text style={[s.labelDesc, { color: theme.mute }]}>Plateforme · Stockage · Mode journal · Notifications</Text>
              </View>
            </Touch>
          </View>

          {/* PROTOCOLES CRITIQUES */}
          <View style={{ marginBottom: 48 }}>
            <Heading level={4} mono subtitle="Maintenance & Sécurité" style={s.sectionHeading}>PROTOCOLES CRITIQUES</Heading>
            <View style={{ gap: 16 }}>
              <DbFillGauge />

              {/* OPTIMISATION CACHE */}
              <Touch
                onPress={() => pendingAction === null && cacheState === 'idle' ? setPendingAction('cache') : undefined}
                style={[s.criticalRow, {
                  borderColor: pendingAction === 'cache' ? 'rgba(212,175,55,0.40)' : Clr.white5,
                  backgroundColor: pendingAction === 'cache' ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)',
                }]}
              >
                {pendingAction === 'cache' ? (
                  <View style={s.confirmRow}>
                    <Text style={[s.labelTitle, { color: theme.selected }]}>CONFIRMER L'OPTIMISATION ?</Text>
                    <View style={s.confirmBtns}>
                      <Touch onPress={() => { setPendingAction(null); purgeCache(); }} style={s.confirmYes}>
                        <Text style={[s.labelBtn, { color: '#000' }]}>OUI</Text>
                      </Touch>
                      <Touch onPress={() => setPendingAction(null)} style={[s.confirmNo, { borderColor: Clr.white10 }]}>
                        <Text style={[s.labelBtn, { color: theme.mute }]}>NON</Text>
                      </Touch>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={[s.iconBox, { backgroundColor: Clr.white5 }]}>
                      {cacheState === 'loading' && <ActivityIndicator size="small" color={theme.selected} />}
                      {cacheState === 'ok'      && <Check size={18} color={theme.statusOk} />}
                      {cacheState === 'idle'    && <HexagonLogo size={20} color={theme.mute} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.labelTitle, { color: theme.title }]}>OPTIMISATION CACHE</Text>
                      {cacheState === 'idle'    && <Text style={[s.labelDesc, { color: theme.mute }]}>Nettoyage des archives terminées</Text>}
                      {cacheState === 'loading' && <Text style={[s.labelDesc, { color: theme.mute }]}>OPTIMISATION EN COURS…</Text>}
                      {cacheState === 'ok'      && <Text style={[s.labelDesc, { color: theme.statusOk }]}>Cache optimisé</Text>}
                    </View>
                  </>
                )}
              </Touch>

              {/* EXPORTATION NOYAU */}
              <Touch
                onPress={() => pendingAction === null && exportState === 'idle' ? setPendingAction('export') : undefined}
                style={[s.criticalRow, {
                  borderColor: pendingAction === 'export' ? 'rgba(212,175,55,0.40)' : Clr.white5,
                  backgroundColor: pendingAction === 'export' ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)',
                }]}
              >
                {pendingAction === 'export' ? (
                  <View style={s.confirmRow}>
                    <Text style={[s.labelTitle, { color: theme.selected }]}>CONFIRMER L'EXPORT ?</Text>
                    <View style={s.confirmBtns}>
                      <Touch onPress={async () => {
                        setPendingAction(null);
                        setExportState('loading');
                        setExportMsg('');
                        const result = await exportBackup();
                        if (result.ok) {
                          setExportState('ok');
                          setExportMsg(result.path ? `Enregistré dans ${result.path}` : 'Fichier téléchargé');
                        } else {
                          setExportState('error');
                          setExportMsg(result.error ?? 'Erreur inconnue');
                        }
                        setTimeout(() => setExportState('idle'), 4000);
                      }} style={s.confirmYes}>
                        <Text style={[s.labelBtn, { color: '#000' }]}>OUI</Text>
                      </Touch>
                      <Touch onPress={() => setPendingAction(null)} style={[s.confirmNo, { borderColor: Clr.white10 }]}>
                        <Text style={[s.labelBtn, { color: theme.mute }]}>NON</Text>
                      </Touch>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={[s.iconBox, { backgroundColor: Clr.white5 }]}>
                      {exportState === 'loading' && <ActivityIndicator size="small" color={theme.selected} />}
                      {exportState === 'ok'      && <Check size={18} color={theme.statusOk} />}
                      {exportState === 'error'   && <X size={18} color={theme.danger} />}
                      {exportState === 'idle'    && <Database size={18} color={theme.mute} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.labelTitle, { color: theme.title }]}>EXPORTATION NOYAU</Text>
                      {exportState === 'idle'    && <Text style={[s.labelDesc, { color: theme.mute }]}>Écrit {buildExportFilename()} dans Téléchargements</Text>}
                      {exportState === 'loading' && <Text style={[s.labelDesc, { color: theme.mute }]}>EXPORT EN COURS…</Text>}
                      {exportState === 'ok'      && <Text style={[s.labelDesc, { color: theme.statusOk }]}>{exportMsg}</Text>}
                      {exportState === 'error'   && <Text style={[s.labelDesc, { color: theme.danger }]}>{exportMsg}</Text>}
                    </View>
                  </>
                )}
              </Touch>

              {/* VERROUILLAGE BIOMÉTRIQUE */}
              <Touch
                onPress={() => pendingAction === null ? setPendingAction('lock') : undefined}
                style={[s.criticalRow, {
                  borderColor: pendingAction === 'lock'
                    ? 'rgba(212,175,55,0.40)'
                    : config.isLocked ? `${theme.danger}4D` : Clr.white5,
                  backgroundColor: pendingAction === 'lock'
                    ? 'rgba(212,175,55,0.08)'
                    : config.isLocked ? `${theme.danger}1A` : 'rgba(255,255,255,0.03)',
                }]}
              >
                {pendingAction === 'lock' ? (
                  <View style={s.confirmRow}>
                    <Text style={[s.labelTitle, { color: theme.selected }]}>
                      {config.isLocked ? 'DÉVERROUILLER ?' : 'VERROUILLER ?'}
                    </Text>
                    <View style={s.confirmBtns}>
                      <Touch onPress={() => { setPendingAction(null); updateCfg('isLocked', !config.isLocked); }} style={s.confirmYes}>
                        <Text style={[s.labelBtn, { color: '#000' }]}>OUI</Text>
                      </Touch>
                      <Touch onPress={() => setPendingAction(null)} style={[s.confirmNo, { borderColor: Clr.white10 }]}>
                        <Text style={[s.labelBtn, { color: theme.mute }]}>NON</Text>
                      </Touch>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={[s.iconBox, { backgroundColor: config.isLocked ? `${theme.danger}33` : Clr.white5 }]}>
                      <Shield size={18} color={config.isLocked ? theme.danger : theme.mute} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.labelTitle, { color: config.isLocked ? theme.danger : theme.title }]}>
                        VERROUILLAGE BIOMÉTRIQUE
                      </Text>
                      <Text style={[s.labelDesc, { color: theme.mute }]}>
                        {config.isLocked ? 'Terminal verrouillé — toucher pour déverrouiller' : 'Isolation du terminal actif'}
                      </Text>
                    </View>
                    <Switch
                      value={!!config.isLocked}
                      onValueChange={() => setPendingAction('lock')}
                      trackColor={{ false: theme.surface, true: theme.danger }}
                      thumbColor={config.isLocked ? '#fff' : theme.mute}
                    />
                  </>
                )}
              </Touch>

              {/* PURGE */}
              <Touch
                onPress={() => setPurgeModal(true)}
                style={[s.criticalRow, { backgroundColor: `${theme.danger}1A`, borderColor: `${theme.danger}4D` }]}
              >
                <View style={[s.iconBox, { backgroundColor: `${theme.danger}33` }]}>
                  <Trash2 size={18} color={theme.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.labelTitle, { color: theme.danger }]}>PURGE DONNÉES PERSONNELLES</Text>
                  <Text style={[s.labelDesc, { color: theme.mute }]}>Suppression totale et irréversible</Text>
                </View>
              </Touch>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal purge */}
      <Modal visible={purgeModal} transparent statusBarTranslucent animationType="fade" onRequestClose={() => !purging && setPurgeModal(false)}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlayDeep }]} onPress={() => !purging && setPurgeModal(false)} />
        <View style={s.modalOuter}>
          <View style={[s.modalInner, { backgroundColor: theme.surface, borderColor: `${theme.danger}4D` }]}>
            <Text style={[s.labelXs, { color: theme.danger, marginBottom: 8 }]}>— OPÉRATION CRITIQUE —</Text>
            <Text style={[s.purgeTitle, { color: theme.title }]}>Purge totale</Text>
            <Text style={[s.purgeBody, { color: theme.mute }]}>
              Cette opération supprime définitivement toutes les données personnelles : séances, mesures, repas, prières, journal. Aucune récupération possible.
            </Text>
            <View style={{ gap: 12 }}>
              <Touch
                onPress={handlePurgeConfirm}
                style={[s.purgeConfirmBtn, { backgroundColor: theme.danger, opacity: purging ? 0.5 : 1 }]}
              >
                {purging && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 12 }} />}
                <Text style={[s.labelBtn, { color: '#fff' }]}>
                  {purging ? 'SUPPRESSION…' : 'Purger données personnelles'}
                </Text>
              </Touch>
              <Touch
                onPress={() => setPurgeModal(false)}
                style={[s.purgeCancelBtn, { borderColor: Clr.white10 }]}
              >
                <Text style={[s.labelMd, { color: theme.mute }]}>Annuler</Text>
              </Touch>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal diagnostic */}
      <Modal visible={diagModal} transparent statusBarTranslucent animationType="fade" onRequestClose={() => setDiagModal(false)}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlayDeep }]} onPress={() => setDiagModal(false)} />
        <View style={s.modalOuter}>
          <View style={[s.modalInner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[s.labelXs, { color: theme.selected, marginBottom: 8 }]}>— ÉTAT RUNTIME —</Text>
            <Text style={[s.purgeTitle, { color: theme.title }]}>Diagnostic système</Text>
            {diagLoading ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.selected} />
              </View>
            ) : (
              <View style={{ marginBottom: 24 }}>
                {diagEntries.map((entry, idx) => (
                  <View key={entry.label} style={[s.diagRow, idx > 0 && { borderTopWidth: 1, borderTopColor: Clr.white5 }]}>
                    <Text style={[s.labelDesc, { color: theme.mute }]}>{entry.label}</Text>
                    <Text style={[s.labelTitle, {
                      marginBottom: 0,
                      color: entry.ok === true ? theme.statusOk : entry.ok === false ? theme.danger : theme.title,
                    }]}>
                      {entry.value}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <Touch onPress={() => setDiagModal(false)} style={[s.purgeCancelBtn, { borderColor: Clr.white10 }]}>
              <Text style={[s.labelMd, { color: theme.mute }]}>Fermer</Text>
            </Touch>
          </View>
        </View>
      </Modal>
    </PageWrapper>
  );
}

const s = StyleSheet.create({
  sectionBorder: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1 },
  content: { padding: 24 },
  section: { marginBottom: 40 },
  sectionHeading: { marginBottom: 24 },
  card: { borderWidth: 1, overflow: 'hidden' },
  row88: { minHeight: 88, borderWidth: 1, padding: 24, flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 12 },
  iconBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  labelTitle: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.body_033, marginBottom: 4 },
  labelDesc: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.tight },
  diamond: { fontFamily: FontMono, fontSize: Fs.body, fontWeight: Fw.display },
  helpText: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.tight, paddingHorizontal: 4, marginTop: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 20, height: 80 },
  themeModeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  themeActive: { fontFamily: FontMono, fontSize: 24, fontWeight: Fw.display },
  themePicker: { flexDirection: 'row', padding: 4, gap: 4 },
  themeBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  paletteItem: { alignItems: 'center', gap: 8 },
  paletteColor: { width: 48, height: 48, borderWidth: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 64 },
  textInput: { flex: 1, fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase' },
  criticalRow: { minHeight: 88, borderWidth: 1, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 20 },
  confirmRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  confirmBtns: { flexDirection: 'row', gap: 8 },
  confirmYes: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: 'rgba(212,175,55,1)', alignItems: 'center', justifyContent: 'center' },
  confirmNo: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: Clr.white5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalOuter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalInner: { width: '100%', maxWidth: 360, padding: 32, borderWidth: 1 },
  diagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  purgeTitle: { fontFamily: FontMono, fontSize: 18, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.body_005, marginBottom: 12 },
  purgeBody: { fontFamily: FontMono, fontSize: Fs.body, fontWeight: Fw.value, lineHeight: 22, marginBottom: 24 },
  purgeConfirmBtn: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  purgeCancelBtn: { height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  labelXs: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.xs_02 },
  labelSmall: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.body_033, lineHeight: 20 },
  labelMd: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.md_02 },
  labelBtn: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.body_033 },
});
