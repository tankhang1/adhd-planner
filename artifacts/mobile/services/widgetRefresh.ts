import { Platform } from 'react-native';

/**
 * Android widgets can only ask the system for an update every 30 minutes, so the
 * "min left" text and progress bar would freeze while the app is closed. A background
 * task re-renders the widget roughly every 15 minutes (the shortest interval Android
 * allows). iOS widgets don't need this: WidgetKit timelines advance on their own.
 */
export const WIDGET_REFRESH_TASK = 'dayflow-widget-refresh';

/** Must run at module scope on startup (index.ts), before the app renders. */
export function defineWidgetRefreshTask() {
  if (Platform.OS !== 'android') return;
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
    const { BackgroundTaskResult } = require('expo-background-task') as typeof import('expo-background-task');
    /* eslint-enable @typescript-eslint/no-require-imports */
    TaskManager.defineTask(WIDGET_REFRESH_TASK, async () => {
      try {
        const [{ requestWidgetUpdate }, { renderTodayWidget }] = await Promise.all([
          import('react-native-android-widget'),
          import('@/widgets/android'),
        ]);
        await requestWidgetUpdate({ widgetName: 'DayflowToday', renderWidget: () => renderTodayWidget(), widgetNotFound: () => {} });
        return BackgroundTaskResult.Success;
      } catch {
        return BackgroundTaskResult.Failed;
      }
    });
  } catch {
    // Native modules missing (Expo Go).
  }
}

/** Call once the app is running. Safe to call repeatedly. */
export async function registerWidgetRefresh() {
  if (Platform.OS !== 'android') return;
  try {
    const BackgroundTask = await import('expo-background-task');
    const TaskManager = await import('expo-task-manager');
    if (await TaskManager.isTaskRegisteredAsync(WIDGET_REFRESH_TASK)) return;
    await BackgroundTask.registerTaskAsync(WIDGET_REFRESH_TASK, { minimumInterval: 15 });
  } catch {
    // Not available on this device/build.
  }
}
