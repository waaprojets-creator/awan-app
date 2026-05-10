import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { Switch, Route, useLocation } from 'wouter';
import { AnimatePresence, motion } from 'motion/react';
import { useTheme, useThemeSync } from '../hooks/useTheme';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import { useAndroidBack } from '../hooks/useAndroidBack';

// Screens
import DashboardScreen   from '../screens/DashboardScreen';
import PlanningScreen    from '../screens/PlanningScreen';
import TrajetScreen      from '../screens/TrajetScreen';
import SanteScreen       from '../screens/SanteScreen';
import SettingsScreen    from '../screens/SettingsScreen';
import TasksScreen       from '../screens/TasksScreen';
import AnalyseScreen     from '../screens/AnalyseScreen';
import IslamScreen       from '../screens/IslamScreen';
import SportScreen       from '../screens/SportScreen';
import MensurationScreen from '../screens/MensurationScreen';
import NutritionScreen   from '../screens/NutritionScreen';
import MentalScreen      from '../screens/MentalScreen';
import JournalScreen     from '../screens/JournalScreen';

class ErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { error: null };
  }
  static getDerivedStateFromError(error: any) { return { error }; }
  render() {
    const { error } = (this as any).state;
    if (error) {
      return (
        <div className="flex-1 p-6">
          <div className="awan-card p-4 border-awan-status-error/50">
            <div className="awan-label mb-2 text-awan-status-error">SYSTEM ERROR</div>
            <div className="awan-value">{error?.message || String(error)}</div>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const PageTransition = ({ children }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    className="flex-1 flex flex-col h-full w-full min-h-0 overflow-hidden"
  >
    {children}
  </motion.div>
);

export default function MainLayout() {
  const [location, setLocation] = useLocation();
  const theme = useTheme();
  useThemeSync();

  useAndroidBack(() => {
    // Stratégie de sortie : confirmation puis quit
    if (confirm('Quitter Awan ?')) {
      import('@capacitor/app').then(({ App }) => App.exitApp()).catch(() => {});
    }
  });

  const navigate = (route) => {
    const path = route === 'Dashboard' ? '/' : `/${route.toLowerCase()}`;
    setLocation(path);
  };

  let currentRoute = 'Dashboard';
  if (location.length > 1) {
    const segment = location.substring(1).split('/')[0];
    currentRoute = segment.charAt(0).toUpperCase() + segment.slice(1);
    if (currentRoute === 'Reglages') currentRoute = 'Settings';
  }

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      {/* Tactical Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" 
           style={{ backgroundImage: 'radial-gradient(circle, var(--color-awan-gold) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.015] awan-scan-line" />

      <AppHeader currentRoute={currentRoute} onNavigate={navigate} />
      <View style={s.body}>
        <ErrorBoundary key={location}>
          <AnimatePresence mode="wait">
            <Switch key={location}>
              <Route path="/">{() => <PageTransition><DashboardScreen navigate={navigate} /></PageTransition>}</Route>
              <Route path="/dashboard">{() => <PageTransition><DashboardScreen navigate={navigate} /></PageTransition>}</Route>
              <Route path="/planning">{() => <PageTransition><PlanningScreen navigate={navigate} /></PageTransition>}</Route>
              <Route path="/trajet">{() => <PageTransition><TrajetScreen navigate={navigate} /></PageTransition>}</Route>
              <Route path="/sante">{() => <PageTransition><SanteScreen navigate={navigate} /></PageTransition>}</Route>
              <Route path="/settings">{() => <PageTransition><SettingsScreen navigate={navigate} /></PageTransition>}</Route>
              <Route path="/reglages">{() => <PageTransition><SettingsScreen navigate={navigate} /></PageTransition>}</Route>
              <Route path="/tasks">{() => <PageTransition><TasksScreen navigate={navigate} /></PageTransition>}</Route>
              <Route path="/analyse">{() => <PageTransition><AnalyseScreen navigate={navigate} /></PageTransition>}</Route>
              <Route path="/islam">{() => <PageTransition><IslamScreen navigate={navigate} /></PageTransition>}</Route>
              <Route path="/sport">{() => <PageTransition><SportScreen navigate={navigate} /></PageTransition>}</Route>
              <Route path="/mensuration">{() => <PageTransition><MensurationScreen navigate={navigate} /></PageTransition>}</Route>
              <Route path="/nutrition">{() => <PageTransition><NutritionScreen navigate={navigate} /></PageTransition>}</Route>
              <Route path="/mental">{() => <PageTransition><MentalScreen navigate={navigate} /></PageTransition>}</Route>
              <Route path="/journal">{() => <PageTransition><JournalScreen navigate={navigate} /></PageTransition>}</Route>
              <Route>{() => <PageTransition><DashboardScreen navigate={navigate} /></PageTransition>}</Route>
            </Switch>
          </AnimatePresence>
        </ErrorBoundary>
      </View>
      <ErrorBoundary><BottomNav currentRoute={currentRoute} onNavigate={navigate} /></ErrorBoundary>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
});
