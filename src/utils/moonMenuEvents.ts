type Listener = () => void;
const listeners: Listener[] = [];

export const moonMenuEvents = {
  onOpenEdit: (fn: Listener): (() => void) => {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  },
  emitOpenEdit: (): void => {
    listeners.forEach(fn => fn());
  },
};
