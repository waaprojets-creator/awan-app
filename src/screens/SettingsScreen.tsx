import React from 'react';
import { View, ScrollView, TextInput as RNTextInput, Alert, Switch } from 'react-native';

const TextInput = RNTextInput as React.ComponentType<any>;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AV } from '../constants/theme';
import { useTheme, useThemeMode } from '../hooks/useTheme';
import { useAppStore } from '../store/appStore';
import { useAppState } from '../context/AppStateContext';
import { Shield, Cpu, Trash2, Database, Key, RefreshCw, Plus } from 'lucide-react';
import { PageWrapper } from '../components/Animated';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { db, updateDb, navigate } = useAppState() as any;
  const theme = useTheme();
  const themeMode = useThemeMode();
  const setTheme = useAppStore((s: any) => s.setTheme);

  if (!db) return null;
  const config = db.config || { corsApiKey: '', jitFactor: 1.2 };

  const updateCfg = (key: string, val: any) => {
    updateDb({ ...db, config: { ...config, [key]: val } });
  };

  const addCat = () => {
    Alert.prompt('Nouvelle Catégorie', 'Nom de la classification', [
      { text: 'Abandonner', style: 'cancel' },
      { text: 'Confirmer', onPress: (name: string | undefined) => {
        if (!name) return;
        const key = name.toLowerCase().replace(/\s/g, '');
        const newCats = [...(db.categories || []), { key, label: name, color: theme.title }];
        updateDb({ ...db, categories: newCats });
      }}
    ]);
  };

  const delCat = (key: string) => {
    Alert.alert('Suppression', `Voulez-vous supprimer la catégorie ${key} ?`, [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui', onPress: () => {
        const newCats = (db.categories || []).filter((c: any) => c.key !== key);
        updateDb({ ...db, categories: newCats });
      }}
    ]);
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
        <div
          className="px-6 pt-4 pb-4 border-b"
          style={{ borderBottomColor: 'rgba(255,255,255,0.06)' }}
        >
          <ScreenHeader tag="SYSTÈME" title="RÉGLAGES" statusText={`● v${AV}`} />
          <div
            className="flex flex-row items-center gap-4 p-4 border"
            style={{
              backgroundColor: 'var(--color-awan-surface)',
              borderColor: 'rgba(212,175,55,0.15)',
            }}
          >
            <Shield size={20} color="var(--color-awan-gold)" />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                fontWeight: 400,
                color: 'var(--color-awan-status-ok)',
                letterSpacing: '0.2em',
              }}
            >
              NOYAU OPÉRATIONNEL
            </span>
          </div>
        </div>

        <div className="p-6">

          {/* SECTION APPARENCE — Toggle Light/Dark */}
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

              <div className="flex flex-row bg-black/40 rounded-xl p-1 gap-1">
                <Touch
                  onPress={() => setTheme('light')}
                  className={`flex-1 py-3 items-center justify-center rounded-lg ${themeMode === 'light' ? 'bg-awan-gold' : 'transparent'}`}
                >
                  <span className={`text-[10px] font-black font-mono ${themeMode === 'light' ? 'text-black' : 'text-white/20'}`}>LIGHT</span>
                </Touch>
                <Touch
                  onPress={() => setTheme('dark')}
                  className={`flex-1 py-3 items-center justify-center rounded-lg ${themeMode === 'dark' ? 'bg-awan-gold' : 'transparent'}`}
                >
                  <span className={`text-[10px] font-black font-mono ${themeMode === 'dark' ? 'text-black' : 'text-white/20'}`}>DARK</span>
                </Touch>
              </div>
            </Card>
          </div>

          {/* SECTION PALETTE — 10 couleurs disponibles (read-only) */}
          <div className="mb-10">
            <Heading level={4} mono subtitle="Couleurs Utilisateur" className="mb-6">PALETTE DISPONIBLE</Heading>
            <Card className="p-6 bg-white/3 border-white/5" variant="flat">
              <div className="grid grid-cols-5 gap-3 mb-4">
                {theme.palette.map((color, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div
                      className="w-12 h-12 rounded-lg border border-white/10"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[8px] font-black text-awan-tx-mute font-mono tracking-widest">P{idx}</span>
                  </div>
                ))}
              </div>
              <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest leading-relaxed block">
                Couleurs assignables aux classifications d'événements
              </span>
            </Card>
          </div>

          <div className="mb-10">
            <Heading level={4} mono subtitle="Intégrations Externes" className="mb-6">PROTOCOLES ORS</Heading>
            <Card className="p-0 border-white/5 bg-black/20 rounded-2xl overflow-hidden shadow-inner mb-4">
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

          <div className="mb-10">
            <Heading level={4} mono subtitle="Optimisation Temporelle" className="mb-6">PARAMÈTRES JIT</Heading>
            <Card className="p-6 bg-white/3 border-white/5" variant="flat">
               <div className="flex flex-row justify-between items-center mb-6">
                  <div>
                    <span className="text-xs font-black text-awan-tx uppercase tracking-widest block mb-1">FACTEUR JIT</span>
                    <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-tighter">Marge de sécurité temporelle</span>
                  </div>
                  <span className="text-2xl font-black text-awan-gold font-mono">{(config.jitFactor || 1.2).toFixed(1)}x</span>
               </div>
               
               <div className="flex flex-row bg-black/40 rounded-xl p-1 gap-1">
                  {[1.0, 1.1, 1.2, 1.3, 1.4, 1.5].map(v => (
                    <Touch 
                      key={v}
                      onPress={() => updateCfg('jitFactor', v)}
                      className={`flex-1 py-3 items-center justify-center rounded-lg ${config.jitFactor === v ? 'bg-awan-gold' : 'transparent'}`}
                    >
                      <span className={`text-[10px] font-black font-mono ${config.jitFactor === v ? 'text-black' : 'text-white/20'}`}>{v}</span>
                    </Touch>
                  ))}
               </div>
            </Card>
          </div>

          <div className="mb-10">
            <div className="flex flex-row justify-between items-end mb-6">
               <Heading level={4} mono subtitle="Taxonomie Locale" className="mb-0">CLASSIFICATIONS</Heading>
               <Touch onPress={addCat} className="w-8 h-8 rounded-lg bg-awan-gold flex items-center justify-center">
                  <Plus size={16} color="black" strokeWidth={3} />
               </Touch>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {(db.categories || []).map((cat: any) => (
                <Card key={cat.key} className="flex-row items-center justify-between p-4 bg-white/3 border-white/5" variant="flat">
                  <div className="flex flex-row items-center gap-3">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                     <span className="text-[10px] font-black text-awan-tx uppercase tracking-widest">{cat.label}</span>
                  </div>
                  <Touch onPress={() => delCat(cat.key)}>
                    <Trash2 size={12} className="text-white/10 hover:text-awan-status-error" />
                  </Touch>
                </Card>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <Heading level={4} mono subtitle="Maintenance & Sécurité" className="mb-6">PROTOCOLES CRITIQUES</Heading>
            <div className="space-y-3">
              <Touch onPress={purgeCache} className="bg-white/3 border border-white/5 p-6 rounded-2xl flex-row items-center gap-5">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                   <RefreshCw size={18} className="text-awan-tx-mute" />
                </div>
                <div className="flex-1">
                   <span className="text-xs font-black text-awan-tx uppercase tracking-widest block mb-1">OPTIMISATION CACHE</span>
                   <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-tighter">Nettoyage des archives terminées</span>
                </div>
              </Touch>

              <Touch className="bg-white/3 border border-white/5 p-6 rounded-2xl flex-row items-center gap-5">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                   <Database size={18} className="text-awan-tx-mute" />
                </div>
                <div className="flex-1">
                   <span className="text-xs font-black text-awan-tx uppercase tracking-widest block mb-1">EXPORTATION NOYAU</span>
                   <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-tighter">Dump SQL de la base locale</span>
                </div>
              </Touch>

              <Touch 
                onPress={() => updateCfg('isLocked', !config.isLocked)}
                className={`border p-6 rounded-2xl flex-row items-center gap-5 transition-all ${config.isLocked ? 'bg-awan-status-error/10 border-awan-status-error/30' : 'bg-white/3 border-white/5'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.isLocked ? 'bg-awan-status-error/20' : 'bg-white/5'}`}>
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

          <div className="items-center py-12 border-t border-white/5">
             <Heading level={4} mono subtitle="Développé par AWAN LABS" className="text-center opacity-30">PROJET MATRICE • 2026</Heading>
             <span className="text-[8px] font-black text-awan-tx-mute uppercase tracking-[0.5em] mt-2">Fin de Transmission</span>
          </div>
        </div>
      </ScrollView>
    </PageWrapper>
  );
}


