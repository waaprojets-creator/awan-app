import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
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

/**
 * Layout immuable de l'app après déverrouillage.
 *
 *  ┌──────────────────────────┐
 *  │      AppHeader (fixe)    │
 *  ├──────────────────────────┤
 *  │                          │
 *  │      Contenu navigué     │
 *  │       (scrollable)       │
 *  │                          │
 *  ├──────────────────────────┤
 *  │     BottomNav (fixe)     │
 *  └──────────────────────────┘
 *
 * Au lieu d'utiliser React Navigation pour les routes principales, on gère
 * un état local `currentRoute`. Cela permet d'avoir un header et une bottom
 * nav VRAIMENT immuables (rendus une seule fois, pas re-créés à chaque nav).
 *
 * NB : on perd la "stack history" native (back button, gestes swipe). Pour
 * cette app de planning personnel, c'est un compromis acceptable — la
 * navigation est plate et déterministe.
 */

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

export default function MainLayout() {
  const [currentRoute, setCurrentRoute] = useState('Dashboard');

  const navigate = useCallback((route) => {
    if (SCREENS[route]) setCurrentRoute(route);
  }, []);

  const ScreenComponent = SCREENS[currentRoute] || DashboardScreen;

  return (
    <View style={s.root}>
      <AppHeader currentRoute={currentRoute} onNavigate={navigate} />
      <View style={s.body}>
        <ScreenComponent navigate={navigate} />
      </View>
      <BottomNav currentRoute={currentRoute} onNavigate={navigate} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  body: { flex: 1 },
});
