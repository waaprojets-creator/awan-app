import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ChevronLeft, History, Clock, Target } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { Touch } from '../../components/ui/Touch';
import type { WorkoutSessionLatest } from '../../data/schemas/sport/routine';
import { useTheme } from '../../hooks/useTheme';
import { FontMono, FontSans } from '../../constants/typography';
import { Fs, Fw, Ls, Clr } from '../../theme/tokens';
import { ss } from './shared';

export function WorkoutHistory({ logs, onBack }: { logs: WorkoutSessionLatest[]; onBack: () => void }) {
 const theme = useTheme();
 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[ss.topBar, { backgroundColor: Clr.white5 }]}>
 <View style={[ss.row, { gap: 16 }]}>
 <Touch onPress={onBack} style={ss.iconBtn}>
 <ChevronLeft size={20} color={theme.mute} />
 </Touch>
 <Heading level={2} style={{ marginBottom: 0, flex: 1 }} subtitle="Sessions archivées">HISTORIQUE</Heading>
 </View>
 </View>
 <ScrollView contentContainerStyle={{ paddingBottom: 120, padding: 24 }} style={{ flex: 1 }}>
 {logs.length === 0 && (
 <View style={{ paddingVertical: 80, alignItems: 'center', opacity: 0.3 }}>
 <History size={48} color={theme.mute} style={{ marginBottom: 16 }} />
 <Heading level={4} style={{ marginBottom: 0 }} subtitle="">Aucune séance enregistrée</Heading>
 </View>
 )}
 {logs.slice().sort((a, b) => b.startTime - a.startTime).map(log => {
 const workingCount = log.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.kind === 'working').length, 0);
 const volume = log.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.kind === 'working').reduce((a, s) => a + (s.weightKg ?? 0) * (s.reps ?? 0), 0), 0);
 return (
 <View key={log.id} style={{ marginBottom: 16 }}>
 <Card style={{ padding: 20, backgroundColor: Clr.white5, borderColor: Clr.white5 }}>
 <View style={[ss.rowBetween, { marginBottom: 8 }]}>
 <Text style={{ fontSize: 16, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.4, fontFamily: FontSans }}>{log.name}</Text>
 <Text style={{ fontSize: Fs.md, fontFamily: FontMono, fontWeight: Fw.value, color: theme.selected }}>{log.date}</Text>
 </View>
 <View style={[ss.row, { gap: 16, marginBottom: 8 }]}>
 {log.cycleLetter && (
 <View style={{ backgroundColor: Clr.gold10, paddingHorizontal: 8, paddingVertical: 2 }}>
 <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, color: theme.selected, letterSpacing: Ls.sm_02, fontFamily: FontMono }}>CYCLE {log.cycleLetter}</Text>
 </View>
 )}
 {log.isException && (
 <View style={{ backgroundColor: 'rgba(251,146,60,0.1)', paddingHorizontal: 8, paddingVertical: 2 }}>
 <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, color: '#FB923C', letterSpacing: Ls.sm_02, fontFamily: FontMono }}>EXCEPTION</Text>
 </View>
 )}
 </View>
 <View style={[ss.row, { gap: 16, marginTop: 4 }]}>
 <View style={[ss.row, { gap: 4 }]}>
 <Target size={11} color={theme.mute} />
 <Text style={[ss.mdBlack, { color: theme.mute }]}>{workingCount} SETS</Text>
 </View>
 <View style={{ width: 1, height: 12, backgroundColor: Clr.white10 }} />
 <View style={[ss.row, { gap: 4 }]}>
 <Clock size={11} color={theme.mute} />
 <Text style={[ss.mdBlack, { color: theme.mute }]}>{Math.floor(log.duration / 60)} MIN</Text>
 </View>
 <View style={{ width: 1, height: 12, backgroundColor: Clr.white10 }} />
 <Text style={[ss.mdBlack, { color: theme.mute }]}>{Math.round(volume)} KG</Text>
 </View>
 </Card>
 </View>
 );
 })}
 </ScrollView>
 </View>
 );
}
