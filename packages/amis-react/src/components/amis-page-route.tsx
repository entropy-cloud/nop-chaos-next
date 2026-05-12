import { useEffect, useState } from 'react';
import type { AmisRuntimeAdapter } from '@nop-chaos/amis-core';
import { registerAmisRuntimeAdapter } from '@nop-chaos/amis-core';
import { AmisErrorView } from './amis-error-view';
import { AmisLoadingView } from './amis-loading-view';
import { AmisSchemaPage } from './amis-schema-page';

export interface AmisPageRouteProps {
  adapter: AmisRuntimeAdapter;
  schemaPath: string;
  title: string;
}

export function AmisPageRoute({ adapter, schemaPath, title }: AmisPageRouteProps) {
  const [schema, setSchema] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    registerAmisRuntimeAdapter(adapter);
    let active = true;

    void adapter.pageProvider
      .getPage(schemaPath)
      .then((value) => {
        if (active) {
          setSchema(value);
          setError(null);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Failed to load amis schema');
          setSchema(null);
        }
      });

    return () => {
      active = false;
    };
  }, [adapter, schemaPath]);

  if (error) {
    return <AmisErrorView title={title} message={error} />;
  }

  if (!schema) {
    return <AmisLoadingView title={title} />;
  }

  return <AmisSchemaPage adapter={adapter} schema={schema} schemaPath={schemaPath} title={title} />;
}
