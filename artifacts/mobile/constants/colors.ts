/**
 * Dayflow design tokens — bright, airy, colorful visual-planner palette.
 *
 * Activity tones (sage, apricot, sky, lilac, rose, lemon) are soft pastel
 * fills for timeline blocks; each has a matching saturated `*Ink` used for
 * icons, progress and accents on top of that fill.
 */

const playful = {
  text: '#1F1B3A',
  tint: '#6C5CE7',
  background: '#FBFAFF',
  foreground: '#1F1B3A',
  card: '#FFFFFF',
  cardForeground: '#1F1B3A',
  primary: '#6C5CE7',
  primaryForeground: '#FFFFFF',
  secondary: '#F0EDFF',
  secondaryForeground: '#4B3FB8',
  muted: '#F2F1F7',
  mutedForeground: '#5E5A78',
  accent: '#FF8A65',
  accentForeground: '#FFFFFF',
  destructive: '#E5484D',
  destructiveForeground: '#FFFFFF',
  border: '#ECEAF4',
  input: '#E4E1F0',
  // Activity fills
  sage: '#D9F5E6',
  apricot: '#FFE4D3',
  sky: '#D8ECFF',
  lilac: '#E9E2FF',
  rose: '#FFDDE6',
  lemon: '#FFF2C2',
  // Activity inks (icons / progress on fills)
  sageInk: '#1E9E62',
  apricotInk: '#E8692F',
  skyInk: '#2F7FD8',
  lilacInk: '#6C5CE7',
  roseInk: '#E0457B',
  lemonInk: '#C79100',
  // Hero surfaces (kept for API compatibility; now bright)
  forest: '#6C5CE7',
  onForest: '#FFFFFF',
  /** Progress track drawn on top of an activity fill. */
  onTone: 'rgba(255,255,255,0.75)',
};

const focused = {
  ...playful,
  background: '#F7F7FA',
  primary: '#5A4FCF',
  tint: '#5A4FCF',
  sage: '#E6F3EC',
  apricot: '#F9EBE2',
  sky: '#E5EFF9',
  lilac: '#EEEAFB',
  rose: '#F8E7EC',
  lemon: '#F8F1D9',
  forest: '#5A4FCF',
};

/** Dark mode: deep violet-navy surfaces, muted tone fills, brighter inks. */
const playfulDark: typeof playful = {
  ...playful,
  text: '#F2F0FF',
  tint: '#8B7CF6',
  background: '#13112A',
  foreground: '#F2F0FF',
  card: '#1D1A38',
  cardForeground: '#F2F0FF',
  primary: '#8B7CF6',
  primaryForeground: '#FFFFFF',
  secondary: '#2A2452',
  secondaryForeground: '#CFC7FF',
  muted: '#25213F',
  mutedForeground: '#A9A4C8',
  accent: '#FF8A65',
  border: '#2D2850',
  input: '#3A3462',
  sage: '#173B2D',
  apricot: '#3F2719',
  sky: '#16304C',
  lilac: '#2B2554',
  rose: '#3F1C2C',
  lemon: '#3A3214',
  sageInk: '#4FD89C',
  apricotInk: '#FF9C6B',
  skyInk: '#6DB7FF',
  lilacInk: '#AB9EFF',
  roseInk: '#FF7DAA',
  lemonInk: '#FFD45A',
  forest: '#8B7CF6',
  onTone: 'rgba(255,255,255,0.16)',
};

const focusedDark: typeof playful = {
  ...playfulDark,
  background: '#111118',
  card: '#1A1A24',
  primary: '#7D72E0',
  tint: '#7D72E0',
  forest: '#7D72E0',
  sage: '#1B2E25',
  apricot: '#33261E',
  sky: '#1B2938',
  lilac: '#252240',
  rose: '#33212A',
  lemon: '#302B1A',
};

const colors = {
  light: playful,
  focused,
  dark: playfulDark,
  focusedDark,
  radius: 22,
};

export default colors;
