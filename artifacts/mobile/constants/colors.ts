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

const colors = {
  light: playful,
  focused,
  radius: 22,
};

export default colors;
