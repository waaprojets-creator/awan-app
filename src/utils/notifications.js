
export const NOTIF_INTERVALS = [
  { label: 'Aucun', value: 0 },
  { label: 'Au moment', value: 1 },
  { label: '5 min avant', value: 5 },
  { label: '15 min avant', value: 15 },
  { label: '30 min avant', value: 30 },
  { label: '1h avant', value: 60 },
  { label: '2h avant', value: 120 },
  { label: 'Le jour même (8h)', value: 480 },
];

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function sendNotification(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

let lastCheck = 0;
const notifiedIds = new Set();

export function checkAndNotify(db) {
  if (!db || Notification.permission !== 'granted') return;
  const now = new Date();
  // Don't check too often
  if (now.getTime() - lastCheck < 30000) return; 
  lastCheck = now.getTime();

  const events = db.events || [];
  const tasks = db.tasks || [];

  const checkItem = (item, type) => {
    if (!item.reminder || item.reminder === 0 || notifiedIds.has(item.id)) return;

    let dueTime;
    if (type === 'event') {
      if (!item.date || !item.time) return;
      dueTime = new Date(`${item.date}T${item.time}`);
    } else {
      if (!item.date) return;
      // Tasks are usually for a day, if no time assume 09:00
      dueTime = new Date(`${item.date}T${item.time || '09:00'}`);
    }

    const diffMinutes = (dueTime - now) / (1000 * 60);

    // If within the reminder threshold and not in the past
    if (diffMinutes <= item.reminder && diffMinutes > -5) {
      sendNotification(
        `Rappel: ${item.title}`,
        type === 'event' ? `L'événement commence dans ${Math.round(diffMinutes)} min.` : `La tâche est prévue bientôt.`
      );
      notifiedIds.add(item.id);
    }
  };

  events.forEach(ev => checkItem(ev, 'event'));
  tasks.forEach(tk => {
      if (!tk.done) checkItem(tk, 'task');
  });
}
