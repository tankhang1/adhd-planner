import { Platform } from 'react-native';
import type { AccentTheme } from '@/constants/themes';

/** Switch the native app icon to match a theme. Fails silently where unsupported. */
export async function applyAppIcon(theme: AccentTheme) {
  if (Platform.OS === 'web') return;
  try {
    const icons = await import('expo-alternate-app-icons');
    if (!icons.supportsAlternateIcons) return;
    if (icons.getAppIconName() === theme.icon) return;
    await icons.setAlternateAppIcon(theme.icon);
  } catch {
    // Not available in Expo Go or on this device.
  }
}
