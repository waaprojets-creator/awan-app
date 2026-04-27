import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateProvider, useAppState } from './src/context/AppStateContext';
import { T } from './src/constants/theme';
import { L } from './src/constants/labels';
import {
  IconPlanning, IconTrajet, IconSante, IconReglages, ICON_SIZE,
} from './src/constants/icons';

import LockScreen      from './src/screens/LockScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PlanningScreen  from './src/screens/PlanningScreen';
import TrajetScreen    from './src/screens/TrajetScreen';
import SanteScreen     from './src/screens/SanteScreen';
import SettingsScreen  from './src/screens/SettingsScreen';
import TasksScreen     from './src/screens/TasksScreen';
import AnalyseScreen   from './src/screens/AnalyseScreen';
import IslamScreen     from './src/screens/IslamScreen';

const Tab        = createBottomTabNavigator();
const RootStack  = createStackNavigator();
const MainStack  = createStackNavigator();

// =============================================================================
// SPLASH / Loader pendant le chargement initial
// =============================================================================
function SplashLoader() {
  return (
    <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={T.gold} />
    </View>
  );
}

// =============================================================================
// TABS — Planning · Trajet · Santé · Réglages
// =============================================================================
function tabIcon(IconComp) {
  return ({ focused, color }) => (
    <IconComp
      size={ICON_SIZE.tab}
      color={focused ? T.gold : T.tx3}
      opacity={focused ? 1 : 0.7}
    />
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: T.bg2,
          borderTopColor: T.bo,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: T.gold,
        tabBarInactiveTintColor: T.tx3,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tab.Screen
        name="PlanningTab"
        component={PlanningScreen}
        options={{ title: L.tabs.planning, tabBarIcon: tabIcon(IconPlanning) }}
      />
      <Tab.Screen
        name="TrajetTab"
        component={TrajetScreen}
        options={{ title: L.tabs.trajet, tabBarIcon: tabIcon(IconTrajet) }}
      />
      <Tab.Screen
        name="SanteTab"
        component={SanteScreen}
        options={{ title: L.tabs.sante, tabBarIcon: tabIcon(IconSante) }}
      />
      <Tab.Screen
        name="ReglagesTab"
        component={SettingsScreen}
        options={{ title: L.tabs.reglages, tabBarIcon: tabIcon(IconReglages) }}
      />
    </Tab.Navigator>
  );
}

// =============================================================================
// MAIN STACK — Dashboard initial + écrans modaux accessibles depuis le header
// =============================================================================
function MainStackNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Dashboard"
    >
      <MainStack.Screen name="Dashboard" component={DashboardScreen} />
      <MainStack.Screen name="Tabs"      component={TabNavigator} />
      <MainStack.Screen name="Tasks"     component={TasksScreen} />
      <MainStack.Screen name="Analyse"   component={AnalyseScreen} />
      <MainStack.Screen name="Islam"     component={IslamScreen} />
    </MainStack.Navigator>
  );
}

// =============================================================================
// ROOT — Lock screen ou app principale selon l'état
// =============================================================================
function Root() {
  const { isUnlocked, ready } = useAppState();

  if (!ready) {
    return <SplashLoader />;
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!isUnlocked ? (
        <RootStack.Screen name="Lock" component={LockScreen} />
      ) : (
        <RootStack.Screen name="Main" component={MainStackNavigator} />
      )}
    </RootStack.Navigator>
  );
}

// =============================================================================
// APP
// =============================================================================
export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <NavigationContainer>
          <Root />
        </NavigationContainer>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
