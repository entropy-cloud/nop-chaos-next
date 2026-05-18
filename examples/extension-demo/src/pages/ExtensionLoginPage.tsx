import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, KeyRound, Layers3, ShieldCheck, User2 } from 'lucide-react';
import {
  getPluginBridge,
  usePluginBridge,
  usePluginI18n,
  usePluginNotifications,
} from '@nop-chaos/plugin-bridge';
import type { AuthSession } from '@nop-chaos/shared';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@nop-chaos/ui';

import harborMarkHref from '../harbor-mark.svg';
import { createDemoSession } from './demoSession';

interface AuthStoreWithActions {
  login: (payload: AuthSession) => void;
}

type BridgeAuthStore = {
  getState: () => Partial<AuthStoreWithActions>;
};

function getAuthStoreActions() {
  const bridge = getPluginBridge();

  if (!bridge) {
    return undefined;
  }

  const authStore = bridge.stores.authStore as BridgeAuthStore;
  return authStore.getState();
}

export function ExtensionLoginPage() {
  const bridge = usePluginBridge();
  const i18n = usePluginI18n();
  const notifications = usePluginNotifications();
  const [username, setUsername] = useState('harbor');
  const [submitting, setSubmitting] = useState(false);
  const featureCards = [
    {
      title: i18n.t('extensionDemo.login.overrideFeatures.identity.title'),
      description: i18n.t('extensionDemo.login.overrideFeatures.identity.description'),
      icon: ShieldCheck,
    },
    {
      title: i18n.t('extensionDemo.login.overrideFeatures.systemPage.title'),
      description: i18n.t('extensionDemo.login.overrideFeatures.systemPage.description'),
      icon: Layers3,
    },
    {
      title: i18n.t('extensionDemo.login.overrideFeatures.sharedRuntime.title'),
      description: i18n.t('extensionDemo.login.overrideFeatures.sharedRuntime.description'),
      icon: KeyRound,
    },
  ] as const;
  const supportedLanguages = i18n.options?.supportedLngs;
  const canChangeLanguage = typeof i18n.changeLanguage === 'function';
  const languageOptions = useMemo(() => {
    const normalized = Array.isArray(supportedLanguages) ? supportedLanguages : [i18n.language];
    return normalized.filter(
      (item): item is string => typeof item === 'string' && item !== 'cimode',
    );
  }, [i18n.language, supportedLanguages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const authActions = getAuthStoreActions();

    if (!bridge || typeof authActions?.login !== 'function') {
      notifications.error(i18n.t('extensionDemo.login.messages.bridgeNotReady'));
      return;
    }

    try {
      setSubmitting(true);

      authActions.login(createDemoSession(username));
      notifications.success(i18n.t('extensionDemo.login.messages.loginSuccess'));
      bridge.navigate('/', { replace: true });
    } catch (error) {
      notifications.error(
        error instanceof Error ? error.message : i18n.t('extensionDemo.login.messages.loginFailed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.18),transparent_28%)] px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden rounded-[2rem] border border-white/40 bg-white/70 p-10 shadow-2xl backdrop-blur-xl lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#0f766e,#155e75)] shadow-[0_22px_60px_rgba(15,118,110,0.28)]">
                <img alt="Harbor" className="h-11 w-11 object-contain" src={harborMarkHref} />
              </div>
              <div>
                <div className="eyebrow-text tracking-[0.22em] text-slate-600">
                  {i18n.t('extensionDemo.login.heroEyebrow')}
                </div>
                <div className="text-2xl font-semibold text-slate-950">
                  {i18n.t('extensionDemo.login.heroProduct')}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="eyebrow-text tracking-[0.24em] text-teal-700">
                {i18n.t('extensionDemo.login.heroBadge')}
              </div>
              <h1 className="max-w-2xl text-5xl font-semibold leading-tight text-slate-950">
                {i18n.t('extensionDemo.login.heroTitle')}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                {i18n.t('extensionDemo.login.heroDescription')}
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featureCards.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-sm font-semibold text-slate-950">{item.title}</span>
                    <Icon className="size-4" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <Card className="mx-auto w-full max-w-xl rounded-[2rem] border-white/50 bg-white/88 shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-4 pb-2">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#0f766e,#155e75)] shadow-[0_18px_45px_rgba(15,118,110,0.25)]">
                <img alt="Harbor" className="h-10 w-10 object-contain" src={harborMarkHref} />
              </div>
              <div>
                <div className="eyebrow-text tracking-[0.24em] text-teal-700">
                  {i18n.t('extensionDemo.login.signInEyebrow')}
                </div>
                <CardTitle className="text-3xl text-slate-950">
                  {i18n.t('extensionDemo.login.signInTitle')}
                </CardTitle>
              </div>
            </div>
            <CardDescription className="text-base leading-7 text-slate-600">
              {i18n.t('extensionDemo.login.signInDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-900">
                  {i18n.t('extensionDemo.login.username')}
                </span>
                <div className="relative">
                  <User2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="border-slate-200 bg-white/90 pl-10"
                    name="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </div>
              </label>
              <div className="rounded-[1.25rem] border border-dashed border-teal-200 bg-teal-50/70 px-4 py-3 text-sm text-slate-600">
                {i18n.t('extensionDemo.login.demoCredentials')}
              </div>
              {canChangeLanguage && languageOptions.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {languageOptions.map((language: string) => (
                    <Button
                      key={language}
                      type="button"
                      variant={i18n.language === language ? 'default' : 'outline'}
                      onClick={() => void i18n.changeLanguage?.(language)}
                    >
                      {language}
                    </Button>
                  ))}
                </div>
              ) : null}
              <Button className="w-full justify-center" disabled={submitting} type="submit">
                {submitting
                  ? i18n.t('extensionDemo.login.submitting')
                  : i18n.t('extensionDemo.login.submit')}
                <ArrowRight className="size-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
