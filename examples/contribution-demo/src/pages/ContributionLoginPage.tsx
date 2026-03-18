import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, KeyRound, Layers3, ShieldCheck, User2 } from 'lucide-react'
import { getPluginBridge, usePluginBridge, usePluginI18n, usePluginNotifications } from '@nop-chaos/plugin-bridge'
import type { AuthSession, User } from '@nop-chaos/shared'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@nop-chaos/ui'

import harborMarkHref from '../harbor-mark.svg'

interface AuthStoreWithActions {
  login: (payload: AuthSession) => void
}

const featureCards = [
  {
    title: 'Harbor identity',
    description: 'This login page is provided by the contribution itself, not by host-side loginUi field overrides.',
    icon: ShieldCheck
  },
  {
    title: 'System page override',
    description: 'The host still owns the `/auth/login` route, while contribution maps that route to a custom builtin page.',
    icon: Layers3
  },
  {
    title: 'Shared runtime',
    description: 'Authentication state, navigation, notifications, and language still come from the same host runtime bridge.',
    icon: KeyRound
  }
] as const

function getAuthStoreActions() {
  const bridge = getPluginBridge()

  if (!bridge) {
    return undefined
  }

  return bridge.stores.authStore.getState() as unknown as Partial<AuthStoreWithActions>
}

function createDemoSession(username: string): AuthSession {
  const trimmedUsername = username.trim() || 'harbor'
  const user: User = {
    id: trimmedUsername,
    username: trimmedUsername,
    nickname: 'Harbor Captain',
    roles: ['admin']
  }

  return {
    user,
    token: 'contribution-demo-token',
    tokens: {
      accessToken: 'contribution-demo-token'
    }
  }
}

export function ContributionLoginPage() {
  const bridge = usePluginBridge()
  const i18n = usePluginI18n()
  const notifications = usePluginNotifications()
  const [username, setUsername] = useState('harbor')
  const [password, setPassword] = useState('123456')
  const [submitting, setSubmitting] = useState(false)
  const languageOptions = useMemo(() => {
    const supported = i18n.options.supportedLngs
    const normalized = Array.isArray(supported) ? supported : [i18n.language]
    return normalized.filter((item): item is string => typeof item === 'string' && item !== 'cimode')
  }, [i18n.language, i18n.options.supportedLngs])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const authActions = getAuthStoreActions()

    if (!bridge || typeof authActions?.login !== 'function') {
      notifications.error('Host bridge is not ready for contribution login.')
      return
    }

    try {
      setSubmitting(true)

      if (password !== '123456') {
        throw new Error('Use the Harbor demo password: 123456')
      }

      authActions.login(createDemoSession(username))
      notifications.success('Welcome aboard Harbor.')
      bridge.navigate('/', { replace: true })
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : 'Unable to sign in to Harbor.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.18),transparent_28%)] px-4 py-10'>
      <div className='grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]'>
        <div className='hidden rounded-[2rem] border border-white/40 bg-white/70 p-10 shadow-2xl backdrop-blur-xl lg:flex lg:flex-col lg:justify-between'>
          <div className='space-y-8'>
            <div className='flex items-center gap-4'>
              <div className='flex h-16 w-16 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#0f766e,#155e75)] shadow-[0_22px_60px_rgba(15,118,110,0.28)]'>
                <img alt='Harbor' className='h-11 w-11 object-contain' src={harborMarkHref} />
              </div>
              <div>
                <div className='eyebrow-text tracking-[0.22em] text-slate-600'>Contribution Login</div>
                <div className='text-2xl font-semibold text-slate-950'>Harbor Operations Suite</div>
              </div>
            </div>
            <div className='space-y-4'>
              <div className='eyebrow-text tracking-[0.24em] text-teal-700'>System Page Override</div>
              <h1 className='max-w-2xl text-5xl font-semibold leading-tight text-slate-950'>A full login page delivered by the contribution package.</h1>
              <p className='max-w-2xl text-lg leading-8 text-slate-600'>
                The host shell still owns routing, auth state, and navigation. This page proves that a contribution can replace
                the entire login experience while reusing the same runtime bridge.
              </p>
            </div>
          </div>
          <div className='grid gap-4 md:grid-cols-3'>
            {featureCards.map((item) => {
              const Icon = item.icon

              return (
                <div key={item.title} className='rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-5 shadow-sm'>
                  <div className='flex items-center justify-between text-slate-500'>
                    <span className='text-sm font-semibold text-slate-950'>{item.title}</span>
                    <Icon className='size-4' />
                  </div>
                  <p className='mt-3 text-sm leading-6 text-slate-600'>{item.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        <Card className='mx-auto w-full max-w-xl rounded-[2rem] border-white/50 bg-white/88 shadow-2xl backdrop-blur-xl'>
          <CardHeader className='space-y-4 pb-2'>
            <div className='flex items-center gap-4'>
              <div className='flex h-14 w-14 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#0f766e,#155e75)] shadow-[0_18px_45px_rgba(15,118,110,0.25)]'>
                <img alt='Harbor' className='h-10 w-10 object-contain' src={harborMarkHref} />
              </div>
              <div>
                <div className='eyebrow-text tracking-[0.24em] text-teal-700'>Harbor Sign-in</div>
                <CardTitle className='text-3xl text-slate-950'>Board the Harbor workspace</CardTitle>
              </div>
            </div>
            <CardDescription className='text-base leading-7 text-slate-600'>
              This is a full page override registered through `builtinPages + systemPages.login`.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className='space-y-5' onSubmit={handleSubmit}>
              <label className='block space-y-2'>
                <span className='text-sm font-medium text-slate-900'>Username</span>
                <div className='relative'>
                  <User2 className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400' />
                  <Input className='border-slate-200 bg-white/90 pl-10' value={username} onChange={(event) => setUsername(event.target.value)} />
                </div>
              </label>
              <label className='block space-y-2'>
                <span className='text-sm font-medium text-slate-900'>Password</span>
                <div className='relative'>
                  <KeyRound className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400' />
                  <Input className='border-slate-200 bg-white/90 pl-10' type='password' value={password} onChange={(event) => setPassword(event.target.value)} />
                </div>
              </label>
              <div className='rounded-[1.25rem] border border-dashed border-teal-200 bg-teal-50/70 px-4 py-3 text-sm text-slate-600'>
                Demo credentials for the contribution override: any username + password `123456`
              </div>
              {languageOptions.length > 1 ? (
                <div className='flex flex-wrap gap-2'>
                  {languageOptions.map((language: string) => (
                    <Button key={language} type='button' variant={i18n.language === language ? 'default' : 'outline'} onClick={() => void i18n.changeLanguage(language)}>
                      {language}
                    </Button>
                  ))}
                </div>
              ) : null}
              <Button className='w-full justify-center' disabled={submitting} type='submit'>
                {submitting ? 'Signing in...' : 'Enter Harbor'}
                <ArrowRight className='size-4' />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
