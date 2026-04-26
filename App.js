import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateProvider, useAppState } from './src/context/AppStateContext';
import { T } from './src/constants/theme';

import LockScreen from './src/screens/LockScreen';
import PlanningScreen from './src/screens/PlanningScreen';
import TasksScreen from './src/screens/TasksScreen';
import AnalyseScreen from './src/screens/AnalyseScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function SplashLoader() {
  return (
    <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={T.gold} />
    </View>
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
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: T.gold,
        tabBarInactiveTintColor: T.tx3,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen name="Planning" component={PlanningScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ title: 'Tâches' }} />
      <Tab.Screen name="Analyse" component={AnalyseScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Réglages' }} />
    </Tab.Navigator>
  );
}

function MainStack() {
  const { isUnlocked, ready } = useAppState();

  if (!ready) {
    return <SplashLoader />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isUnlocked ? (
        <Stack.Screen name="Lock" component={LockScreen} />
      ) : (
        <Stack.Screen name="MainTabs" component={TabNavigator} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <NavigationContainer>
          <MainStack />
        </NavigationContainer>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
