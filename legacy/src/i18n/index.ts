import i18n, { i18n as I18n } from 'i18next';
import { initReactI18next, useTranslation as useI18nTranslation } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { format as formatDate, isDate, Locale } from 'date-fns';
import { enUS, es, fr, de, it, pt, ru, zhCN, ja, ar } from 'date-fns/locale';
import * as React from 'react';

// Date locales mapping
const dateLocales: Record<string, Locale> = {
  en: enUS,
  es,
  fr,
  de,
  it,
  pt,
  ru,
  zh: zhCN,
  ja,
  ar,
};

// Default namespace
const defaultNS = 'common';

// Supported languages
const supportedLngs = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ar'] as const;
export type SupportedLanguage = typeof supportedLngs[number];

// Language names in their native form
const languageNames: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
  ar: 'العربية',
};

// RTL languages
const rtlLanguages = ['ar', 'he', 'fa', 'ur'];

// Initialize i18n
const initializeI18n = async () => {
  await i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: 'en',
      supportedLngs: [...supportedLngs],
      defaultNS,
      ns: [
        'common',
        'auth',
        'dashboard',
        'navigation',
        'forms',
        'errors',
        'validation',
        'seafarer',
        'vessel',
        'company',
        'crew',
        'payroll',
        'compliance',
        'settings',
      ],
      interpolation: {
        escapeValue: false, // React already escapes values
        format: (value, format, lng) => {
          if (isDate(value) && format) {
            const locale = lng ? dateLocales[lng as SupportedLanguage] : enUS;
            return formatDate(value, format, { locale });
          }
          return value;
        },
      },
      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'i18nextLng',
      },
      react: {
        useSuspense: true,
      },
    });
};

// Get current language
export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language?.split('-')[0] as SupportedLanguage) || 'en';
};

// Check if current language is RTL
export const isRTL = (): boolean => {
  return rtlLanguages.includes(getCurrentLanguage());
};

// Change language
export const changeLanguage = (lng: SupportedLanguage) => {
  return i18n.changeLanguage(lng);
};

// Get language name
export const getLanguageName = (lng: SupportedLanguage): string => {
  return languageNames[lng] || lng;
};

// Get all supported languages
export const getSupportedLanguages = (): { code: SupportedLanguage; name: string }[] => {
  return supportedLngs.map((code) => ({
    code,
    name: languageNames[code] || code,
  }));
};

// Translation component props
interface TranslationProps {
  i18nKey: string;
  values?: Record<string, unknown>;
  components?: Record<string, React.ReactNode>;
  count?: number;
  defaultMessage?: string;
  ns?: string | string[];
}

// Type for the translation function
type TFunction = (key: string, options?: Record<string, unknown>) => string;

// Translation component
const Translation: React.FC<TranslationProps> = ({
  i18nKey,
  values = {},
  components,
  count,
  defaultMessage,
  ns = defaultNS,
}) => {
  const { t } = useI18nTranslation(ns as string);
  const options = { count, default: defaultMessage, ...values };
  return t(i18nKey, options);
};

// Export the i18n instance and utilities
export { i18n, Translation, useI18nTranslation as useTranslation };

export type { TFunction };

// Initialize i18n when this module is loaded
initializeI18n();
