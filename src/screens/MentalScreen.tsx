// @ts-nocheck — legacy screen, sera réécrit Sprint 2+
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useAppState } from '../context/AppStateContext';
import { PageWrapper, StaggerList, StaggerItem, AnimatedPressable } from '../components/Animated';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';
import { Brain, Zap, Target, Moon, History, ChevronLeft, Plus, Sparkles, Sliders } from 'lucide-react';
import { DailyCanvas } from '../components/DailyCanvas';

const { width } = Dimensions.get('window');

export default function MentalScreen() {
  const insets = useSafeAreaInsets();
  const { navigate, db } = useAppState();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'status' | 'history'>('status');

  const stats = [
    { label: 'FOCUS', value: '82%', icon: Target, color: '#4ECDC4' },
    { label: 'CALME', value: '94%', icon: Moon, color: '#A78BFA' },
    { label: 'COGNITION', value: '7.8', icon: Brain, color: theme.title },
  ];

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation / Header */}
        <div className="px-6 pt-4 pb-4">
          <Heading level={1} subtitle="Système de Analyse de la Charge Cognitive">RÉSEAU NEURONAL</Heading>
        </div>          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            {stats.map((s, i) => (
              <Card key={i} className="p-4 bg-white/5 border-white/5 items-center" variant="flat">
                <s.icon size={14} color={s.color} className="mb-2" />
                <span className="text-[8px] font-black text-awan-tx-mute uppercase tracking-[0.2em] mb-1">{s.label}</span>
                <span className="text-lg font-black text-awan-tx">{s.value}</span>
              </Card>
            ))}
          </div>

        {/* Brain Status Visualizer Placeholder */}
        <div className="px-6 mb-10">
          <Card className="aspect-square bg-awan-bg-highlight/20 border-white/5 flex items-center justify-center relative overflow-hidden" variant="flat">
            <div className="absolute inset-0 opacity-10">
              <div 
                className="w-full h-full" 
                style={{ 
                  backgroundImage: 'radial-gradient(circle, white 0.5px, transparent 0.5px)', 
                  backgroundSize: '20px 20px' 
                }} 
              />
            </div>
            
            <div className="relative">
              {/* Outer pulse */}
              <div className="w-48 h-48 rounded-full border border-awan-gold/10 flex items-center justify-center animate-pulse">
                <div className="w-32 h-32 rounded-full border-2 border-awan-gold/30 flex items-center justify-center">
                  <Brain size={64} className="text-awan-gold opacity-80" strokeWidth={1} />
                </div>
              </div>
              
              {/* Signal nodes */}
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-awan-gold blur-[2px]" />
              <div className="absolute bottom-8 left-4 w-1.5 h-1.5 rounded-full bg-purple-400 blur-[1px]" />
              <div className="absolute top-1/2 -right-2 w-2 h-2 rounded-full bg-cyan-400 blur-[2px]" />
            </div>

            <div className="absolute bottom-6 left-0 right-0 items-center">
              <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                 <span className="text-[9px] font-black text-awan-tx animate-pulse">SYNCHRONISATION EN COURS...</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Tabs */}
        <div className="px-6 mb-6">
          <div className="flex flex-row bg-white/5 rounded-xl p-1 border border-white/5">
            <Touch 
              onPress={() => setActiveTab('status')}
              className={`flex-1 py-3 rounded-lg items-center ${activeTab === 'status' ? 'bg-awan-gold/10' : ''}`}
            >
              <span className={`text-[10px] font-black tracking-widest uppercase ${activeTab === 'status' ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>Protocole</span>
            </Touch>
            <Touch 
              onPress={() => setActiveTab('history')}
              className={`flex-1 py-3 rounded-lg items-center ${activeTab === 'history' ? 'bg-awan-gold/10' : ''}`}
            >
              <span className={`text-[10px] font-black tracking-widest uppercase ${activeTab === 'history' ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>Archive</span>
            </Touch>
          </div>
        </div>

        {activeTab === 'status' ? (
          <StaggerList className="px-6 space-y-4">
            <Heading level={4} mono subtitle="Optimisation" className="mb-2">MODULES D'ENTRAÎNEMENT</Heading>
            
            <TaskAction 
                title="SÉANCE DE FOCUS" 
                sub="15 MINUTES" 
                info="Fréquences Gamma" 
                Icon={Zap} 
                color={theme.title} 
            />
            <TaskAction 
                title="CO-PILOTE ZEN" 
                sub="RESPIRATION" 
                info="Cohérence Cardiaque" 
                Icon={Sparkles} 
                color="#4ECDC4" 
            />
            <TaskAction 
                title="ÉTAT DES LIEUX" 
                sub="JOURNALING" 
                info="Dump cognitif complet" 
                Icon={History} 
                color="#A78BFA" 
            />
          </StaggerList>
        ) : (
          <div className="px-6">
            <DailyCanvas filterModule="mental" />
          </div>
        )}

      </ScrollView>

      {/* Floating Action Button */}
      <View style={[s.fab, { bottom: insets.bottom + 20 }]}>
         <Touch className="w-14 h-14 rounded-2xl bg-awan-gold items-center justify-center shadow-lg shadow-awan-gold/30">
            <Plus size={28} color="black" />
         </Touch>
      </View>
    </PageWrapper>
  );
}

function TaskAction({ title, sub, info, Icon, color }: any) {
    return (
        <StaggerItem>
            <Card className="p-5 border-white/5 bg-white/5 relative overflow-hidden" variant="flat">
                <div className="absolute right-0 top-0 bottom-0 w-1 opacity-40" style={{ backgroundColor: color }} />
                <div className="flex-row items-center gap-5">
                    <div className="w-12 h-12 rounded-xl items-center justify-center bg-white/5 border border-white/10">
                        <Icon size={20} color={color} />
                    </div>
                    <div className="flex-1">
                        <div className="flex-row items-center justify-between mb-1">
                            <span className="text-[8px] font-black text-awan-tx-mute tracking-[0.2em] uppercase">{sub}</span>
                            <span className="text-[8px] font-mono text-awan-gold uppercase tracking-tighter">{info}</span>
                        </div>
                        <span className="text-sm font-black text-awan-tx uppercase tracking-tight">{title}</span>
                    </div>
                </div>
            </Card>
        </StaggerItem>
    )
}

const s = StyleSheet.create({
  fab: { position: 'absolute', right: 20 },
});
