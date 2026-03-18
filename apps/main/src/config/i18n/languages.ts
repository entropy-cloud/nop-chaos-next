export interface LanguageOption {
  code: string
  labelKey: string
}

const defaultLanguageOptions: LanguageOption[] = [
  { code: 'zh-CN', labelKey: 'settings.languageOptions.zhCN' },
  { code: 'en', labelKey: 'settings.languageOptions.en' }
]

const languageRegistry: LanguageOption[] = [...defaultLanguageOptions]
let defaultLanguage = 'zh-CN'

export function registerLanguages(languages: LanguageOption[]): void {
  for (const language of languages) {
    const index = languageRegistry.findIndex((item) => item.code === language.code)

    if (index >= 0) {
      languageRegistry[index] = language
      continue
    }

    languageRegistry.push(language)
  }
}

export function getLanguageOptions(): LanguageOption[] {
  return [...languageRegistry]
}

export function getDefaultLanguage(): string {
  return defaultLanguage
}

export function setDefaultLanguage(languageCode: string): void {
  defaultLanguage = languageCode
}
