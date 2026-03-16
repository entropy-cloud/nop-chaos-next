import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import HttpBackend from 'i18next-http-backend'
import { initReactI18next } from 'react-i18next'
import { defaultLanguage, languageOptions } from './languages'

void i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: defaultLanguage,
    supportedLngs: languageOptions.map((item) => item.code),
    interpolation: {
      escapeValue: false
    },
    backend: {
      loadPath: '/locales/{{lng}}/translation.json'
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'nop-language:v1'
    }
  })

export default i18n
