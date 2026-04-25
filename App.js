import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { T, AV } from './src/constants/theme';
import { loadDB, saveDB, loadCfg, saveCfg, parseAwanFile, buildIntegrity, uid, ds } from './src/utils/storage';
import LockScreen from './src/screens/LockScreen';
import PlanningScreen from './src/screens/PlanningScreen';

const Tab = createBottomTabNavigator();

function StubScreen({ title, desc }) {
  return (
    <View style={{ flex:1, backgroundColor:T.bg, alignItems:'center', justifyContent:'center', padding:24 }}>
      <Text style={{ fontSize:12, color:T.tx3, textTransform:'uppercase', marginBottom:8, letterSpacing:2 }}>{title}</Text>
      <Text style={{ fontSize:11, color:T.tx3, textAlign:'center', maxWidth:220, lineHeight:18 }}>{desc}</Text>
    </View>
  );
}

function ParamsScreen({ db, setDb, cfg, setCfg }) {
  const insets = useSafeAreaInsets();

  async function handleExportData() {
    try {
      const pkg = {
        awan_format:'backup', awan_version:AV, platform:'apk', encrypted:false,
        created_at:new Date().toISOString(), integrity:buildIntegrity(db), payload:JSON.stringify(db)
      };
      const path = FileSystem.documentDirectory + 'awan_backup_' + ds(new Date()) + '.json';
      await FileSystem.writeAsStringAsync(path, JSON.stringify(pkg, null, 2));
      await Sharing.shareAsync(path, { mimeType:'application/json' });
    } catch(e) {
      Alert.alert('Erreur export', e.message);
    }
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
        Alert.alert('Import réussi', '\u2713 ' + pkg.integrity.event_count + ' événements\n\u2713 ' + pkg.integrity.routine_count + ' routines');
      } else if (pkg.awan_format === 'routine') {
        const r = { id:uid(), ...pkg, source:'claude', frequency:pkg.frequency||'daily', imported_at:new Date().toISOString() };
        const newDb = { ...db, routines:[...db.routines, r] };
        setDb(newDb); await saveDB(newDb);
        Alert.alert('Routine importée', '"' + r.name + '" ajoutée \u2713');
      } else {
        Alert.alert('Format non supporté', 'Format "' + pkg.awan_format + '" non reconnu.');
      }
    } catch(e) {
      Alert.alert('Erreur', 'Fichier non reconnu ou corrompu.');
    }
  }

  const modules = cfg?.modules || [];
  return (
    <View style={{ flex:1, backgroundColor:T.bg, paddingBottom:insets.bottom }}>
      <Text style={ps.secLbl}>Modules installés</Text>
      {modules.length
        ? modules.map(m => (
          <View key={m.id} style={ps.modCard}>
            <Text style={ps.modName}>{m.name}</Text>
            <Text style={ps.modSub}>v{m.version}</Text>
          </View>
        ))
        : <Text style={{ paddingHorizontal:18, fontSize:11, color:T.tx3 }}>Aucun module installé</Text>
      }
      <Text style={ps.secLbl}>Import / Export</Text>
      <TouchableOpacity style={ps.btn} onPress={handleImport} activeOpacity={0.8}>
        <Text style={ps.btnTx}>\u2295  Importer un fichier AWAN</Text>
      </TouchableOpacity>
      <TouchableOpacity style={ps.btn} onPress={handleExportData} activeOpacity={0.8}>
        <Text style={ps.btnTx}>\u2193  Exporter mes données</Text>
      </TouchableOpacity>
      <Text style={ps.secLbl}>Sécurité</Text>
      <View style={ps.infoCard}>
        <Text style={{ fontSize:11, color:T.tx3, lineHeight:18 }}>PIN + AES-256 — Sprint 2</Text>
        <Text style={{ fontSize:10, color:T.tx3, marginTop:4 }}>Mode développeur actif. Données stockées localement.</Text>
      </View>
    </View>
  );
}

const ps = StyleSheet.create({
  secLbl: { fontSize:9, letterSpacing:3, color:T.tx3, paddingHorizontal:18, paddingTop:16, paddingBottom:8, textTransform:'uppercase' },
  btn: { marginHorizontal:18, marginBottom:8, borderWidth:1, borderColor:T.bo, borderRadius:12, padding:12 },
  btnTx: { fontSize:13, color:T.tx2 },
  modCard: { marginHorizontal:18, marginBottom:7, backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:12, padding:12, flexDirection:'row', justifyContent:'space-between' },
  modName: { fontSize:13, fontWeight:'500', color:T.tx },
  modSub: { fontSize:10, color:T.tx3 },
  infoCard: { marginHorizontal:18, backgroundColor:T.bg2, borderWidth:1, borderColor:T.gdim, borderRadius:12, padding:13, marginBottom:4 },
});

function AnalyseScreen({ db }) {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState('jour');
  const PERIODS = [['jour','Jour'],['semaine','Semaine'],['mois','Mois'],['annee','Année'],['decennie','10 ans']];
  const DAYS_MAP = { jour:0, semaine:7, mois:30, annee:365, decennie:3650 };
  const CATS_C = { travail:'#C8940F', perso:'#3aaa6a', sante:'#4a7fc4', famille:'#8b4ac4', sport:'#c44a4a', routine:'#4ab8a4', islam:'#d4a017' };
  const CATS_T = { travail:'Travail', perso:'Perso', sante:'Santé', famille:'Famille', sport:'Sport', routine:'Routine', islam:'Islam' };

  const today = ds(new Date());
  const daysBack = DAYS_MAP[period] || 0;
  const from = ds(new Date(Date.now() - daysBack * 86400000));
  const evs = (db.events || []).filter(e => e.date >= from && e.date <= today);
  const byCat = {};
  evs.forEach(e => { byCat[e.category] = (byCat[e.category]||0) + (e.duration||30); });
  const totalMin = Object.values(byCat).reduce((s,v)=>s+v,0) || 1;
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
          <View key={k} style={{ flexDirection:'row', justifyContent:'space-between', padding:9, paddingHorizontal:14, borderTopWidth:1, borderTopColor:T.bo, alignItems:'center' }}>
            <View style={{ flexDirection:'row', alignItems:'center' }}>
              <View style={{ width:6, height:6, borderRadius:3, backgroundColor:CATS_C[k]||T.gold, marginRight:8 }}/>
              <Text style={{ fontSize:12, color:T.tx2 }}>{CATS_T[k]||k}</Text>
            </View>
            <Text style={{ fontSize:14, color:T.gold }}>{Math.round(v/totalMin*100)}%  <Text style={{ fontSize:11, color:T.tx3 }}>{(v/60).toFixed(1)}h</Text></Text>
          </View>
        ))}
        {Object.keys(byCat).length === 0 && <Text style={{ padding:14, fontSize:11, color:T.tx3 }}>Aucune donnée sur cette période</Text>}
      </View>
      <View style={{ marginHorizontal:18, backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:12, overflow:'hidden' }}>
        <Text style={{ padding:12, paddingBottom:6, fontSize:9, letterSpacing:3, color:T.tx3, textTransform:'uppercase' }}>Statistiques</Text>
        {[
          ['Événements', evs.length],
          ['Moy./jour', (evs.length/days).toFixed(1)],
          ['Routines actives', (db.routines||[]).length],
          ['Temps total', (totalMin/60).toFixed(1)+'h'],
        ].map(([l,v],i) => (
          <View key={i} style={{ flexDirection:'row', justifyContent:'space-between', padding:9, paddingHorizontal:14, borderTopWidth:1, borderTopColor:T.bo }}>
            <Text style={{ fontSize:12, color:T.tx2 }}>{l}</Text>
            <Text style={{ fontSize:14, color:T.gold }}>{v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TabIcon({ name, focused }) {
  const icons = { Planning:'📅', Analyse:'📊', Sport:'💪', Repas:'🍽', Params:'⚙️' };
  return <Text style={{ fontSize:15, opacity:focused?1:0.4 }}>{icons[name]}</Text>;
}

export default function App() {
  const [locked, setLocked] = useState(true);
  const [db, setDb] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [loadedDb, loadedCfg] = await Promise.all([loadDB(), loadCfg()]);
        setDb(loadedDb);
        setCfg(loadedCfg);
      } catch(e) {
        setDb({ events:[], tasks:[], routines:[], meals:[], sport:[], mesures:[], pantry:[], pLog:[], obj:{}, cfg:{} });
        setCfg({ dev:true, pinOn:false, pinHash:null, modules:[] });
      } finally {
        setReady(true);
      }
    }
    init();
  }, []);
  
  async function handleUnlock() {
  try {
    const loadedDb = await loadDB();
    const loadedCfg = await loadCfg();
    setDb(loadedDb);
    setCfg(loadedCfg);
  } catch(e) {
    setDb({ events:[], tasks:[], routines:[], meals:[], sport:[], mesures:[], pantry:[], pLog:[], obj:{}, cfg:{} });
    setCfg({ dev:true, pinOn:false, pinHash:null, modules:[] });
  }
  setTimeout(() => setLocked(false), 800);
  }

  if (!ready) {
    return (
      <View style={{ flex:1, backgroundColor:T.bg, alignItems:'center', justifyContent:'center' }}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg}/>
        <Text style={{ color:T.gold, fontSize:20, letterSpacing:8 }}>AWAN</Text>
      </View>
    );
  }

  if (locked) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={T.bg}/>
        <GestureHandlerRootView style={{ flex:1 }}>
          <LockScreen onUnlock={handleUnlock}/>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={T.bg}/>
      <GestureHandlerRootView style={{ flex:1 }}>
        <NavigationContainer
          theme={{
            dark: true,
            colors: {
              background: T.bg,
              card: T.bg,
              border: T.bo,
              text: T.tx,
              primary: T.gold,
              notification: T.gold,
            }
          }}
        >
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused}/>,
              tabBarActiveTintColor: T.gold,
              tabBarInactiveTintColor: T.tx3,
              tabBarStyle: { backgroundColor:T.bg, borderTopColor:T.bo, paddingBottom:4, height:56 },
              tabBarLabelStyle: { fontSize:8, letterSpacing:0.5 },
              header: () => (
                <View style={hdr.bar}>
                  <Text style={hdr.ar} onPress={() => Alert.alert('\u0623\u0648\u0627\u0646', 'Module Islam \u2014 Sprint 3')}>أوان</Text>
                  <Text style={hdr.lat}>AWAN</Text>
                  <TouchableOpacity style={hdr.lk} onPress={() => setLocked(true)}>
                    <Text style={{ color:T.tx3, fontSize:14 }}>🔒</Text>
                  </TouchableOpacity>
                </View>
              ),
            })}
          >
            <Tab.Screen name="Planning">
              {() => <PlanningScreen db={db} setDb={setDb}/>}
            </Tab.Screen>
            <Tab.Screen name="Analyse">
              {() => <AnalyseScreen db={db}/>}
            </Tab.Screen>
            <Tab.Screen name="Sport">
              {() => <StubScreen title="Sport" desc="Séances, programme, mensurations — Sprint 2"/>}
            </Tab.Screen>
            <Tab.Screen name="Repas">
              {() => <StubScreen title="Nutrition" desc="Journal alimentaire, macros — Sprint 2"/>}
            </Tab.Screen>
            <Tab.Screen name="Params">
              {() => <ParamsScreen db={db} setDb={setDb} cfg={cfg} setCfg={setCfg}/>}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const hdr = StyleSheet.create({
  bar: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:18, paddingTop:14, paddingBottom:10, backgroundColor:T.bg, borderBottomWidth:1, borderBottomColor:T.bo },
  ar: { fontSize:13, letterSpacing:4, color:T.gold, opacity:0.5, fontWeight:'300' },
  lat: { fontSize:11, letterSpacing:8, color:T.gold, opacity:0.42, fontWeight:'300' },
  lk: { width:30, height:30, backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:8, alignItems:'center', justifyContent:'center' },
});
