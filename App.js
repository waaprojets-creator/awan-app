import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { T, AV } from './src/constants/theme';
import { parseAwanFile, buildIntegrity, uid, ds } from './src/utils/storage';
import { clearEventCache } from './src/utils/recurrence';
import { AppStateProvider, useAppState } from './src/context/AppStateContext';
import LockScreen from './src/screens/LockScreen';
import PlanningScreen from './src/screens/PlanningScreen';

const Tab = createBottomTabNavigator();

// --- DESIGN ZEN : ICONES FILAIRES MINIMALISTES ---
function TabIcon({ focused }) {
  return (
    <View style={{
      width: 44, height: 44, borderRadius: 14,
      backgroundColor: focused ? '#FFFFFF' : 'transparent',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: focused ? 1 : 0, borderColor: T.bo
    }}>
      <View style={{ 
        width: 18, height: 18, borderRadius: 5, 
        borderWidth: 2, borderColor: focused ? T.gold : T.tx3 
      }} />
    </View>
  );
}

function StubScreen({ title, desc }) {
  return (
    <View style={{ flex:1, backgroundColor:T.bg, alignItems:'center', justifyContent:'center', padding:24 }}>
      <Text style={{ fontSize:12, color:T.tx3, textTransform:'uppercase', marginBottom:8, letterSpacing:2 }}>{title}</Text>
      <Text style={{ fontSize:11, color:T.tx3, textAlign:'center', maxWidth:220, lineHeight:18 }}>{desc}</Text>
    </View>
  );
}

function ParamsScreen() {
  const insets = useSafeAreaInsets();
  const { db, cfg, updateDb, updateCfg } = useAppState();

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
        await updateDb(newDb);
        clearEventCache();
        Alert.alert('Import réussi', '\u2713 ' + pkg.integrity.event_count + ' événements\n\u2713 ' + pkg.integrity.routine_count + ' routines');
      } else if (pkg.awan_format === 'routine') {
        const r = { id:uid(), ...pkg, source:'claude', frequency:pkg.frequency||'daily', imported_at:new Date().toISOString() };
        const newDb = { ...db, routines:[...db.routines, r] };
        await updateDb(newDb);
        clearEventCache();
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
  infoCard: { marginHorizontal:18, backgroundColor:T.bg2, borderWidth:1, borderColor:T.bo, borderRadius:12, padding:13, marginBottom:4 },
});

function AnalyseScreen() {
  const { db } = useAppState();
  const [period, setPeriod] = useState('jour');
  const PERIODS = [['jour','Jour'],['semaine','Semaine'],['mois','Mois'],['annee','Année'],['decennie','10 ans']];
  const DAYS_MAP = { jour:0, semaine:7, mois:30, annee:365, decennie:3650 };
  const CATS_C = { travail:'#4A443F', perso:'#8DA399', sante:'#7492B1', famille:'#9B8DA3', sport:'#B58787', routine:'#8DB5AF', islam:'#A39684' };
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
    <View style={{ flex:1, backgroundColor:T.bg }}>
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
    </View>
  );
}

function AppContent() {
  const [locked, setLocked] = useState(true);
  const { ready, initializeApp } = useAppState();

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  async function handleUnlock() {
    await initializeApp();
    setTimeout(() => setLocked(false), 800);
  }

  const ZenTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: T.bg,
      card: T.bg,
      border: 'transparent',
      text: T.tx,
      primary: T.gold,
    },
  };

  if (!ready) {
    return (
      <View style={{ flex:1, backgroundColor:T.bg, alignItems:'center', justifyContent:'center' }}>
        <StatusBar barStyle="dark-content" backgroundColor={T.bg}/>
        <Text style={{ color:T.gold, fontSize:20, letterSpacing:8 }}>AWAN</Text>
      </View>
    );
  }

  if (locked) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={T.bg}/>
        <GestureHandlerRootView style={{ flex:1 }}>
          <LockScreen onUnlock={handleUnlock}/>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg}/>
      <GestureHandlerRootView style={{ flex:1 }}>
        <NavigationContainer theme={ZenTheme}>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused }) => <TabIcon focused={focused}/>,
              tabBarActiveTintColor: T.gold,
              tabBarInactiveTintColor: T.tx3,
              tabBarShowLabel: false,
              tabBarStyle: { 
                backgroundColor:'#FFFFFF', 
                borderTopColor:T.bo, 
                height:85, 
                paddingBottom:20,
                elevation:0,
                shadowOpacity:0
              },
              header: () => (
                <View style={hdr.bar}>
                  <View style={hdr.menuBtn}>
                    <View style={hdr.lineLong} />
                    <View style={hdr.lineShort} />
                  </View>
                  <Text style={hdr.title}>{route.name.toUpperCase()}</Text>
                  <TouchableOpacity style={hdr.avatar} onPress={() => setLocked(true)}>
                    <View style={hdr.avatarInner} />
                  </TouchableOpacity>
                </View>
              ),
            })}
          >
            <Tab.Screen name="Planning" component={PlanningScreen} />
            <Tab.Screen name="Analyse
