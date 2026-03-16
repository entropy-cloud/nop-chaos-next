export interface LanguageOption {
  code: string
  labelKey: string
}

export const languageOptions: LanguageOption[] = [
  { code: 'zh-CN', labelKey: 'settings.languageOptions.zhCN' },
  { code: 'en', labelKey: 'settings.languageOptions.en' }
]

export const defaultLanguage = 'zh-CN'
