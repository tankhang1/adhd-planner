/**
 * Dayflow Pro themes: an accent colour for the UI plus a matching app icon.
 * Icon names must match the `expo-alternate-app-icons` entries in app.json
 * (rendered by screenshots/logo/icons.py). `null` icon = the default app icon.
 */
export type ThemeId = 'violet' | 'ocean' | 'forest' | 'sunset' | 'berry' | 'midnight';

export interface AccentTheme {
  id: ThemeId;
  icon: 'Ocean' | 'Forest' | 'Sunset' | 'Berry' | 'Midnight' | null;
  primary: string;
  secondary: string;
  secondaryForeground: string;
}

export const THEMES: AccentTheme[] = [
  { id: 'violet', icon: null, primary: '#6C5CE7', secondary: '#F0EDFF', secondaryForeground: '#4B3FB8' },
  { id: 'ocean', icon: 'Ocean', primary: '#2F7FD8', secondary: '#E3F0FF', secondaryForeground: '#1F5FA8' },
  { id: 'forest', icon: 'Forest', primary: '#1E9E62', secondary: '#DFF5EA', secondaryForeground: '#14744A' },
  { id: 'sunset', icon: 'Sunset', primary: '#E8692F', secondary: '#FFEADF', secondaryForeground: '#B44E1F' },
  { id: 'berry', icon: 'Berry', primary: '#E0457B', secondary: '#FFE3EC', secondaryForeground: '#AD2F5C' },
  { id: 'midnight', icon: 'Midnight', primary: '#3B3566', secondary: '#E9E7F3', secondaryForeground: '#2A2550' },
];

export const themeById = (id: string | undefined) => THEMES.find((t) => t.id === id) ?? THEMES[0];
