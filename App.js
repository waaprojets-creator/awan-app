import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';

import { T, AV } from './src/constants/theme';
import { loadDB, saveDB, loadCfg, saveCfg, parseAwanFile, buildIntegrity, uid, ds } from './src/utils/storage';
import { appliesToDate } from './src/utils/recurrence';
import LockScreen from './src/screens/LockScreen';
import PlanningScreen from './src/screens/PlanningScreen';

const Tab = createBottomTabNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

function StubScreen({ title, desc, modName, onImportModule }) {
  return (
    <View style={{ flex:1, backgroundColor:T.bg, alignItems:'center', justifyContent:'center', padding:24 }}>
      <Text style={{ fontSize:12, letterSpacing:4, color:T.tx3, textTransform:'uppercase', marginBottom:8 }}>{title}</Text>
      <Text style={{ fontSize:11, color:T.tx3, opacity:.5, textAlign:'center', maxWidth:220, lineHeight:18, marginBottom:20 }}>{desc}</Text>
      <TouchableOpacity
        style={{ flexDirection:'row', gap:6, backgroundColor:T.gdim, borderWidth:1, borderColor:T.gold, borderRadius:20, paddingVertical:7, paddingHorizontal:14 }}
        onPress={() => onImportModule(modName)}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize:11, color:T.gold }}>Importer le module {title}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ParamsScreen({ db, setDb, cfg, setCfg }) {
  const insets = useSafeAreaInsets();

  async function handleExportData() {
    const pkg = { awan_format:'backup', awan_version:AV, platform:'apk', encrypted:false,
      created_at:new Date().toISOString(), integrity:buildIntegrity(db), payload:JSON.stringify(db) };
    const path = FileSystem.documentDirectory + `awan_backup_${ds(new Date())}.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(pkg, null, 2));
    await Sharing.shareAsync(path, { mimeType:'application/json' });
  }

  async function handleImport() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type:'application/json', copyToCacheDirectory:true });
      if (result.canceled) return;
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const pkg = parseAwanFile(content);
      if (pkg.awan_format === 'backup') {
        const loaded = JSON.parse(pkg.payload);
        const newDb = { ...db, ...loaded };
        setDb(newDb); await saveDB(newDb);
        const i = pkg.integrity;
        Alert.alert('Import réussi', `✓ ${i.event_count} événements\n✓ ${i.routine_count} routines`);
      } else if (pkg.awan_format === 'routine') {
        const r = { id:uid(), ...pkg, source:'claude', frequency:pkg.frequency||'daily', imported_at:new Date().toISOString() };
        const newDb = { ...db, routines:[...db.routines, r] };
        setDb(newDb); await saveDB(newDb);
        Alert.alert('Routine importée', `"${r.name}" ajoutée ✓`);
      } else if (pkg.awan_format === 'module') {
        const newCfg = { ...cfg, modules:[...(cfg.modules||[]), { id:uid(), name:pkg.name, version:pkg.version||'1.0', imported:new Date().toISOString() }] };
        setCfg(newCfg); await saveCfg(newCfg);
        Alert.alert('Module installé', `"${pkg.name}" actif au prochain démarrage.`);
      } else {
        Alert.alert('Format non supporté', `Format "${pkg.awan_format}" non reconnu.`);
      }
    } catch (e) {
      Alert.alert('Erreur', 'Fichier non reconnu ou corrompu.');
    }
  }

  const modules = cfg?.modules || [];
  return (
    <View style={{ flex:1, backgroundColor:T.bg, paddingBottom:insets.bottom }}>
      <Text style={ps.secLbl}>Modules installés</Text>
      {modules.length ? modules.map(m => (
        <View key={m.id} style={ps.modCard}>
          <Text style={ps.modName}>{m.name}</Text>
          <Text style={ps.modSub}>v{m.version} · {new Date(m.imported).toLocaleDateString('fr-FR')}</Text>
        </View>
      )) : <Text style={{ paddingHorizontal:18, fontSize:11, color:T.tx3 }}>Aucun module installé</Text>}
      <Text style={ps.secLbl}>Import / Export</Text>
      <TouchableOpacity style={ps.btn} onPress={handleImport} activeOpacity={0.8}>
        <Text style={ps.btnTx}>⊕  Importer un fichier AWAN</Text>
      </TouchableOpacity>
      <TouchableOpacity style={ps.btn} onPress={handleExportData} activeOpacity={0.8}>
        <Text style={ps.btnTx}>↓  Exporter mes données</Text>
      </TouchableOpacity>
      <Text style={ps.secLbl}>Avant toute mise à jour</Text>
      <View style={ps.infoCard}>
        <Text style={{ fontSize:11, color:T.gold, marginBottom:8 }}>Procédure obligatoire</Text>
        {['Exporter vos données','Vérifier le rapport','Installer la nouvelle version','Réimporter vos données'].map((step,i) => (
          <Text key={i} style={{ fontSize:11, color:T.tx3, paddingVertical:3, lineHeight:18 }}>{i+1}. {step}</Text>
        ))}
      </View>
      <Text style={ps.secLbl}>Sécurité</Text>
      <View style={ps.infoCard}>
        <Text style={{ fontSize:11, color:T.tx3, lineHeight:18 }}>PIN + AES-256 — Sprint 2</Text>
        <Text style={{ fontSize:10, color:T.tx3, opacity:.6, marginTop:4 }}>Mode développeur actif. Données stockées localement.</Text>
      </View>
    </View>
  );
}

const ps = StyleSheet.create({
  secLbl: { fontSize:9, letterSpacing:4, color:T.tx3, paddingHorizontal:18, paddingTop:16, paddingBottom:8, textTransform:'uppercase' },
  btn: { marginHorizontal:18, marginBottom:8, borderWidth:1, borderColor:T.bo, borderRadius:12, padding:12 },
  btnTx: { fontSize:13, color:T.tx2 },
  modCard: { marginHorizontal:18, marginBottom:7, backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:12, padding:12, flexDirection:'row', justifyContent:'space-between' },
  modName: { fontSize:13, fontWeight:'500', color:T.tx },
  modSub: { fontSize:10, color:T.tx3 },
  infoCard: { marginHorizontal:18, backgroundColor:T.bg2, borderWidth:1, borderColor:T.gdim, borderRadius:12, padding:13, marginBottom:4 },
});

function TabIcon({ name, focused }) {
  const icons = { Planning:'📅', Analyse:'📊', Sport:'💪', Repas:'🍽', Params:'⚙️' };
  return <Text style={{ fontSize:15, opacity:focused?1:.4 }}>{icons[name]}</Text>;
}

function AnalyseScreen({ db }) {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState('jour');
  const PERIODS = [['jour','Jour'],['semaine','Semaine'],['mois','Mois'],['annee','Année'],['decennie','10 ans']];
  const DAYS_MAP = { jour:0, semaine:7, mois:30, annee:365, decennie:3650 };
  const today = ds(new Date());
  const daysBack = DAYS_MAP[period] || 0;
  const from = ds(new Date(Date.now() - daysBack * 86400000));
  const evs = db.events.filter(e => e.date >= from && e.date <= today);
  const CATS_C = { travail:'#C8940F', perso:'#3aaa6a', sante:'#4a7fc4', famille:'#8b4ac4', sport:'#c44a4a', routine:'#4ab8a4', islam:'#d4a017' };
  const CATS_T = { travail:'Travail', perso:'Perso', sante:'Santé', famille:'Famille', sport:'Sport', routine:'Routine', islam:'Islam' };
  const byCat = {};
  evs.forEach(e => { byCat[e.category] = (byCat[e.category]||0) + (e.duration||30); });
  const totalMin = Object.values(byCat).reduce((s,v)=>s+v,0)||1;
  const days = Math.max(1, daysBack || 1);
  return (
    <View style={{ flex:1, backgroundColor:T.bg, paddingBottom:insets.bottom }}>
      <View style={{ flexDirection:'row', paddingHorizontal:10, borderBottomWidth:1, borderBottomColor:T.bo }}>
        {PERIODS.map(([k,l]) => (
          <TouchableOpacity key={k} style={{ paddingVertical:9, paddingHorizontal:10, borderBottomWidth:2, borderBottomColor:period===k?T.gold:'transparent' }} onPress={() => setPeriod(k)}>
            <Text style={{ fontSize:11, color:period===k?T.gold:T.tx3 }}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ margin:18, backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:12, overflow:'hidden' }}>
        <Text style={{ padding:12, paddingBottom:6, fontSize:9, letterSpacing:3, color:T.tx3, textTransform:'uppercase' }}>Répartition du temps</Text>
        {Object.entries(byCat).map(([k,v]) => (
          <View key={k} style={{ flexDirection:'row', justifyContent:'space-between', padding:9, paddingHorizontal:14, borderTopWidth:.5, borderTopColor:T.bo, alignItems:'center' }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
              <View style={{ width:6, height:6, borderRadius:3, backgroundColor:CATS_C[k]||T.gold }}/>
              <Text style={{ fontSize:12, color:T.tx2 }}>{CATS_T[k]||k}</Text>
            </View>
            <Text style={{ fontSize:14, color:T.gold }}>{Math.round(v/totalMin*100)}% <Text style={{ fontSize:11, color:T.tx3 }}>{(v/60).toFixed(1)}h</Text></Text>
          </View>
        ))}
        {Object.keys(byCat).length === 0 && <Text style={{ padding:14, fontSize:11, color:T.tx3 }}>Aucune donnée sur cette période</Text>}
      </View>
      <View style={{ marginHorizontal:18, backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:12, overflow:'hidden' }}>
        <Text style={{ padding:12, paddingBottom:6, fontSize:9, letterSpacing:3, color:T.tx3, textTransform:'uppercase' }}>Statistiques</Text>
        {[['Événements',evs.length],['Moy./jour',(evs.length/days).toFixed(1)],['Routines actives',db.routines.length],['Temps total',(totalMin/60).toFixed(1)+'h']].map(([l,v],i) => (
          <View key={i} style={{ flexDirection:'row', justifyContent:'space-between', padding:9, paddingHorizontal:14, borderTopWidth:.5, borderTopColor:T.bo }}>
            <Text style={{ fontSize:12, color:T.tx2 }}>{l}</Text>
            <Text style={{ fontSize:14, color:T.gold }}>{v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function App() {
  const [locked, setLocked] = useState(true);
  const [db, setDb] = useState(null);
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    async function init() {
      const [loadedDb, loadedCfg] = await Promise.all([loadDB(), loadCfg()]);
      setDb(loadedDb); setCfg(loadedCfg);
    }
    init();
  }, []);

  async function handleUnlock() {
    if (!db) { const loadedDb = await loadDB(); setDb(loadedDb); }
    setLocked(false);
  }

  function handleImportModule(modName) {
    Alert.alert('Importer module', `Le module ${modName} sera disponible dans le Sprint 2.`);
  }

  if (!db || !cfg) {
    return <View style={{ flex:1, backgroundColor:T.bg, alignItems:'center', justifyContent:'center' }}><Text style={{ color:T.gold }}>AWAN</Text></View>;
  }

  if (locked) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex:1 }}>
          <LockScreen onUnlock={handleUnlock}/>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex:1 }}>
        <NavigationContainer theme={{ colors: { background:T.bg, card:T.bg, border:T.bo, text:T.tx, primary:T.gold, notification:T.gold } }}>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused}/>,
              tabBarActiveTintColor: T.gold,
              tabBarInactiveTintColor: T.tx3,
              tabBarStyle: { backgroundColor:T.bg, borderTopColor:T.bo, paddingBottom:4 },
              tabBarLabelStyle: { fontSize:8, letterSpacing:.5 },
              header: () => (
                <View style={hdr.bar}>
                  <Text style={hdr.ar} onPress={() => Alert.alert('أوان', 'Module Islam — Sprint 3')}>أوان</Text>
                  <View style={hdr.logo}><Text style={hdr.lat}>AWAN</Text></View>
                  <TouchableOpacity style={hdr.lk} onPress={() => setLocked(true)}>
                    <Text style={{ color:T.tx3, fontSize:12 }}>🔒</Text>
                  </TouchableOpacity>
                </View>
              ),
            })}
          >
            <Tab.Screen name="Planning">{() => <PlanningScreen db={db} setDb={setDb}/>}</Tab.Screen>
            <Tab.Screen name="Analyse">{() => <AnalyseScreen db={db}/>}</Tab.Screen>
            <Tab.Screen name="Sport">{() => <StubScreen title="Sport" desc="Sprint 2" modName="sport" onImportModule={handleImportModule}/>}</Tab.Screen>
            <Tab.Screen name="Repas">{() => <StubScreen title="Nutrition" desc="Sprint 2" modName="nutrition" onImportModule={handleImportModule}/>}</Tab.Screen>
            <Tab.Screen name="Params">{() => <ParamsScreen db={db} setDb={setDb} cfg={cfg} setCfg={setCfg}/>}</Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const hdr = StyleSheet.create({
  bar: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:18, paddingTop:14, paddingBottom:0, backgroundColor:T.bg, borderBottomWidth:1, borderBottomColor:T.bo },
  ar: { fontSize:13, letterSpacing:4, color:T.gold, opacity:.5, fontWeight:'300' },
  logo: { alignItems:'center' },
  lat: { fontSize:11, letterSpacing:8, color:T.gold, opacity:.42, fontWeight:'300' },
  lk: { width:30, height:30, backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:8, alignItems:'center', justifyContent:'center' },
});
