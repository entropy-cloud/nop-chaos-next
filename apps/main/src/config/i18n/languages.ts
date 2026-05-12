export interface LanguageOption {
  code: string;
  labelKey: string;
}

export function normalizeLanguageCode(languageCode: string | null | undefined): string {
  const normalizedCode = languageCode?.replace('_', '-');

  if (!normalizedCode) {
    return 'zh-CN';
  }

  if (normalizedCode === 'en') {
    return 'en-US';
  }

  if (normalizedCode === 'zh') {
    return 'zh-CN';
  }

  return normalizedCode;
}

const defaultLanguageOptions: LanguageOption[] = [
  { code: 'zh-CN', labelKey: 'settings.languageOptions.zhCN' },
  { code: 'en-US', labelKey: 'settings.languageOptions.en' },
];

const languageRegistry: LanguageOption[] = [...defaultLanguageOptions];
let defaultLanguage = 'zh-CN';

export function registerLanguages(languages: LanguageOption[]): void {
  for (const language of languages) {
    const index = languageRegistry.findIndex((item) => item.code === language.code);

    if (index >= 0) {
      languageRegistry[index] = language;
      continue;
    }

    languageRegistry.push(language);
  }
}

export function replaceLanguages(languages: LanguageOption[]): void {
  languageRegistry.length = 0;
  languageRegistry.push(...languages);
}

export function getLanguageOptions(): LanguageOption[] {
  return [...languageRegistry];
}

export function getDefaultLanguage(): string {
  return defaultLanguage;
}

export function setDefaultLanguage(languageCode: string): void {
  defaultLanguage = languageCode;
}
