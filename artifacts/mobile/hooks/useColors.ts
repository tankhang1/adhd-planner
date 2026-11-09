import colors from '@/constants/colors';
import { useVisualMode } from '@/context/DayflowContext';

/** Returns design tokens. Dayflow is a bright, light-only UI. */
export function useColors() {
  const visualMode = useVisualMode();
  const palette = visualMode === 'focused' ? colors.focused : colors.light;
  return { ...palette, radius: colors.radius };
}
