import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { render as renderAmis, setDefaultLocale } from 'amis'
import { bindActions, createAmisPageObject, registerAmisRuntimeAdapter, transformPageJson, type AmisRuntimeAdapter } from '@nop-chaos/amis-core'
import { createAmisEnv } from '../env'
import { AmisErrorView } from './AmisErrorView'
import { AmisLoadingView } from './AmisLoadingView'

const amisRoots = new WeakMap<HTMLDivElement, Root>()
const amisUnmountTimers = new WeakMap<HTMLDivElement, number>()

function clearScheduledUnmount(container: HTMLDivElement) {
  const timerId = amisUnmountTimers.get(container)

  if (timerId !== undefined) {
    window.clearTimeout(timerId)
    amisUnmountTimers.delete(container)
  }
}

export interface AmisSchemaPageProps {
  adapter: AmisRuntimeAdapter
  schema: unknown
  schemaPath?: string
  title: string
  initialData?: Record<string, unknown>
}

function cloneSchema<T>(schema: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(schema)
  }

  return JSON.parse(JSON.stringify(schema)) as T
}

export function AmisSchemaPage({ adapter, schema, schemaPath, title, initialData }: AmisSchemaPageProps) {
  const page = useMemo(() => createAmisPageObject(schemaPath), [schemaPath])
  const [schemaState, setSchemaState] = useState<{
    schema: unknown
    transformedSchema: unknown | null
    error: string | null
  }>({
    schema,
    transformedSchema: null,
    error: null
  })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const amisRootRef = useRef<Root | null>(null)
  const transformedSchema = schemaState.schema === schema ? schemaState.transformedSchema : null
  const error = schemaState.schema === schema ? schemaState.error : null

  useEffect(() => {
    registerAmisRuntimeAdapter(adapter)
    let active = true

    void transformPageJson(cloneSchema(schema))
      .then((nextSchema) => bindActions(nextSchema, page))
      .then((nextSchema) => {
        if (active) {
          setSchemaState({
            schema,
            transformedSchema: nextSchema,
            error: null
          })
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setSchemaState({
            schema,
            transformedSchema: null,
            error: reason instanceof Error ? reason.message : 'Failed to transform amis schema'
          })
        }
      })

    return () => {
      active = false
      page.destroy()
    }
  }, [adapter, page, schema])

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    clearScheduledUnmount(container)

    const root = amisRootRef.current ?? amisRoots.get(container) ?? createRoot(container)
    amisRootRef.current = root
    amisRoots.set(container, root)

    if (!transformedSchema || error) {
      root.render(null)
      return
    }

    registerAmisRuntimeAdapter(adapter)
    setDefaultLocale(adapter.getLocale())

    const renderProps = {
      data: initialData ?? {},
      locale: adapter.getLocale(),
      theme: 'cxd'
    }

    root.render(renderAmis(transformedSchema as unknown as never, renderProps as unknown as never, createAmisEnv(page) as unknown as never))
  }, [adapter, error, initialData, page, transformedSchema])

  useEffect(() => {
    const container = containerRef.current

    return () => {
      const root = amisRootRef.current ?? (container ? amisRoots.get(container) ?? null : null)

      amisRootRef.current = null

      if (!container || !root) {
        return
      }

      clearScheduledUnmount(container)

      const timerId = window.setTimeout(() => {
        root.unmount()
        amisRoots.delete(container)
        amisUnmountTimers.delete(container)
      }, 0)

      amisUnmountTimers.set(container, timerId)
    }
  }, [])

  return (
    <>
      <div ref={containerRef} className={error || !transformedSchema ? 'hidden nop-amis-page' : 'nop-amis-page'} />
      {error ? <AmisErrorView title={title} message={error} /> : null}
      {!error && !transformedSchema ? <AmisLoadingView title={title} /> : null}
    </>
  )
}
