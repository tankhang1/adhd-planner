import 'expo-router/entry';
import { Platform } from 'react-native';

// Android home-screen widget: handles add/update/resize even when the app is closed.
if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { widgetTaskHandler } = require('./widgets/android');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // Native module missing (Expo Go) — widgets need a development build.
  }
}
