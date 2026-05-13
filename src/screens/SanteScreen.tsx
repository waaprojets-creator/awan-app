import React from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useAppState } from '../context/AppStateContext';
import { PageWrapper, StaggerItem } from '../components/Animated';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';
import { Dumbbell, Utensils, Ruler, Activity, Shield, TrendingUp, Zap, Heart, Plus, Brain } from 'lucide-react';

export default function SanteScreen({ navigate }: any) {
  const theme = useTheme();

  const SECTIONS = [
    { 
      id: 'sport', 
      title: 'CONTRÔLE OPÉRATIF', 
      sub: 'SPORT & PERFORMANCE', 
      desc: 'Planification et exécution des protocoles d\'entraînement physique.',
      Icon: Dumbbell,
      route: 'Sport',
      status: 'ACTIVE',
      color: theme.title
    },
    { 
      id: 'nutrition', 
      title: 'LOGISTIQUE BIOLOGIQUE', 
      sub: 'NUTRITION & CARBURANT', 
      desc: 'Gestion des apports caloriques et optimisation métabolique.',
      Icon: Utensils,
      route: 'Nutrition',
      status: 'OPTIMAL',
      color: '#FF6B6B'
    },
    { 
      id: 'mensuration', 
      title: 'SCAN BIOMÉTRIQUE', 
      sub: 'COMPOSITION CORPORELLE', 
      desc: 'Suivi des indicateurs de structure et de masse corporelle.',
      Icon: Ruler,
      route: 'Mensuration',
      status: 'SYNC',
      color: '#4ECDC4'
    },
    { 
      id: 'mental', 
      title: 'CONTRÔLE COGNITIF', 
      sub: 'MÉTRIQUES MENTALES', 
      desc: 'Analyse du focus, du stress et de l\'état de conscience optimal.',
      Icon: Brain,
      route: 'Mental',
      status: 'OPTIMAL',
      color: '#A78BFA'
    },
  ];

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <div className="px-6 pt-4 pb-4">
           <Heading level={1} subtitle="Système de Monitoring Biosphère">CENTRE DE SANTÉ</Heading>

           <div className="mt-8 grid grid-cols-2 gap-4">
              <Card className="p-5 bg-white/5 border-white/5 relative overflow-hidden" variant="flat">
                 <div className="absolute -right-4 -top-4 w-16 h-16 bg-awan-gold/10 rounded-full blur-2xl" />
                 <Heart size={14} className="text-awan-gold mb-3" />
                 <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest mb-1 block">STATUT VITAL</span>
                 <span className="text-xl font-black text-awan-tx uppercase tracking-tight">STABLE</span>
              </Card>
              <Card className="p-5 bg-white/5 border-white/5" variant="flat">
                 <Activity size={14} className="text-awan-status-error mb-3" />
                 <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest mb-1 block">RÉCUPÉRATION</span>
                 <span className="text-xl font-black text-awan-tx uppercase tracking-tight">84%</span>
              </Card>
           </div>
        </div>

        <div className="px-6 space-y-6">
           <div className="flex flex-row justify-between items-center mb-2 px-1">
              <Heading level={4} mono subtitle="Unités Disponibles" className="mb-0">MODULES TACTIQUES</Heading>
              <Touch className="w-8 h-8 rounded-full bg-white/5 items-center justify-center border border-white/10">
                 <Plus size={14} className="text-awan-tx-mute" />
              </Touch>
           </div>

           {SECTIONS.map((s, i) => (
             <SectionCard 
               key={s.id} 
               data={s} 
               index={i} 
               onPress={() => navigate(s.route)} 
             />
           ))}
        </div>

        <div className="px-6 mt-12 mb-20">
           <Card className="p-8 bg-awan-gold/5 border-awan-gold/20 flex-row items-center gap-6" variant="flat">
              <div className="w-16 h-16 rounded-3xl bg-awan-gold items-center justify-center shadow-lg shadow-awan-gold/30">
                 <Shield size={32} className="text-black" />
              </div>
              <div className="flex-1">
                 <span className="text-[10px] font-black text-awan-gold tracking-widest uppercase mb-1 block">Advanced Security</span>
                 <span className="text-lg font-black text-awan-tx leading-tight">SYSTÈME DE PROTECTION PHYSIQUE ACTIVÉ</span>
              </div>
           </Card>
        </div>
      </ScrollView>
    </PageWrapper>
  );
}

function SectionCard({ data, index, onPress, ...props }: any) {
  const { Icon, color } = data;
  return (
    <StaggerItem index={index}>
       <Touch onPress={onPress} className="block w-full text-left">
          <Card className="group bg-awan-surface/20 border-white/5 hover:border-awan-gold/40 transition-all p-6 relative overflow-hidden" variant="flat">
             <div className="flex flex-row items-start gap-5">
                <div 
                  className="w-14 h-14 rounded-2xl items-center justify-center border transition-all group-hover:scale-110"
                  style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
                >
                   <Icon size={24} color={color} />
                </div>
                
                <div className="flex-1">
                   <div className="flex flex-row items-center justify-between mb-1">
                      <span className="text-[10px] font-black tracking-widest uppercase" style={{ color }}>{data.title}</span>
                      <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                         <span className="text-[8px] font-black text-awan-tx-mute tracking-tighter uppercase">{data.status}</span>
                      </div>
                   </div>
                   <Heading level={3} className="text-awan-tx mb-2">{data.sub}</Heading>
                   <span className="text-xs text-awan-tx-mute leading-relaxed">{data.desc}</span>
                </div>
             </div>
             
             {/* Progress bar simulation */}
             <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
                <div className="h-full opacity-50" style={{ width: `${60 + index * 10}%`, backgroundColor: color }} />
             </div>
          </Card>
       </Touch>
    </StaggerItem>
  );
}
