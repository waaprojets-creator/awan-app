import React, { Component, lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../hooks/useTheme';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAppStore } from '../data/store/appStore';
import { dbFullBus } from '../utils/dbFullBus';
import { ToastProvider, useToast } from './ui/Toast';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';

// Level 1 — always loaded
import DashboardScreen from '../screens/DashboardScreen';
import SanteScreen     from '../screens/SanteScreen';

// Level 2+ — lazy-loaded on first navigation
const PlanningScreen    = lazy(() => import('../screens/PlanningScreen'));
const TrajetScreen      = lazy(() => import('../screens/TrajetScreen'));
const SettingsScreen    = lazy(() => import('../screens/SettingsScreen'));
const TasksScreen       = lazy(() => import('../screens/TasksScreen'));
const AnalyseScreen     = lazy(() => import('../screens/AnalyseScreen'));
const IslamScreen       = lazy(() => import('../screens/IslamScreen'));
const SportScreen       = lazy(() => import('../screens/SportScreen'));
const MensurationScreen = lazy(() => import('../screens/MensurationScreen'));
const NutritionScreen   = lazy(() => import('../screens/NutritionScreen'));
const JournalScreen     = lazy(() => import('../screens/JournalScreen'));
const CoachScreen       = lazy(() => import('../screens/CoachScreen'));
const SleepScreen       = lazy(() => import('../screens/SleepScreen'));
const PhilosophieScreen = lazy(() => import('../screens/PhilosophieScreen'));

const Tab = createBottomTabNavigator();

// ─── Error boundary ──────────────────────────────────────────────────────────

type ErrorState = { error: Error | null };

class ScreenErrorBoundary extends Component<{ children: React.ReactNode }, ErrorState> {
  override state: ErrorState = { error: null };
  static getDerivedStateFromError(e: Error): ErrorState { return { error: e }; }
  override render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, padding: 24 }}>
          <View style={{ padding: 16, borderWidth: 1, borderColor: '#8A0C0C', backgroundColor: '#2A0A0A' }}>
            <Text style={{ color: '#FF4B4B', fontWeight: '700', marginBottom: 8 }}>SYSTEM ERROR</Text>
            <Text style={{ color: '#F8F5F2' }}>{this.state.error.message}</Text>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SuspenseFallback() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
      <ActivityIndicator size="small" color={theme.selected} />
    </View>
  );
}

function DbFullBridge() {
  const { toast } = useToast();
  useEffect(() => {
    const handler = () => toast("Stockage plein — libère de l'espace dans Réglages → DB", 'error');
    return dbFullBus.subscribe(handler);
  }, [toast]);
  return null;
}

// Wraps each screen to pass navigate prop and handle Suspense + error boundary
function wrap(Screen: React.ComponentType<{ navigate: (r: string) => void }>) {
  return function ScreenWrapper({ navigation }: { navigation: any }) {
    return (
      <Suspense fallback={<SuspenseFallback />}>
        <ScreenErrorBoundary>
          <Screen navigate={(route: string) => navigation.navigate(route)} />
        </ScreenErrorBoundary>
      </Suspense>
    );
  };
}

// Stable component refs — defined outside MainLayout to prevent remounts on re-render
const DashboardTab    = wrap(DashboardScreen);
const SanteTab        = wrap(SanteScreen);
const PlanningTab     = wrap(PlanningScreen    as React.ComponentType<{ navigate: (r: string) => void }>);
const TrajetTab       = wrap(TrajetScreen      as React.ComponentType<{ navigate: (r: string) => void }>);
const SettingsTab     = wrap(SettingsScreen    as React.ComponentType<{ navigate: (r: string) => void }>);
const TasksTab        = wrap(TasksScreen       as React.ComponentType<{ navigate: (r: string) => void }>);
const AnalyseTab      = wrap(AnalyseScreen     as React.ComponentType<{ navigate: (r: string) => void }>);
const IslamTab        = wrap(IslamScreen       as React.ComponentType<{ navigate: (r: string) => void }>);
const SportTab        = wrap(SportScreen       as React.ComponentType<{ navigate: (r: string) => void }>);
const MensurationTab  = wrap(MensurationScreen as React.ComponentType<{ navigate: (r: string) => void }>);
const NutritionTab    = wrap(NutritionScreen   as React.ComponentType<{ navigate: (r: string) => void }>);
const JournalTab      = wrap(JournalScreen     as React.ComponentType<{ navigate: (r: string) => void }>);
const CoachTab        = wrap(CoachScreen       as React.ComponentType<{ navigate: (r: string) => void }>);
const SleepTab        = wrap(SleepScreen       as React.ComponentType<{ navigate: (r: string) => void }>);
const PhilosophieTab  = wrap(PhilosophieScreen as React.ComponentType<{ navigate: (r: string) => void }>);

// ─── Main layout ─────────────────────────────────────────────────────────────

export default function MainLayout() {
  const theme = useTheme();
  const { isOnline } = useNetworkStatus();
  const showNetworkBanner = useAppStore((s) => s.showNetworkBanner);
  const [currentRoute, setCurrentRoute] = useState('Dashboard');

  const navigationRef = useNavigationContainerRef();

  const navigate = useCallback((route: string) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(route as never);
    }
  }, [navigationRef]);

  // Android hardware back button
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentRoute !== 'Dashboard') {
        navigate('Dashboard');
      } else {
        Alert.alert(
          'Quitter AWAN',
          "Fermer l'application ?",
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Quitter', onPress: () => BackHandler.exitApp() },
          ],
        );
      }
      return true;
    });
    return () => subscription.remove();
  }, [currentRoute, navigate]);

  return (
    <ToastProvider>
      <DbFullBridge />
      <NavigationContainer
        ref={navigationRef}
        onStateChange={() => {
          const name = navigationRef.getCurrentRoute()?.name ?? 'Dashboard';
          setCurrentRoute(name);
        }}
      >
        <View style={[s.root, { backgroundColor: theme.bg }]}>
          {showNetworkBanner && !isOnline && (
            <View style={{ backgroundColor: theme.statusWarn, paddingVertical: 6, alignItems: 'center', zIndex: 9999 }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#000', letterSpacing: 2, textTransform: 'uppercase' }}>
                HORS LIGNE
              </Text>
            </View>
          )}
          <AppHeader currentRoute={currentRoute} onNavigate={navigate} />
          <View style={s.body}>
            <Tab.Navigator
              screenOptions={{ headerShown: false }}
              tabBar={() => null}
            >
              <Tab.Screen name="Dashboard"   component={DashboardTab} />
              <Tab.Screen name="Planning"    component={PlanningTab} />
              <Tab.Screen name="Trajet"      component={TrajetTab} />
              <Tab.Screen name="Sante"       component={SanteTab} />
              <Tab.Screen name="Reglages"    component={SettingsTab} />
              <Tab.Screen name="Tasks"       component={TasksTab} />
              <Tab.Screen name="Analyse"     component={AnalyseTab} />
              <Tab.Screen name="Islam"       component={IslamTab} />
              <Tab.Screen name="Sport"       component={SportTab} />
              <Tab.Screen name="Mensuration" component={MensurationTab} />
              <Tab.Screen name="Nutrition"   component={NutritionTab} />
              <Tab.Screen name="Journal"     component={JournalTab} />
              <Tab.Screen name="Coach"       component={CoachTab} />
              <Tab.Screen name="Sleep"       component={SleepTab} />
              <Tab.Screen name="Philosophie" component={PhilosophieTab} />
            </Tab.Navigator>
          </View>
          <BottomNav currentRoute={currentRoute} onNavigate={navigate} />
        </View>
      </NavigationContainer>
    </ToastProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
});
