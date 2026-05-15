import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { Switch, Route, useLocation } from 'wouter';
import { AnimatePresence, motion } from 'motion/react';
import { useTheme, useThemeSync } from '../hooks/useTheme';
import { ToastProvider } from './ui/Toast';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import { useAndroidBack } from '../hooks/useAndroidBack';

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
import JournalScreen     from '../screens/JournalScreen';
import CoachScreen       from '../screens/CoachScreen';

type ErrorState = { error: Error | null };

class ScreenErrorBoundary extends Component<{ children: React.ReactNode }, ErrorState> {
  override state: ErrorState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorState {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="flex-1 p-6">
          <div className="awan-card p-4 border-awan-status-error/50">
            <div className="awan-label mb-2 text-awan-status-error">SYSTEM ERROR</div>
            <div className="awan-value">{this.state.error.message}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageTransition({ children, direction = 1 }: { children: React.ReactNode; direction?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 * direction }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 * direction }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="flex-1 flex flex-col h-full w-full min-h-0 overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

function routeToName(location: string): string {
  if (location.length <= 1) return 'Dashboard';
  const segment = location.substring(1).split('/')[0] ?? '';
  const name = segment.charAt(0).toUpperCase() + segment.slice(1);
  return name === 'Reglages' ? 'Settings' : name;
}

export default function MainLayout() {
  const [location, setLocation] = useLocation();
  const theme = useTheme();
  useThemeSync();

  useAndroidBack(() => {
    if (confirm('Quitter Awan ?')) {
      import('@capacitor/app').then(({ App }) => App.exitApp()).catch(() => {});
    }
  });

  const navigate = (route: string) => {
    const path = route === 'Dashboard' ? '/' : `/${route.toLowerCase()}`;
    setLocation(path);
  };

  const currentRoute = routeToName(location);

  const wrap = (Screen: React.ComponentType<{ navigate: (r: string) => void }>) => () => (
    <PageTransition>
      <Screen navigate={navigate} />
    </PageTransition>
  );

  return (
    <ToastProvider>
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-awan-gold) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.015] awan-scan-line" />

      <AppHeader currentRoute={currentRoute} onNavigate={navigate} />
      <View style={s.body}>
        <ScreenErrorBoundary key={location}>
          <AnimatePresence mode="wait">
            <Switch key={location}>
              <Route path="/">{wrap(DashboardScreen)}</Route>
              <Route path="/dashboard">{wrap(DashboardScreen)}</Route>
              <Route path="/planning">{wrap(PlanningScreen)}</Route>
              <Route path="/trajet">{wrap(TrajetScreen)}</Route>
              <Route path="/sante">{wrap(SanteScreen)}</Route>
              <Route path="/settings">{wrap(SettingsScreen)}</Route>
              <Route path="/reglages">{wrap(SettingsScreen)}</Route>
              <Route path="/tasks">{wrap(TasksScreen)}</Route>
              <Route path="/analyse">{wrap(AnalyseScreen)}</Route>
              <Route path="/islam">{wrap(IslamScreen)}</Route>
              <Route path="/sport">{wrap(SportScreen)}</Route>
              <Route path="/mensuration">{wrap(MensurationScreen)}</Route>
              <Route path="/nutrition">{wrap(NutritionScreen)}</Route>
              <Route path="/journal">{wrap(JournalScreen)}</Route>
              <Route path="/coach">{wrap(CoachScreen)}</Route>
              <Route>{wrap(DashboardScreen)}</Route>
            </Switch>
          </AnimatePresence>
        </ScreenErrorBoundary>
      </View>
      <ScreenErrorBoundary>
        <BottomNav currentRoute={currentRoute} onNavigate={navigate} />
      </ScreenErrorBoundary>
    </View>
    </ToastProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
});
