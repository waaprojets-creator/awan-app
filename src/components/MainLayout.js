import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { T } from '../constants/theme';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';

import DashboardScreen from '../screens/DashboardScreen';
import PlanningScreen  from '../screens/PlanningScreen';
import TrajetScreen    from '../screens/TrajetScreen';
import SanteScreen     from '../screens/SanteScreen';
import SettingsScreen  from '../screens/SettingsScreen';
import TasksScreen     from '../screens/TasksScreen';
import AnalyseScreen   from '../screens/AnalyseScreen';
import IslamScreen     from '../screens/IslamScreen';

const SCREENS = {
  Dashboard: DashboardScreen,
  Planning:  PlanningScreen,
  Trajet:    TrajetScreen,
  Sante:     SanteScreen,
  Reglages:  SettingsScreen,
  Tasks:     TasksScreen,
  Analyse:   AnalyseScreen,
  Islam:     IslamScreen,
};

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, padding: 20, backgroundColor: '#300', justifyContent: 'center' }}>
          <Text style={{ color: 'white', fontSize: 14 }}>
            ERREUR: {String(this.state.error?.message || this.state.error)}
          </Text>
          <Text style={{ color: '#faa', fontSize: 11, marginTop: 12 }}>
            {String(this.state.error?.stack || '').slice(0, 800)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function MainLayout() {
  const [currentRoute, setCurrentRoute] = useState('Dashboard');
  const navigate = useCallback((r) => { if (SCREENS[r]) setCurrentRoute(r); }, []);
  const ScreenComponent = SCREENS[currentRoute] || DashboardScreen;

  return (
    <View style={s.root}>
      <ErrorBoundary><AppHeader currentRoute={currentRoute} onNavigate={navigate} /></ErrorBoundary>
      <View style={s.body}>
        <ErrorBoundary><ScreenComponent navigate={navigate} /></ErrorBoundary>
      </View>
      <ErrorBoundary><BottomNav currentRoute={currentRoute} onNavigate={navigate} /></ErrorBoundary>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  body: { flex: 1 },
});
