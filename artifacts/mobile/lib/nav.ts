import { router } from 'expo-router';

/**
 * Close the current screen. Screens can be opened straight from a deep link
 * (widget, notification, Shortcut) with nothing underneath — then go Home.
 */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}
