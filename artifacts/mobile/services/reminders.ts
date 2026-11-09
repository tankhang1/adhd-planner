import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { fromDateKey } from '@/context/DayflowContext';
import type { DayTask } from '@/context/DayflowContext';

const LEAD_MINUTES = 5;
const supported = Platform.OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function requestReminderPermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

function at(task: DayTask, offsetMin: number) {
  const d = fromDateKey(task.date);
  d.setMinutes(task.start + offsetMin);
  return d;
}

/**
 * Re-schedules gentle transition reminders: 5 minutes before and at start.
 * Safe to call often — it clears previous Dayflow reminders first.
 */
export async function syncReminders(tasks: DayTask[], enabled: boolean) {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  const now = Date.now();
  const horizon = now + 48 * 60 * 60 * 1000;
  const upcoming = tasks.filter((t) => !t.done).slice(0, 30); // iOS caps pending notifications at 64

  for (const task of upcoming) {
    const soon = at(task, -LEAD_MINUTES);
    const start = at(task, 0);
    if (soon.getTime() > now && soon.getTime() < horizon) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `In ${LEAD_MINUTES} minutes: ${task.title}`,
          body: 'Start wrapping up what you’re doing — no rush.',
          data: { taskId: task.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: soon },
      });
    }
    if (start.getTime() > now && start.getTime() < horizon) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time for: ${task.title}`,
          body: `${task.duration} minutes. Tap to open the timer.`,
          data: { taskId: task.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: start },
      });
    }
  }
}

export function addReminderTapListener(onTask: (taskId: string) => void) {
  if (!supported) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((res) => {
    const id = res.notification.request.content.data?.taskId;
    if (typeof id === 'string') onTask(id);
  });
  return () => sub.remove();
}
