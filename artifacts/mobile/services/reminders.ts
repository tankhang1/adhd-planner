import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { fromDateKey } from '@/context/DayflowContext';
import type { DayTask } from '@/context/DayflowContext';
import { tr } from '@/i18n';

const supported = Platform.OS !== 'web';

export const OVERRUN_CATEGORY = 'dayflow-overrun';
export const ACTION_EXTEND = 'EXTEND_10';
export const ACTION_DONE = 'MARK_DONE';

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
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const next = await Notifications.requestPermissionsAsync();
    return next.granted;
  } catch {
    return false;
  }
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
function quietAt(d: Date, start: number | null, end: number | null) {
  return inQuietHours(d.getHours() * 60 + d.getMinutes(), start, end);
}

export async function syncReminders(tasks: DayTask[], { enabled, lead, quietStart, quietEnd }: ReminderPrefs) {
  if (!supported) return;
  // Buttons on "time's up" notifications — re-registered so they follow the app language.
  await Notifications.setNotificationCategoryAsync(OVERRUN_CATEGORY, [
    { identifier: ACTION_EXTEND, buttonTitle: tr('notif.actionExtend'), options: { opensAppToForeground: true } },
    { identifier: ACTION_DONE, buttonTitle: tr('notif.actionDone'), options: { opensAppToForeground: true } },
  ]).catch(() => {});
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  const now = Date.now();
  const horizon = now + 48 * 60 * 60 * 1000;
  const upcoming = tasks
    .filter((t) => !t.done && at(t, 0).getTime() > now && at(t, 0).getTime() < horizon)
    .sort((x, y) => at(x, 0).getTime() - at(y, 0).getTime())
    .slice(0, 10); // up to 6 notifications each; iOS caps pending notifications at 64

  // Gentle overrun nudges: at the end of a block, then 10 minutes later.
  const ending = tasks
    .filter((t) => !t.done && at(t, t.duration).getTime() > now && at(t, t.duration).getTime() < horizon)
    .sort((x, y) => at(x, x.duration).getTime() - at(y, y.duration).getTime())
    .slice(0, 10);
  for (const task of ending) {
    const end = at(task, task.duration);
    const later = at(task, task.duration + 10);
    if (!quietAt(end, quietStart, quietEnd)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: tr('notif.endTitle', { title: task.title }),
          body: tr('notif.endBody'),
          data: { taskId: task.id },
          categoryIdentifier: OVERRUN_CATEGORY,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: end },
      });
    }
    if (!quietAt(later, quietStart, quietEnd)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: tr('notif.stillTitle', { title: task.title }),
          body: tr('notif.stillBody'),
          data: { taskId: task.id },
          categoryIdentifier: OVERRUN_CATEGORY,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: later },
      });
    }
  }

  for (const task of upcoming) {
    const soon = at(task, -lead);
    const start = at(task, 0);
    const quiet = (d: Date) => inQuietHours(d.getHours() * 60 + d.getMinutes(), quietStart, quietEnd);
    if (soon.getTime() > now && soon.getTime() < horizon && !quiet(soon)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: tr('notif.soonTitle', { count: lead, title: task.title }),
          body: tr('notif.soonBody'),
          data: { taskId: task.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: soon },
      });
    }
    // Trips: a "start getting ready" nudge, then "time to leave".
    if (task.travel) {
      const leave = at(task, -task.travel);
      const ready = at(task, -task.travel - (task.prep ?? 0));
      if (task.prep && ready.getTime() > now && !quiet(ready)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: tr('notif.readyTitle', { title: task.title }),
            body: tr('notif.readyBody', { count: task.prep }),
            data: { taskId: task.id },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: ready },
        });
      }
      if (leave.getTime() > now && !quiet(leave)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: tr('notif.leaveTitle', { title: task.title }),
            body: tr('notif.leaveBody', { count: task.travel }),
            data: { taskId: task.id },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: leave },
        });
      }
    }
    if (start.getTime() > now && start.getTime() < horizon && !quiet(start)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: tr('notif.startTitle', { title: task.title }),
          body: tr('notif.startBody', { count: task.duration }),
          data: { taskId: task.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: start },
      });
    }
  }
}

export type ReminderAction = 'open' | 'extend' | 'done';

export function addReminderTapListener(onTask: (taskId: string, action: ReminderAction) => void) {
  if (!supported) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((res) => {
    const id = res.notification.request.content.data?.taskId;
    if (typeof id !== 'string') return;
    const a = res.actionIdentifier;
    onTask(id, a === ACTION_EXTEND ? 'extend' : a === ACTION_DONE ? 'done' : 'open');
  });
  return () => sub.remove();
}
