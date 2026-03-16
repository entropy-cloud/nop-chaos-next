import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui'
import { loadRemoteComponent } from '../utils/systemjs'

interface PluginSlotProps {
  beforeLoad?: () => Promise<void> | void
  url: string
  title: string
}

const loadingView = (
  <Card className="theme-card">
    <CardHeader>
      <CardTitle>Loading plugin</CardTitle>
    </CardHeader>
    <CardContent>Preparing remote module...</CardContent>
  </Card>
)

export function PluginSlot({ beforeLoad, url, title }: PluginSlotProps) {
  const [Component, setComponent] = useState<ComponentType | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const requestUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`

    void Promise.resolve(beforeLoad?.())
      .then(() => loadRemoteComponent(requestUrl))
      .then((resolved) => {
        if (active) {
          setComponent(() => resolved)
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Failed to load plugin')
        }
      })

    return () => {
      active = false
    }
  }, [beforeLoad, url])

  if (error) {
    return (
      <Card className="theme-card border-[hsl(var(--danger))]/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[hsl(var(--danger))]">
            <AlertCircle className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>{error}</CardContent>
      </Card>
    )
  }

  if (!Component) {
    return loadingView
  }

  return <Component />
}
