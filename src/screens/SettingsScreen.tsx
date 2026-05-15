import React from 'react';
import { View, ScrollView, TextInput as RNTextInput, Alert, Switch } from 'react-native';

const TextInput = RNTextInput as React.ComponentType<any>;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemeMode } from '../hooks/useTheme';
import { useAppStore } from '../store/appStore';
import { useAppState } from '../context/AppStateContext';
import { Shield, Database, Key, RefreshCw } from 'lucide-react';
import { PageWrapper } from '../components/Animated';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';

export default function SettingsScreen() {
 const insets = useSafeAreaInsets();
 const { db, updateDb } = useAppState() as any;
 const theme = useTheme();
 const themeMode = useThemeMode();
 const setTheme = useAppStore((s: any) => s.setTheme);

 if (!db) return null;
 const config = db.config || { corsApiKey: '', jitFactor: 1.2 };

 const updateCfg = (key: string, val: any) => {
 updateDb({ ...db, config: { ...config, [key]: val } });
 };

 const purgeCache = () => {
 Alert.alert('Purge Système', 'Réinitialiser le cache et les vecteurs terminés ?', [
 { text: 'Annuler', style: 'cancel' },
 { text: 'Exécuter', onPress: () => {
 updateDb({ ...db, tasks: (db.tasks || []).filter((t: any) => !t.done) });
 Alert.alert('Succès', 'Optimisation terminée.');
 }}
 ]);
 };

 return (
 <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
 <ScrollView
 contentContainerStyle={{ paddingBottom: 150 }}
 style={{ flex: 1 }}
 showsVerticalScrollIndicator={false}
 >
 <div className="px-6 pt-4 pb-4 border-b" style={{ borderBottomColor: 'rgba(255,255,255,0.06)' }}>
 <ScreenHeader tag="SYS" title="SYSTÈME" />
 </div>

 <div className="p-6">

 {/* THÈME */}
 <div className="mb-10">
 <Heading level={4} mono subtitle="Apparence Visuelle" className="mb-6">THÈME D'AFFICHAGE</Heading>
 <Card className="p-6 bg-white/3 border-white/5" variant="flat">
 <div className="flex flex-row justify-between items-center mb-6">
 <div>
 <span className="text-xs font-black text-awan-tx uppercase tracking-widest block mb-1">MODE ACTIF</span>
 <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-tighter">Bascule clair / sombre</span>
 </div>
 <span className="text-2xl font-black text-awan-gold font-mono">{themeMode === 'dark' ? 'DARK' : 'LIGHT'}</span>
 </div>
 <div className="flex flex-row bg-awan-surface p-1 gap-1">
 <Touch onPress={() => setTheme('light')}
 className={`flex-1 py-3 items-center justify-center ${themeMode === 'light' ? 'bg-awan-gold' : 'transparent'}`}>
 <span className={`text-[10px] font-black font-mono ${themeMode === 'light' ? 'text-black' : 'text-awan-tx-mute'}`}>LIGHT</span>
 </Touch>
 <Touch onPress={() => setTheme('dark')}
 className={`flex-1 py-3 items-center justify-center ${themeMode === 'dark' ? 'bg-awan-gold' : 'transparent'}`}>
 <span className={`text-[10px] font-black font-mono ${themeMode === 'dark' ? 'text-black' : 'text-awan-tx-mute'}`}>DARK</span>
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
 <span className="text-[8px] font-black text-awan-tx-mute font-mono tracking-widest">P{idx}</span>
 </div>
 ))}
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
 <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest leading-relaxed px-1">
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
 <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-tighter">Marge de sécurité temporelle</span>
 </div>
 <span className="text-2xl font-black text-awan-gold font-mono">{(Number(config.jitFactor) || 1.2).toFixed(1)}x</span>
 </div>
 <div className="flex flex-row bg-awan-surface p-1 gap-1">
 {[1.0, 1.1, 1.2, 1.3, 1.4, 1.5].map(v => {
 const active = Math.abs(Number(config.jitFactor || 1.2) - v) < 0.01;
 return (
 <Touch key={v} onPress={() => updateCfg('jitFactor', v)}
 className={`flex-1 py-3 items-center justify-center ${active ? 'bg-awan-gold' : 'transparent'}`}>
 <span className={`text-[10px] font-black font-mono ${active ? 'text-black' : 'text-white/20'}`}>{v.toFixed(1)}</span>
 </Touch>
 );
 })}
 </div>
 </Card>
 </div>

 {/* PROTOCOLES CRITIQUES */}
 <div className="mb-12">
 <Heading level={4} mono subtitle="Maintenance & Sécurité" className="mb-6">PROTOCOLES CRITIQUES</Heading>
 <div className="space-y-3">
 <Touch onPress={purgeCache} className="bg-white/3 border border-white/5 p-6 flex-row items-center gap-5">
 <div className="w-10 h-10 bg-white/5 flex items-center justify-center">
 <RefreshCw size={18} className="text-awan-tx-mute" />
 </div>
 <div className="flex-1">
 <span className="text-xs font-black text-awan-tx uppercase tracking-widest block mb-1">OPTIMISATION CACHE</span>
 <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-tighter">Nettoyage des archives terminées</span>
 </div>
 </Touch>

 <Touch className="bg-white/3 border border-white/5 p-6 flex-row items-center gap-5">
 <div className="w-10 h-10 bg-white/5 flex items-center justify-center">
 <Database size={18} className="text-awan-tx-mute" />
 </div>
 <div className="flex-1">
 <span className="text-xs font-black text-awan-tx uppercase tracking-widest block mb-1">EXPORTATION NOYAU</span>
 <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-tighter">Dump SQL de la base locale</span>
 </div>
 </Touch>

 <Touch
 onPress={() => updateCfg('isLocked', !config.isLocked)}
 className={`border p-6 flex-row items-center gap-5 transition-all ${config.isLocked ? 'bg-awan-status-error/10 border-awan-status-error/30' : 'bg-white/3 border-white/5'}`}
 >
 <div className={`w-10 h-10 flex items-center justify-center ${config.isLocked ? 'bg-awan-status-error/20' : 'bg-white/5'}`}>
 <Shield size={18} className={config.isLocked ? 'text-awan-status-error' : 'text-awan-tx-mute'} />
 </div>
 <div className="flex-1">
 <span className={`text-xs font-black uppercase tracking-widest block mb-1 ${config.isLocked ? 'text-awan-status-error' : 'text-awan-tx'}`}>VERROUILLAGE BIOMÉTRIQUE</span>
 <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-tighter">Isolation du terminal actif</span>
 </div>
 <Switch
 value={!!config.isLocked}
 onValueChange={(v) => updateCfg('isLocked', v)}
 trackColor={{ false: '#1A1A1A', true: '#FF4B4B' }}
 thumbColor={config.isLocked ? '#fff' : '#444'}
 />
 </Touch>
 </div>
 </div>
 </div>
 </ScrollView>
 </PageWrapper>
 );
}
