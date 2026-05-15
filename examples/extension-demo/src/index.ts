import type { ShellExtension } from '@nop-chaos/shared';
import { ExtensionBuiltinPage } from './pages/ExtensionBuiltinPage';
import { ExtensionLoginPage } from './pages/ExtensionLoginPage';
import { ExtensionNotFoundPage } from './pages/ExtensionNotFoundPage';

const harborMarkHref = new URL('./harbor-mark.svg', import.meta.url).href;
const harborThemeHref = new URL('./harbor.css', import.meta.url).href;
const harborShellHref = new URL('./shell.css', import.meta.url).href;
const harborPageHref = new URL('./component-page.css', import.meta.url).href;
const i18nBaseUrl = new URL('../locales', import.meta.url).href;

const extension: ShellExtension = {
  id: 'example-extension-demo',
  order: 50,
  app: {
    defaultLanguage: 'en-US',
  },
  branding: {
    name: 'Harbor Operations Suite',
    shortName: 'Harbor',
    logoUrl: harborMarkHref,
    markUrl: harborMarkHref,
    documentTitle: 'Harbor Operations Suite',
    faviconUrl: '/favicon.ico',
  },
  loginUi: {
    heroTitleKey: 'extensionDemo.login.heroTitle',
    heroDescriptionKey: 'extensionDemo.login.heroDescription',
    cardTitleKey: 'extensionDemo.login.cardTitle',
    cardDescriptionKey: 'extensionDemo.login.cardDescription',
    features: [
      {
        titleKey: 'extensionDemo.login.feature.coordination.title',
        descriptionKey: 'extensionDemo.login.feature.coordination.description',
      },
      {
        titleKey: 'extensionDemo.login.feature.themes.title',
        descriptionKey: 'extensionDemo.login.feature.themes.description',
      },
      {
        titleKey: 'extensionDemo.login.feature.bridge.title',
        descriptionKey: 'extensionDemo.login.feature.bridge.description',
      },
    ],
    showDemoHint: true,
  },
  shell: {
    defaultHomePath: '/examples/extension-harbor',
  },
  systemPages: {
    login: 'extension-harbor-login',
    notFound: 'extension-harbor-not-found',
    dashboard: 'extension-harbor-page',
  },
  supportedLanguages: [
    { code: 'en-US', labelKey: 'settings.languageOptions.en' },
    { code: 'fr-FR', labelKey: 'settings.languageOptions.frFR' },
  ],
  themes: [
    {
      id: 'harbor',
      labelKey: 'settings.themeOptions.harbor.label',
      descriptionKey: 'settings.themeOptions.harbor.description',
      cssHref: harborThemeHref,
    },
  ],
  styles: [
    {
      id: 'example-extension-demo-shell',
      href: harborShellHref,
      scope: 'shell',
    },
    {
      id: 'example-extension-demo-component-page',
      href: harborPageHref,
      scope: 'shell',
    },
  ],
  builtinPages: [
    {
      componentId: 'extension-harbor-page',
      component: ExtensionBuiltinPage,
    },
    {
      componentId: 'extension-harbor-login',
      component: ExtensionLoginPage,
    },
    {
      componentId: 'extension-harbor-not-found',
      component: ExtensionNotFoundPage,
    },
  ],
  menus: [
    {
      id: 'extension-demo-harbor',
      titleKey: 'extensionDemo.builtin.title',
      path: '/examples/extension-harbor',
      icon: 'palette',
      pageType: 'builtin',
      componentId: 'extension-harbor-page',
      sort: 980,
    },
  ],
  i18n: {
    baseUrl: i18nBaseUrl,
    languages: ['en-US', 'fr-FR'],
  },
};

export default extension;
