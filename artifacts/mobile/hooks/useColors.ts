import colors from '@/constants/colors';
import { themeById } from '@/constants/themes';
import { useThemeId, useVisualMode } from '@/context/DayflowContext';

/** Returns design tokens. Dayflow is a bright, light-only UI. Pro themes swap the accent. */
export function useColors() {
  const visualMode = useVisualMode();
  const theme = themeById(useThemeId());
  const palette = visualMode === 'focused' ? colors.focused : colors.light;
  if (theme.id === 'violet') return { ...palette, radius: colors.radius };
  return {
    ...palette,
    primary: theme.primary,
    tint: theme.primary,
    forest: theme.primary,
    secondary: theme.secondary,
    secondaryForeground: theme.secondaryForeground,
    radius: colors.radius,
  };
}
