import { AppRegistry } from 'react-native';
import App from './App.tsx';
import './index.css';

// Root registration for React Native Web
AppRegistry.registerComponent('App', () => App);

const rootTag = document.getElementById('root');
if (rootTag) {
  AppRegistry.runApplication('App', {
    initialProps: {},
    rootTag,
  });
}
