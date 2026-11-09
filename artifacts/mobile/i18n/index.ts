import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './locales/en';
import de from './locales/de';
import ja from './locales/ja';
import ko from './locales/ko';
import { resolveLanguage, setFormatLanguage } from './locale';
import type { AppLanguage, LanguageSetting } from './locale';

export { LANGUAGES, formatClock, formatDate } from './locale';
export type { AppLanguage, LanguageSetting } from './locale';

function deviceLanguageCodes() {
  try {
    return Localization.getLocales().map((l) => l.languageCode);
  } catch {
    return [];
  }
}

const initial = resolveLanguage('system', deviceLanguageCodes());
setFormatLanguage(initial);

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    ja: { translation: ja },
    ko: { translation: ko },
  },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
  initAsync: false, // resources are bundled: init + changeLanguage run synchronously
});

/** Apply the user's choice ("system" follows the phone). Returns the language now in use. */
export function applyLanguage(setting: LanguageSetting): AppLanguage {
  const lang = resolveLanguage(setting, deviceLanguageCodes());
  setFormatLanguage(lang);
  if (i18n.language !== lang) void i18n.changeLanguage(lang);
  return lang;
}

/** The language the phone itself would pick (for "Same as my phone"). */
export function deviceLanguage(): AppLanguage {
  return resolveLanguage('system', deviceLanguageCodes());
}

/**
 * If `value` is still the untouched starter text for `key` (in any supported
 * language), return it in the current language; otherwise keep the user's text.
 */
export function relocalize(key: string, value: string): string {
  for (const lng of ['en', 'de', 'ja', 'ko']) {
    if (i18n.getFixedT(lng)(key) === value) return i18n.t(key) as string;
  }
  return value;
}

/** Translate outside React components (or in plain helpers). */
export function tr(key: string, opts?: Record<string, unknown>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (opts ? i18n.t(key, opts as any) : i18n.t(key)) as string;
}

export function useT() {
  const { t, i18n: inst } = useTranslation();
  return { t, lang: inst.language as AppLanguage };
}

/** 95 → "1h 35m" / "1 Std. 35 Min." / "1時間35分" / "1시간 35분". */
export function formatDuration(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return i18n.t('common.duration_hm', { h, m });
  if (h) return i18n.t('common.duration_h', { h });
  return i18n.t('common.duration_m', { m });
}

export default i18n;
