import { Platform } from 'react-native';
import type { DayTask } from '@/context/DayflowContext';
import { LiveActivity } from '@/modules/dayflow-live-activity';
import { buildWidgetPayload, currentAndNext } from './widgetData';

export const APP_GROUP = 'group.com.nexa.dayflow';

type ExtensionStorageCtor = {
  new (group: string): { set: (key: string, value: string) => void };
  reloadWidget: (name?: string) => void;
};

// Loaded lazily so Expo Go / web don't crash when the native module is absent.
let storage: { set: (k: string, v: string) => void } | null = null;
let Storage: ExtensionStorageCtor | null = null;
function iosStorage() {
  if (Platform.OS !== 'ios') return null;
  if (storage) return storage;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Storage = require('@bacons/apple-targets').ExtensionStorage as ExtensionStorageCtor;
    storage = new Storage(APP_GROUP);
  } catch {
    storage = null;
  }
  return storage;
}

async function updateAndroid() {
  if (Platform.OS !== 'android') return;
  try {
    const [{ requestWidgetUpdate }, { renderTodayWidget }] = await Promise.all([
      import('react-native-android-widget'),
      import('@/widgets/android'),
    ]);
    await requestWidgetUpdate({
      widgetName: 'DayflowToday',
      renderWidget: () => renderTodayWidget(),
      widgetNotFound: () => {},
    });
  } catch {
    // Not available in Expo Go.
  }
}

/**
 * Push the latest plan to home-screen widgets and keep the Live Activity
 * in sync with whatever is happening right now.
 */
export async function syncWidgets(tasks: DayTask[], liveActivityEnabled: boolean) {
  const payload = buildWidgetPayload(tasks);

  const s = iosStorage();
  if (s) {
    try {
      s.set('widgetData', JSON.stringify(payload));
      Storage?.reloadWidget();
    } catch {}
  }

  await updateAndroid();

  if (Platform.OS === 'ios') {
    const { current, next, overrun } = currentAndNext(payload);
    // A running block wins; otherwise keep showing one that just ran over.
    const shown = current ?? overrun;
    if (liveActivityEnabled && shown) {
      await LiveActivity.start({
        taskId: shown.id,
        title: shown.title,
        start: shown.start,
        end: shown.end,
        icon: shown.icon,
        tone: shown.tone,
        ink: shown.ink,
        nextTitle: next?.title ?? null,
      }).catch(() => null);
    } else {
      await LiveActivity.endAll().catch(() => {});
    }
  }
}

export const liveActivitySupported = () => LiveActivity.isSupported();
