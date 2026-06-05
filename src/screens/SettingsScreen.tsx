import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, TextInput as RNTextInput, Alert, Switch } from 'react-native';

const TextInput = RNTextInput as React.ComponentType<any>;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemeMode } from '../hooks/useTheme';
import { useAppStore } from '../store/appStore';
import { useAppState } from '../context/AppStateContext';
import { Shield, Database, Key, Trash2, Navigation, Brain, BookOpen, Check, X } from 'lucide-react';
import { HexagonLogo } from '../constants/icons';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { safeStorage } from '../utils/safeStorage';
import { PageWrapper } from '../components/Animated';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';
import { getStorage } from '../data/storage/storageService';
import { DbFillGauge } from '../components/DbFillGauge';
import { motion, AnimatePresence } from 'motion/react';
import { L } from '../constants/labels';
import { SYMBOLS } from '../constants/symbols';

const AWAN_LS_KEYS = [
  'awan.seed.loaded',
  'awan.theme',
  'awan.sport.activeSession',
  'awan.sport.bestOneRM',
  'awan.sport.routineDraft',
  'awan.mensuration.goals',
  'awan.nutrition.profile',
  'awan.user.location',
  'awan.coach.profiles',
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
    const valid: CoachProfile[] = parsed.filter((p): p is CoachProfile =>
      ['bodybuilding', 'sports_medicine', 'nutrition', 'streetworkout'].includes(p)
    );
    return valid;
  } catch { return DEFAULT_PROFILES; }
}

function buildExportFilename(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `awan${yy}${mm}${dd}v4.0.json`;
}

function isNativePlatform(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

async function exportBackup(): Promise<{ ok: boolean; path?: string; error?: string }> {
  const storage = await getStorage();
  const json = await storage.exportAll();
  const filename = buildExportFilename();

  if (isNativePlatform()) {
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

  // Web fallback
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
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
  AWAN_LS_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
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
 const [pendingAction, setPendingAction] = useState<'cache' | 'export' | 'lock' | null>(null);
 const [cacheState, setCacheState] = useState<'idle' | 'loading' | 'ok'>('idle');
 const [exportState, setExportState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
 const [exportMsg, setExportMsg] = useState('');
 const [coachProfiles, setCoachProfiles] = useState<CoachProfile[]>(loadCoachProfiles);

 useEffect(() => {
   safeStorage.set(COACH_PROFILES_KEY, JSON.stringify(coachProfiles));
 }, [coachProfiles]);

 const toggleCoachProfile = (id: CoachProfile) => {
   setCoachProfiles(prev =>
     prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
   );
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
 window.location.reload();
 };

 return (
 <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
 <ScrollView
 contentContainerStyle={{ paddingBottom: 150 }}
 style={{ flex: 1 }}
 showsVerticalScrollIndicator={false}
 >
 <div className="px-6 pt-4 pb-4 border-b" style={{ borderBottomColor: theme.border }}>
 <ScreenHeader tag="SYS" title="SYSTÈME" />
 </div>

 <div className="p-6">

 {/* PERSONNALISATION */}
 <div className="mb-10">
 <Heading level={4} mono subtitle="Interface" className="mb-6">PERSONNALISATION</Heading>
 <Touch
   onPress={() => {
     safeStorage.set('awan.moonmenu.pending-edit', '1');
     window.dispatchEvent(new Event('moonmenu:open-edit'));
     navigation.navigate('Dashboard' as never);
   }}
   className="bg-white/3 border border-white/5 p-6 flex-row items-center gap-5 mb-3"
 >
   <div className="w-10 h-10 bg-white/5 flex items-center justify-center">
     <Navigation size={18} className="text-awan-tx-mute" />
   </div>
   <div className="flex-1">
     <span className="text-xs font-black text-awan-tx uppercase tracking-widest block mb-1">MODIFIER MOONMENU</span>
     <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-tighter">Repositionner les nœuds de navigation · Ouvrir le menu lune</span>
   </div>
 </Touch>
 </div>

 {/* PROFIL COACH */}
 <div className="mb-10">
 <Heading level={4} mono subtitle={L.coach.profile.sub} className="mb-6">{L.coach.profile.section}</Heading>
 <Card className="p-0 bg-white/3 border-white/5 overflow-hidden" variant="flat">
 {PROFILE_IDS.map((id, idx) => {
   const active = coachProfiles.includes(id);
   const meta = L.coach.profile[id];
   return (
     <Touch
       key={id}
       onPress={() => toggleCoachProfile(id)}
       className={`flex flex-row items-center gap-5 px-5 h-20 ${idx > 0 ? 'border-t border-white/[0.04]' : ''}`}
     >
       <div className="w-10 h-10 bg-white/5 flex items-center justify-center">
         <Brain size={18} className={active ? 'text-awan-gold' : 'text-awan-tx-mute'} />
       </div>
       <div className="flex-1">
         <span className={`text-xs font-black uppercase tracking-widest block mb-1 ${active ? 'text-awan-gold' : 'text-awan-tx'}`}>
           {meta.label}
         </span>
         <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-tighter">{meta.desc}</span>
       </div>
       <span className={`text-base font-black font-mono ${active ? 'text-awan-gold' : 'text-white/40'}`}>
         {active ? SYMBOLS.diamondFilled : SYMBOLS.diamondOutline}
       </span>
     </Touch>
   );
 })}
 </Card>
 <span className="awan-label-sm text-awan-tx-mute leading-relaxed px-1 mt-3 block">
   {L.coach.profile.help}
 </span>
 </div>

 {/* THÈME */}
 <div className="mb-10">
 <Heading level={4} mono subtitle="Apparence Visuelle" className="mb-6">THÈME D'AFFICHAGE</Heading>
 <Card className="p-6 bg-white/3 border-white/5" variant="flat">
 <div className="flex flex-row justify-between items-center mb-6">
 <div>
 <span className="text-xs font-black text-awan-tx uppercase tracking-widest block mb-1">MODE ACTIF</span>
 <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-tighter">Bascule clair / sombre</span>
 </div>
 <span className="text-2xl font-black text-awan-gold font-mono">{{ light: 'LIGHT', dark: 'DARK', black: 'BLACK' }[themeMode] ?? 'LIGHT'}</span>
 </div>
 <div className="flex flex-row bg-awan-surface p-1 gap-1">
 <Touch onPress={() => setTheme('light')}
 className={`flex-1 py-3 items-center justify-center ${themeMode === 'light' ? 'bg-awan-gold' : 'transparent'}`}>
 <span className={`text-awan-md font-black font-mono ${themeMode === 'light' ? 'text-black' : 'text-awan-tx-mute'}`}>LIGHT</span>
 </Touch>
 <Touch onPress={() => setTheme('dark')}
 className={`flex-1 py-3 items-center justify-center ${themeMode === 'dark' ? 'bg-awan-gold' : 'transparent'}`}>
 <span className={`text-awan-md font-black font-mono ${themeMode === 'dark' ? 'text-black' : 'text-awan-tx-mute'}`}>DARK</span>
 </Touch>
 <Touch onPress={() => setTheme('black')}
 className={`flex-1 py-3 items-center justify-center ${themeMode === 'black' ? 'bg-awan-gold' : 'transparent'}`}>
 <span className={`text-awan-md font-black font-mono ${themeMode === 'black' ? 'text-black' : 'text-awan-tx-mute'}`}>BLACK</span>
 </Touch>
 </div>
 </Card>
 </div>

 {/* PALETTE */}
 <div className="mb-10">
 <Heading level={4} mono subtitle="Couleurs Utilisateur" className="mb-6">PALETTE DISPONIBLE</Heading>
 <Card className="p-6 bg-white/3 border-white/5" variant="flat">
 <div className="grid grid-cols-5 gap-3 mb-4">
 {theme.palette.map((color, idx) => (
 <div key={idx} className="flex flex-col items-center gap-2">
 <div className="w-12 h-12 border border-white/10" style={{ backgroundColor: color }} />
 <span className="text-awan-xs font-black text-awan-tx-mute font-mono tracking-widest">P{idx}</span>
 </div>
 ))}
 </div>
 </Card>
 </div>

 {/* CONNECTIVITÉ */}
 <div className="mb-10">
 <Heading level={4} mono subtitle="Indicateurs Réseau" className="mb-6">CONNECTIVITÉ</Heading>
 <Card className="p-0 border-white/5 bg-awan-surface overflow-hidden">
 <div className="flex flex-row justify-between items-center p-5">
 <div>
 <span className="text-xs font-black text-awan-tx uppercase tracking-widest block mb-1">BANDEAU HORS-LIGNE</span>
 <span className="text-awan-sm font-bold text-awan-tx-mute">Afficher un indicateur si réseau absent</span>
 </div>
 <Switch
 value={showNetworkBanner}
 onValueChange={toggleNetworkBanner}
 trackColor={{ false: 'rgba(255,255,255,0.08)', true: theme.statusWarn }}
 thumbColor="#fff"
 />
 </div>
 </Card>
 </div>

 {/* ORS */}
 <div className="mb-10">
 <Heading level={4} mono subtitle="Intégrations Externes" className="mb-6">PROTOCOLES ORS</Heading>
 <Card className="p-0 border-white/5 bg-awan-surface overflow-hidden shadow-inner mb-4">
 <div className="flex flex-row items-center px-5 h-16">
 <Key size={16} className="text-awan-gold mr-4" />
 <TextInput
 className="flex-1 text-sm font-black text-awan-tx outline-none bg-transparent font-mono"
 placeholder="API_KEY_ORS..."
 placeholderTextColor="rgba(255,255,255,0.1)"
 value={config.corsApiKey}
 onChangeText={(t: string) => updateCfg('corsApiKey', t)}
 secureTextEntry
 />
 </div>
 </Card>
 <span className="text-awan-sm font-black text-awan-tx-mute uppercase tracking-widest leading-relaxed px-1">
 Requis pour les calculs de vecteurs géographiques et routiers.
 </span>
 </div>

 {/* JIT */}
 <div className="mb-10">
 <Heading level={4} mono subtitle="Optimisation Temporelle" className="mb-6">PARAMÈTRES JIT</Heading>
 <Card className="p-6 bg-white/3 border-white/5" variant="flat">
 <div className="flex flex-row justify-between items-center mb-6">
 <div>
 <span className="text-xs font-black text-awan-tx uppercase tracking-widest block mb-1">FACTEUR JIT</span>
 <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-tighter">Marge de sécurité temporelle</span>
 </div>
 <span className="text-2xl font-black text-awan-gold font-mono">{jitFactor.toFixed(1)}x</span>
 </div>
 <div className="flex flex-row bg-awan-surface p-1 gap-1">
 {[1.0, 1.1, 1.2, 1.3, 1.4, 1.5].map(v => {
 const active = Math.abs(jitFactor - v) < 0.01;
 return (
 <Touch key={v} onPress={() => setJitFactor(v)}
 className={`flex-1 py-3 items-center justify-center ${active ? 'bg-awan-gold' : 'bg-transparent'}`}>
 <span className={`text-awan-md font-black font-mono ${active ? 'text-black' : 'text-white/20'}`}>{v.toFixed(1)}</span>
 </Touch>
 );
 })}
 </div>
 </Card>
 </div>

 {/* MANIFESTE */}
 <div className="mb-10">
 <Heading level={4} mono subtitle="Identité & Vision" className="mb-6">MANIFESTE</Heading>
 <Touch onPress={() => navigation.navigate('Philosophie' as never)} className="bg-white/3 border border-white/5 p-6 flex-row items-center gap-5">
   <div className="w-10 h-10 bg-awan-gold/10 flex items-center justify-center">
     <BookOpen size={18} color={theme.selected} />
   </div>
   <div className="flex-1">
     <span className="text-xs font-black text-awan-tx uppercase tracking-widest block mb-1">PHILOSOPHIE AWAN</span>
     <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-tighter">La devise · Les trois temps · Les 8 principes</span>
   </div>
 </Touch>
 </div>

 {/* PROTOCOLES CRITIQUES */}
 <div className="mb-12">
 <Heading level={4} mono subtitle="Maintenance & Sécurité" className="mb-6">PROTOCOLES CRITIQUES</Heading>
 <div className="flex flex-col gap-4">
 <DbFillGauge />

 {/* OPTIMISATION CACHE */}
 <Touch
   onPress={() => pendingAction === null && cacheState === 'idle' ? setPendingAction('cache') : undefined}
   className={`min-h-[88px] border p-5 flex-row items-center gap-5 ${pendingAction === 'cache' ? 'bg-awan-gold/8 border-awan-gold/40' : 'bg-white/3 border-white/5'}`}
 >
   {pendingAction === 'cache' ? (
     <div className="flex-1 flex flex-row items-center justify-between gap-3">
       <span className="text-xs font-black text-awan-gold uppercase tracking-widest">CONFIRMER L'OPTIMISATION ?</span>
       <div className="flex flex-row gap-2">
         <Touch onPress={() => { setPendingAction(null); purgeCache(); }} className="px-5 py-2 bg-awan-gold items-center justify-center">
           <span className="text-xs font-black text-black uppercase tracking-widest font-mono">OUI</span>
         </Touch>
         <Touch onPress={() => setPendingAction(null)} className="px-5 py-2 bg-white/5 border border-white/10 items-center justify-center">
           <span className="text-xs font-black text-awan-tx-mute uppercase tracking-widest font-mono">NON</span>
         </Touch>
       </div>
     </div>
   ) : (
     <>
       <div className="w-10 h-10 bg-white/5 flex items-center justify-center flex-shrink-0">
         {cacheState === 'loading' && <div style={{ animation: 'spin 1s linear infinite' }}><HexagonLogo size={20} color={theme.selected} /></div>}
         {cacheState === 'ok'      && <Check size={18} color={theme.statusOk} />}
         {cacheState === 'idle'    && <HexagonLogo size={20} color={theme.mute} />}
       </div>
       <div className="flex-1">
         <span className="text-xs font-black text-awan-tx uppercase tracking-widest block mb-1">OPTIMISATION CACHE</span>
         {cacheState === 'idle'    && <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-tighter">Nettoyage des archives terminées</span>}
         {cacheState === 'loading' && <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-tighter">OPTIMISATION EN COURS…</span>}
         {cacheState === 'ok'      && <span className="text-awan-sm font-bold uppercase tracking-tighter" style={{ color: theme.statusOk }}>Cache optimisé</span>}
       </div>
     </>
   )}
 </Touch>

 {/* EXPORTATION NOYAU */}
 <Touch
   onPress={() => pendingAction === null && exportState === 'idle' ? setPendingAction('export') : undefined}
   className={`min-h-[88px] border p-5 flex-row items-center gap-5 ${pendingAction === 'export' ? 'bg-awan-gold/8 border-awan-gold/40' : 'bg-white/3 border-white/5'}`}
 >
   {pendingAction === 'export' ? (
     <div className="flex-1 flex flex-row items-center justify-between gap-3">
       <span className="text-xs font-black text-awan-gold uppercase tracking-widest">CONFIRMER L'EXPORT ?</span>
       <div className="flex flex-row gap-2">
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
         }} className="px-5 py-2 bg-awan-gold items-center justify-center">
           <span className="text-xs font-black text-black uppercase tracking-widest font-mono">OUI</span>
         </Touch>
         <Touch onPress={() => setPendingAction(null)} className="px-5 py-2 bg-white/5 border border-white/10 items-center justify-center">
           <span className="text-xs font-black text-awan-tx-mute uppercase tracking-widest font-mono">NON</span>
         </Touch>
       </div>
     </div>
   ) : (
     <>
       <div className="w-10 h-10 bg-white/5 flex items-center justify-center flex-shrink-0">
         {exportState === 'loading' && <div style={{ animation: 'spin 1s linear infinite' }}><HexagonLogo size={20} color={theme.selected} /></div>}
         {exportState === 'ok'      && <Check size={18} color={theme.statusOk} />}
         {exportState === 'error'   && <X size={18} color={theme.danger} />}
         {exportState === 'idle'    && <Database size={18} className="text-awan-tx-mute" />}
       </div>
       <div className="flex-1">
         <span className="text-xs font-black text-awan-tx uppercase tracking-widest block mb-1">EXPORTATION NOYAU</span>
         {exportState === 'idle'    && <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-tighter">Écrit {buildExportFilename()} dans Téléchargements</span>}
         {exportState === 'loading' && <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-tighter">EXPORT EN COURS…</span>}
         {exportState === 'ok'      && <span className="text-awan-sm font-bold uppercase tracking-tighter" style={{ color: theme.statusOk }}>{exportMsg}</span>}
         {exportState === 'error'   && <span className="text-awan-sm font-bold uppercase tracking-tighter" style={{ color: theme.danger }}>{exportMsg}</span>}
       </div>
     </>
   )}
 </Touch>

 {/* VERROUILLAGE BIOMÉTRIQUE */}
 <Touch
   onPress={() => pendingAction === null ? setPendingAction('lock') : undefined}
   className={`min-h-[88px] border p-5 flex-row items-center gap-5 ${pendingAction === 'lock' ? 'bg-awan-gold/8 border-awan-gold/40' : config.isLocked ? 'bg-awan-status-error/10 border-awan-status-error/30' : 'bg-white/3 border-white/5'}`}
 >
   {pendingAction === 'lock' ? (
     <div className="flex-1 flex flex-row items-center justify-between gap-3">
       <span className="text-xs font-black text-awan-gold uppercase tracking-widest">
         {config.isLocked ? 'DÉVERROUILLER ?' : 'VERROUILLER ?'}
       </span>
       <div className="flex flex-row gap-2">
         <Touch onPress={() => { setPendingAction(null); updateCfg('isLocked', !config.isLocked); }} className="px-5 py-2 bg-awan-gold items-center justify-center">
           <span className="text-xs font-black text-black uppercase tracking-widest font-mono">OUI</span>
         </Touch>
         <Touch onPress={() => setPendingAction(null)} className="px-5 py-2 bg-white/5 border border-white/10 items-center justify-center">
           <span className="text-xs font-black text-awan-tx-mute uppercase tracking-widest font-mono">NON</span>
         </Touch>
       </div>
     </div>
   ) : (
     <>
       <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${config.isLocked ? 'bg-awan-status-error/20' : 'bg-white/5'}`}>
         <Shield size={18} className={config.isLocked ? 'text-awan-status-error' : 'text-awan-tx-mute'} />
       </div>
       <div className="flex-1">
         <span className={`text-xs font-black uppercase tracking-widest block mb-1 ${config.isLocked ? 'text-awan-status-error' : 'text-awan-tx'}`}>VERROUILLAGE BIOMÉTRIQUE</span>
         <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-tighter">
           {config.isLocked ? 'Terminal verrouillé — toucher pour déverrouiller' : 'Isolation du terminal actif'}
         </span>
       </div>
       <Switch
         value={!!config.isLocked}
         onValueChange={() => setPendingAction('lock')}
         trackColor={{ false: '#1A1A1A', true: '#FF4B4B' }}
         thumbColor={config.isLocked ? '#fff' : '#444'}
       />
     </>
   )}
 </Touch>

 {/* PURGE DONNÉES — modal existant */}
 <Touch
   onPress={() => setPurgeModal(true)}
   className="min-h-[88px] bg-awan-status-error/10 border border-awan-status-error/30 p-5 flex-row items-center gap-5"
 >
   <div className="w-10 h-10 bg-awan-status-error/20 flex items-center justify-center flex-shrink-0">
     <Trash2 size={18} className="text-awan-status-error" />
   </div>
   <div className="flex-1">
     <span className="text-xs font-black text-awan-status-error uppercase tracking-widest block mb-1">PURGE DONNÉES PERSONNELLES</span>
     <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-tighter">Suppression totale et irréversible</span>
   </div>
 </Touch>
 </div>
 </div>
 </div>
 </ScrollView>

 {/* Modal confirmation purge */}
 <AnimatePresence>
 {purgeModal && (
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 style={{ position: 'fixed', inset: 0, zIndex: 200, background: theme.overlayDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
 onClick={() => !purging && setPurgeModal(false)}
 >
 <motion.div
 initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
 transition={{ duration: 0.2 }}
 onClick={e => e.stopPropagation()}
 style={{ background: theme.surface, border: '1px solid rgba(255,75,75,0.3)', width: '100%', maxWidth: 360, padding: 32 }}
 >
 <div className="mb-2">
 <span className="awan-label text-awan-status-error tracking-[0.3em]">— OPÉRATION CRITIQUE —</span>
 </div>
 <div className="mb-6">
 <span className="text-lg font-black text-awan-tx uppercase tracking-wider block mb-3">Purge totale</span>
 <span className="text-awan-lg text-awan-tx-mute leading-relaxed block">
 Cette opération supprime définitivement toutes les données personnelles : séances, mesures, repas, prières, journal. Aucune récupération possible.
 </span>
 </div>
 <div className="flex flex-col gap-3">
 <Touch
 onPress={handlePurgeConfirm}
 className="bg-awan-status-error h-14 items-center justify-center"
 style={{ opacity: purging ? 0.5 : 1 }}
 >
 <div className="flex-row items-center justify-center gap-3">
   {purging && <div style={{ animation: 'spin 1s linear infinite' }}><HexagonLogo size={18} color="#fff" /></div>}
   <span className="text-awan-lg font-black text-white uppercase tracking-[0.2em] font-mono">
     {purging ? 'SUPPRESSION…' : 'Purger données personnelles'}
   </span>
 </div>
 </Touch>
 <Touch onPress={() => setPurgeModal(false)} className="h-12 items-center justify-center border border-white/10">
 <span className="text-awan-md font-black text-awan-tx-mute uppercase tracking-[0.2em] font-mono">Annuler</span>
 </Touch>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </PageWrapper>
 );
}
