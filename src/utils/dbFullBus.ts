// Bus de notification « stockage plein » compatible natif + web.
// Remplace l'ancien window.dispatchEvent(CustomEvent('awan:db-full')) web-only.

type Listener = () => void;

const listeners = new Set<Listener>();

export const dbFullBus = {
  emit(): void {
    listeners.forEach((l) => {
      try { l(); } catch { /* un listener défaillant ne casse pas les autres */ }
    });
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};
