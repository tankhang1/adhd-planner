import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { fromDateKey } from '@/context/DayflowContext';
import type { DayTask } from '@/context/DayflowContext';

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

export interface ReminderPrefs {
  enabled: boolean;
  lead: number;
  quietStart: number | null;
  quietEnd: number | null;
}

/** True if a clock time (minutes since midnight) falls inside quiet hours. */
export function inQuietHours(minutes: number, start: number | null, end: number | null) {
  if (start === null || end === null || start === end) return false;
  const m = ((minutes % 1440) + 1440) % 1440;
  return start < end ? m >= start && m < end : m >= start || m < end; // wraps past midnight
}

/**
 * Re-schedules gentle transition reminders: `lead` minutes before and at start,
 * skipping quiet hours. Safe to call often — it clears previous reminders first.
 */
export async function syncReminders(tasks: DayTask[], { enabled, lead, quietStart, quietEnd }: ReminderPrefs) {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  const now = Date.now();
  const horizon = now + 48 * 60 * 60 * 1000;
  const upcoming = tasks
    .filter((t) => !t.done && at(t, 0).getTime() > now && at(t, 0).getTime() < horizon)
    .sort((x, y) => at(x, 0).getTime() - at(y, 0).getTime())
    .slice(0, 30); // iOS caps pending notifications at 64

  for (const task of upcoming) {
    const soon = at(task, -lead);
    const start = at(task, 0);
    const quiet = (d: Date) => inQuietHours(d.getHours() * 60 + d.getMinutes(), quietStart, quietEnd);
    if (soon.getTime() > now && soon.getTime() < horizon && !quiet(soon)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `In ${lead} minutes: ${task.title}`,
          body: 'Start wrapping up what you’re doing — no rush.',
          data: { taskId: task.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: soon },
      });
    }
    if (start.getTime() > now && start.getTime() < horizon && !quiet(start)) {
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
