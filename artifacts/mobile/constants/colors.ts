/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const playful = {
  text: '#263832',
  tint: '#35685D',
  background: '#F6F4EB',
  foreground: '#263832',
  card: '#FFFEFA',
  cardForeground: '#263832',
  primary: '#35685D',
  primaryForeground: '#FFFEFA',
  secondary: '#E8EEE8',
  secondaryForeground: '#31544A',
  muted: '#ECE9E0',
  mutedForeground: '#65736C',
  accent: '#E99863',
  accentForeground: '#34291F',
  destructive: '#A94F45',
  destructiveForeground: '#FFFFFF',
  border: '#DDDCD0',
  input: '#DDDCD0',
  sage: '#DDE9DC',
  apricot: '#F7E3D1',
  sky: '#DFE9E8',
  lilac: '#EAE2EF',
  forest: '#213B34',
  onForest: '#FBF6E8',
};

const focused = {
  ...playful,
  background: '#F1F2ED',
  card: '#FAFBF7',
  primary: '#304E46',
  secondary: '#E4E9E3',
  muted: '#E7E9E2',
  accent: '#D6A46F',
  border: '#D8DDD4',
};

const dark = {
  ...playful,
  text: '#F3F2E8',
  tint: '#A4C7B7',
  background: '#15211D',
  foreground: '#F3F2E8',
  card: '#1E2D27',
  cardForeground: '#F3F2E8',
  primary: '#A4C7B7',
  primaryForeground: '#17231E',
  secondary: '#2A3932',
  secondaryForeground: '#E5EEE5',
  muted: '#26352E',
  mutedForeground: '#B6C2B8',
  accent: '#F0AE7A',
  accentForeground: '#2E241D',
  destructive: '#E28A7E',
  destructiveForeground: '#281D1B',
  border: '#39463F',
  input: '#39463F',
  sage: '#35483B',
  apricot: '#4C3A2D',
  sky: '#2C4140',
  lilac: '#403747',
  forest: '#101A16',
  onForest: '#F3F2E8',
};

const colors = {
  light: playful,
  focused,
  dark,
  radius: 22,
};

export default colors;
