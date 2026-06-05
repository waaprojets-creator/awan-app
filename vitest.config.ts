import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'react-native': 'react-native-web',
      'react-native-reanimated': path.resolve(__dirname, 'node_modules/react-native-reanimated/mock.js'),
      'react-native-gesture-handler': path.resolve(__dirname, 'src/__mocks__/react-native-gesture-handler.ts'),
      'expo-status-bar': path.resolve(__dirname, 'src/__mocks__/expo-status-bar.ts'),
    },
  },
});
