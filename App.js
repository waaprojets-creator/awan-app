import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Context & Theme
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { T } from './constants/theme';

// Screens
import LockScreen from './screens/LockScreen';
import PlanningScreen from './screens/PlanningScreen';
// Vérifie que ces fichiers existent, sinon remplace par PlanningScreen temporairement
import TasksScreen from './screens/PlanningScreen'; 
import AnalyseScreen from './screens/PlanningScreen'; 
import SettingsScreen from './screens/PlanningScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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
          fontWeight: '600'
        },
      }}
    >
      <Tab.Screen name="Planning" component={PlanningScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Analyse" component={AnalyseScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
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
