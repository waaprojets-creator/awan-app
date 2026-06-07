import React from 'react';

// Minimal test stub for react-native-gesture-handler (happy-dom environment).
export const GestureHandlerRootView = ({ children }: { children?: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);

const tap = () => chainable();
function chainable(): any {
  const api: any = {};
  const methods = ['onBegin', 'onStart', 'onEnd', 'onFinalize', 'onUpdate', 'onChange',
    'minDuration', 'maxDistance', 'enabled', 'activeOffsetY', 'activeOffsetX', 'failOffsetY'];
  for (const m of methods) api[m] = () => api;
  return api;
}

export const Gesture = {
  Tap: tap,
  Pan: tap,
  LongPress: tap,
  Race: (...g: any[]) => g[0],
  Simultaneous: (...g: any[]) => g[0],
  Exclusive: (...g: any[]) => g[0],
};

export const GestureDetector = ({ children }: { children?: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);
