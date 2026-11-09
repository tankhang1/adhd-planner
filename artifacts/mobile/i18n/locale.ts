// Locale-aware time & date formatting shared by the app, widgets and notifications.
// Kept free of React/RN imports so it can be unit tested and used anywhere.

export type AppLanguage = 'en' | 'de' | 'ja' | 'ko';
export type LanguageSetting = AppLanguage | 'system';

export const LANGUAGES: Array<{ code: AppLanguage; native: string; english: string }> = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'de', native: 'Deutsch', english: 'German' },
  { code: 'ja', native: '日本語', english: 'Japanese' },
  { code: 'ko', native: '한국어', english: 'Korean' },
];

/** BCP-47 tag used for Intl formatting. */
const INTL_TAG: Record<AppLanguage, string> = { en: 'en-US', de: 'de-DE', ja: 'ja-JP', ko: 'ko-KR' };

let current: AppLanguage = 'en';

export function setFormatLanguage(lang: AppLanguage) {
  current = lang;
  timeFormatter = null;
}
export function getFormatLanguage() {
  return current;
}
export function intlTag(lang: AppLanguage = current) {
  return INTL_TAG[lang];
}

/** Pick the first supported language from the device's preferred list. */
export function resolveLanguage(setting: LanguageSetting, deviceLanguageCodes: Array<string | null | undefined>): AppLanguage {
  if (setting !== 'system') return setting;
  for (const code of deviceLanguageCodes) {
    const base = (code ?? '').toLowerCase().split(/[-_]/)[0];
    if (base === 'en' || base === 'de' || base === 'ja' || base === 'ko') return base;
  }
  return 'en';
}

let timeFormatter: Intl.DateTimeFormat | null = null;

/**
 * Minutes since midnight → "9:05 AM" (en), "09:05" (de), "9:05" (ja), "오전 9:05" (ko).
 * Uses the platform's Intl so each language gets its natural clock style.
 */
export function formatClock(total: number, lang: AppLanguage = current) {
  if (!Number.isFinite(total)) return '--:--';
  const rounded = Math.round(total);
  const h = Math.floor(rounded / 60) % 24;
  const m = ((rounded % 60) + 60) % 60;
  try {
    const fmt =
      lang === current && timeFormatter
        ? timeFormatter
        : new Intl.DateTimeFormat(INTL_TAG[lang], { hour: 'numeric', minute: '2-digit' });
    if (lang === current) timeFormatter = fmt;
    return fmt.format(new Date(2000, 0, 1, (h + 24) % 24, m));
  } catch {
    // Very old JS engines without Intl: 24h fallback is unambiguous everywhere.
    return `${String((h + 24) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}

/** Date in the current language, e.g. "Monday, November 9" / "Montag, 9. November" / "11月9日月曜日". */
export function formatDate(d: Date, options: Intl.DateTimeFormatOptions, lang: AppLanguage = current) {
  try {
    return d.toLocaleDateString(INTL_TAG[lang], options);
  } catch {
    return d.toDateString();
  }
}
