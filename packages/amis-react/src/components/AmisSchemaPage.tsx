import { useEffect, useMemo, useState } from 'react';
import { clearStoresCache, render as renderAmis, setDefaultLocale } from 'amis';
import type { Schema as AmisSchema, RenderOptions } from 'amis-core';
import {
  bindActions,
  createAmisPageObject,
  registerAmisRuntimeAdapter,
  transformPageJson,
  type AmisRuntimeAdapter,
} from '@nop-chaos/amis-core';
import { createAmisEnv } from '../env';
import { AmisErrorView } from './AmisErrorView';
import { AmisLoadingView } from './AmisLoadingView';

function normalizeAmisLocale(locale: string) {
  if (locale === 'en') {
    return 'en-US';
  }

  if (locale === 'zh') {
    return 'zh-CN';
  }

  return locale;
}

export interface AmisSchemaPageProps {
  adapter: AmisRuntimeAdapter;
  schema: unknown;
  schemaPath?: string;
  title: string;
  initialData?: Record<string, unknown>;
}

function cloneSchema<T>(schema: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(schema);
  }

  return JSON.parse(JSON.stringify(schema)) as T;
}

export function AmisSchemaPage({
  adapter,
  schema,
  schemaPath,
  title,
  initialData,
}: AmisSchemaPageProps) {
  const page = useMemo(() => createAmisPageObject(schemaPath), [schemaPath]);
  const env = useMemo(() => createAmisEnv(page), [page]);
  const [schemaState, setSchemaState] = useState<{
    schema: unknown;
    transformedSchema: unknown | null;
    error: string | null;
  }>({
    schema,
    transformedSchema: null,
    error: null,
  });
  const transformedSchema = schemaState.schema === schema ? schemaState.transformedSchema : null;
  const error = schemaState.schema === schema ? schemaState.error : null;

  useEffect(() => {
    registerAmisRuntimeAdapter(adapter);
    let active = true;

    void transformPageJson(cloneSchema(schema))
      .then((nextSchema) => bindActions(nextSchema, page))
      .then((nextSchema) => {
        if (active) {
          setSchemaState({
            schema,
            transformedSchema: nextSchema,
            error: null,
          });
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setSchemaState({
            schema,
            transformedSchema: null,
            error: reason instanceof Error ? reason.message : 'Failed to transform amis schema',
          });
        }
      });

    return () => {
      active = false;
      clearStoresCache(page.id);
      page.destroy();
    };
  }, [adapter, page, schema]);

  useEffect(() => {
    if (!transformedSchema || error) {
      return;
    }

    registerAmisRuntimeAdapter(adapter);
    setDefaultLocale(normalizeAmisLocale(adapter.getLocale()));
  }, [adapter, error, transformedSchema]);

  if (error) {
    return <AmisErrorView title={title} message={error} />;
  }

  if (!transformedSchema) {
    return <AmisLoadingView title={title} />;
  }

  const locale = normalizeAmisLocale(adapter.getLocale());
  const renderProps = {
    data: initialData ?? {},
    locale,
    theme: 'cxd',
  };

  return (
    <div className="amis">
      {renderAmis(
        transformedSchema as AmisSchema, // safety: schema transformed by our adapter layer
        renderProps as Parameters<typeof renderAmis>[1], // safety: props shape matches amis RootRenderProps
        env as RenderOptions, // safety: env constructed with required amis fields
      )}
    </div>
  );
}
