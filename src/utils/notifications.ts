// Stub — remplacé par modules/notifications Sprint 3+
export const requestNotificationPermission = async (): Promise<boolean> => false;

export interface NotifInterval {
  value: number;
  label: string;
}

export const NOTIF_INTERVALS: NotifInterval[] = [
  { value: 0, label: 'OFF' },
  { value: 5, label: '5 MIN' },
  { value: 15, label: '15 MIN' },
  { value: 30, label: '30 MIN' },
  { value: 60, label: '1H' },
];
