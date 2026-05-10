import { useEffect } from 'react';

/**
 * Intercepte le bouton retour Android (Capacitor) et le bouton retour navigateur.
 * À appeler une seule fois, dans MainLayout.
 *
 * Comportement :
 * - Si l'historique a une entrée précédente → history.back()
 * - Sinon → callback onExit (ex: confirmation de sortie ou App.exitApp())
 */
export function useAndroidBack(onExit: () => void) {
  useEffect(() => {
    let removeListener: (() => void) | null = null;

    // Capacitor (APK) — import dynamique pour ne pas casser le build web
    const setupCapacitor = async () => {
      try {
        const mod = await import('@capacitor/app');
        const handle = await mod.App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack && window.history.length > 1) {
            window.history.back();
          } else {
            onExit();
          }
        });
        removeListener = () => handle.remove();
      } catch {
        // Plugin non installé ou env web : ignore
      }
    };
    setupCapacitor();

    return () => { if (removeListener) removeListener(); };
  }, [onExit]);
}
