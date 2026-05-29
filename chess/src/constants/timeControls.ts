import type { TimeControl } from '@/types/chess';

export const TIME_CONTROLS: TimeControl[] = [
  { minutes: 1,  increment: 0, label: 'Bullet 1+0'    },
  { minutes: 2,  increment: 1, label: 'Bullet 2+1'    },
  { minutes: 3,  increment: 0, label: 'Blitz 3+0'     },
  { minutes: 3,  increment: 2, label: 'Blitz 3+2'     },
  { minutes: 5,  increment: 0, label: 'Blitz 5+0'     },
  { minutes: 5,  increment: 3, label: 'Blitz 5+3'     },
  { minutes: 10, increment: 0, label: 'Rapid 10+0'    },
  { minutes: 10, increment: 5, label: 'Rapid 10+5'    },
  { minutes: 15, increment: 10,label: 'Rapid 15+10'   },
  { minutes: 30, increment: 0, label: 'Classique 30+0'},
];
