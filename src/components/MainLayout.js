import React from 'react';
import { View, Text } from 'react-native';

export default function MainLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: 'blue', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: 'white', fontSize: 24 }}>MAINLAYOUT OK</Text>
    </View>
  );
}
