import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { setI18nGetter } from '@nop-chaos/ui';
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
          convertDetectedLanguage: (language: string) => normalizeLanguageCode(language),
        },
      })
      .then(() => {
        setI18nGetter((key) => i18n.t(key));
        return i18n;
      })
      .catch((error: unknown) => {
        initializationPromise = undefined;
        throw new Error(
          `Failed to initialize i18n resources: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      });
  }

  return initializationPromise;
}

export default i18n;
