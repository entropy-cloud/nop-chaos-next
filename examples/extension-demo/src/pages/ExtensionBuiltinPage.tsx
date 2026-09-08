import { Blocks, Compass, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';

export function ExtensionBuiltinPage() {
  const { t } = useTranslation();
  const highlights = [
    {
      title: t('extensionDemo.builtinPage.highlights.tokens.title'),
      description: t('extensionDemo.builtinPage.highlights.tokens.description'),
      icon: <Palette className="size-4" />,
    },
    {
      title: t('extensionDemo.builtinPage.highlights.preset.title'),
      description: t('extensionDemo.builtinPage.highlights.preset.description'),
      icon: <Blocks className="size-4" />,
    },
    {
      title: t('extensionDemo.builtinPage.highlights.registration.title'),
      description: t('extensionDemo.builtinPage.highlights.registration.description'),
      icon: <Compass className="size-4" />,
    },
  ] as const;
  const howItWorksItems = [
    t('extensionDemo.builtinPage.howItWorks.items.registration'),
    t('extensionDemo.builtinPage.howItWorks.items.routing'),
    t('extensionDemo.builtinPage.howItWorks.items.tailwind'),
  ];
  const sharedStackItems = [
    t('extensionDemo.builtinPage.sharedStack.items.themeTokens'),
    t('extensionDemo.builtinPage.sharedStack.items.preset'),
    t('extensionDemo.builtinPage.sharedStack.items.baseStyles'),
    t('extensionDemo.builtinPage.sharedStack.items.hostRegistration'),
  ];

  return (
    <div className="space-y-6">
      <Card className="theme-card overflow-hidden border-none extension-hero">
        <CardHeader className="space-y-3">
          <div className="eyebrow-text tracking-[0.22em]">
            {t('extensionDemo.builtinPage.eyebrow')}
          </div>
          <CardTitle className="text-3xl">{t('extensionDemo.builtinPage.title')}</CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t('extensionDemo.builtinPage.description')}
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title} className="extension-kpi-panel">
              <div className="flex items-center justify-between gap-3 text-muted-foreground">
                <span>{item.title}</span>
                {item.icon}
              </div>
              <p className="mt-4 text-sm leading-6 text-foreground/85">{item.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="theme-card border-none">
            <CardHeader>
              <CardTitle>{t('extensionDemo.builtinPage.howItWorks.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              {howItWorksItems.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[hsl(var(--border))] bg-background/70 p-4"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="theme-card border-none">
          <CardHeader>
            <CardTitle>{t('extensionDemo.builtinPage.sharedStack.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {sharedStackItems.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-dashed border-[hsl(var(--border))] px-4 py-3"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
