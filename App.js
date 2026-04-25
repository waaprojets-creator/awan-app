import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

// Context & Theme
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { T } from './constants/theme';

// Screens
import LockScreen from './screens/LockScreen';
import PlanningScreen from './screens/PlanningScreen';
import TasksScreen from './screens/TasksScreen';
import AnalyseScreen from './screens/AnalyseScreen';
import SettingsScreen from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

SplashScreen.preventAutoHideAsync();

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
          fontFamily: T.fonts.medium,
          fontSize: 11,
        },
      }}
    >
      <Tab.Screen 
        name="Planning" 
        component={PlanningScreen} 
        options={{ title: 'Planning' }}
      />
      <Tab.Screen 
        name="Tasks" 
        component={TasksScreen} 
        options={{ title: 'Tâches' }}
      />
      <Tab.Screen 
        name="Analyse" 
        component={AnalyseScreen} 
        options={{ title: 'Analyse' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: 'Réglages' }}
      />
    </Tab.Navigator>
  );
}

function MainStack() {
  const { isUnlocked } = useAppState();

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
  const [fontsLoaded, fontError] = useFonts({
    'PlusJakartaSans-Light': require('./assets/fonts/PlusJakartaSans-Light.ttf'),
    'PlusJakartaSans-Regular': require('./assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium': require('./assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-Bold': require('./assets/fonts/PlusJakartaSans-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

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
