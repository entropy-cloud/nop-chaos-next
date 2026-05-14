import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, LockKeyhole, User2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@nop-chaos/ui';
import { AppBrand } from '../../../components/layout/AppBrand';
import { isMockEnabled } from '../../../config/env';
import { getLanguageOptions } from '../../../config/i18n/languages';
import { useAuth } from '../../../hooks/useAuth';
import { useMenuConfigQuery } from '../../../hooks/useMenuConfig';
import { useShellConfig } from '../../../hooks/useShellConfig';
import { loginWithPassword } from '../../../services/authApi';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { loginUi } = useShellConfig();
  const languageOptions = getLanguageOptions();
  const mockMode = isMockEnabled();
  const [username, setUsername] = useState(mockMode ? 'nop' : '');
  const [password, setPassword] = useState(mockMode ? '123' : '');
  const [submitting, setSubmitting] = useState(false);
  const menuQuery = useMenuConfigQuery(false);
  const loginTitle = loginUi.cardTitleKey ? t(loginUi.cardTitleKey) : t('auth.login');
  const heroTitle = loginUi.heroTitleKey ? t(loginUi.heroTitleKey) : t('login.heroTitle');
  const heroDescription = loginUi.heroDescriptionKey
    ? t(loginUi.heroDescriptionKey)
    : t('login.heroDescription');
  const cardDescription = loginUi.cardDescriptionKey
    ? t(loginUi.cardDescriptionKey)
    : t('login.cardDescription');
  const showDemoHint = loginUi.showDemoHint ?? mockMode;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      const payload = await loginWithPassword(username, password);
      login(payload);
      const menuResponse = await menuQuery.refetch();
      const homePath = menuResponse.data?.home ?? '/';
      toast.success(t('auth.loginSuccess'));
      navigate(homePath, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('auth.loginFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="theme-blob blob-a" />
      <div className="theme-blob blob-b" />
      <div className="theme-blob blob-c" />
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="hidden flex-col justify-between rounded-xl border border-[hsl(var(--border))] bg-[var(--card-surface)] p-10 shadow-xl backdrop-blur-xl lg:flex">
          <div className="space-y-8">
            <AppBrand />
            <div className="space-y-4">
              <div className="eyebrow-text tracking-[0.26em]">
                {t('common.adaptiveFrontendShell')}
              </div>
              <h1 className="max-w-xl text-5xl font-semibold leading-tight text-foreground">
                {heroTitle}
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">{heroDescription}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {loginUi.features.map((feature) => (
              <div
                key={feature.titleKey}
                className="rounded-xl border border-[hsl(var(--border))] bg-white/40 p-5 backdrop-blur-xl dark:bg-slate-900/40"
              >
                <div className="text-sm font-semibold text-foreground">{t(feature.titleKey)}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {t(feature.descriptionKey)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <Card className="theme-card mx-auto w-full max-w-xl rounded-xl border-none shadow-xl">
          <CardHeader className="space-y-4 pb-2">
            <AppBrand />
            <div>
              <CardTitle className="text-3xl">{loginTitle}</CardTitle>
              <CardDescription>{cardDescription}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">{t('auth.username')}</span>
                <div className="relative">
                  <User2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="data-[size=default]:pr-3 data-[size=default]:pl-10"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </div>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">{t('auth.password')}</span>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="data-[size=default]:pr-3 data-[size=default]:pl-10"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">{t('auth.language')}</span>
                <Select
                  value={i18n.language}
                  onValueChange={(value) => void i18n.changeLanguage(value ?? undefined)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((item) => (
                      <SelectItem key={item.code} value={item.code}>
                        {t(item.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <Button className="w-full justify-center" disabled={submitting} type="submit">
                {submitting ? t('common.loading') : t('auth.login')}
                <ArrowRight className="size-4" />
              </Button>
              {showDemoHint ? (
                <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[color-mix(in_hsl,hsl(var(--primary))_6%,transparent)] px-4 py-3 text-sm text-muted-foreground">
                  {t('login.demoHint')}
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
