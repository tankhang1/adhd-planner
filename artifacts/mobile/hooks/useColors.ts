import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';
import { themeById } from '@/constants/themes';
import { useAppearance, useThemeId, useVisualMode } from '@/context/DayflowContext';

/** Resolved light/dark scheme from the user's Appearance setting. */
export function useIsDark() {
  const system = useColorScheme();
  const appearance = useAppearance();
  return appearance === 'dark' || (appearance === 'system' && system === 'dark');
}

/** Design tokens for the current visual mode, appearance and Pro theme. */
export function useColors() {
  const visualMode = useVisualMode();
  const dark = useIsDark();
  const theme = themeById(useThemeId());
  const palette = dark
    ? visualMode === 'focused' ? colors.focusedDark : colors.dark
    : visualMode === 'focused' ? colors.focused : colors.light;
  if (theme.id === 'violet') return { ...palette, dark, radius: colors.radius };
  const primary = dark ? theme.darkPrimary : theme.primary;
  return {
    ...palette,
    dark,
    primary,
    tint: primary,
    forest: primary,
    secondary: dark ? theme.darkSecondary : theme.secondary,
    secondaryForeground: dark ? palette.secondaryForeground : theme.secondaryForeground,
    radius: colors.radius,
  };
}
