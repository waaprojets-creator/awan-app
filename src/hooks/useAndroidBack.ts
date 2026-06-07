import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * Intercepts the Android hardware back button.
 * Call once from the top-level layout component.
 * The caller decides whether to navigate back or exit the app.
 */
export function useAndroidBack(onExit: () => void) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onExit();
      return true; // prevent default OS back action
    });
    return () => subscription.remove();
  }, [onExit]);
}
