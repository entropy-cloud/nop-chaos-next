import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';
import { getDefaultLanguage, getLanguageOptions, normalizeLanguageCode } from './languages';

let initializationPromise: Promise<typeof i18n> | undefined;

export function initializeI18n(): Promise<typeof i18n> {
  if (!initializationPromise) {
    initializationPromise = i18n
      .use(HttpBackend)
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        fallbackLng: getDefaultLanguage(),
        supportedLngs: getLanguageOptions().map((item) => item.code),
        interpolation: {
          escapeValue: false,
        },
        backend: {
          loadPath: '/locales/{{lng}}/translation.json',
        },
        detection: {
          order: ['localStorage', 'navigator'],
          lookupLocalStorage: 'nop-language:v1',
          convertDetectedLanguage: (language) => normalizeLanguageCode(language),
        },
      })
      .then(() => i18n);
  }

  return initializationPromise;
}

export default i18n;
