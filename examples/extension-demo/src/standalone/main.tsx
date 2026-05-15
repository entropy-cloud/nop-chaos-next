import React from 'react';
import ReactDOM from 'react-dom/client';
import { ExtensionBuiltinPage } from '../pages/ExtensionBuiltinPage';
import '@nop-chaos/theme-tokens/styles.css';
import '@nop-chaos/ui/base.css';
import '../harbor.css';
import '../shell.css';
import '../component-page.css';

const copy = {
  eyebrow: 'Standalone Preview',
  title: 'Extension Demo',
  description:
    'This standalone entry is for local UI development. Host integration should use the remote extension entry.',
} as const;

export function StandaloneApp() {
  return (
    <React.StrictMode>
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-6xl space-y-4">
          <div>
            <div className="eyebrow-text tracking-[0.22em]">{copy.eyebrow}</div>
            <h1 className="mt-3 text-3xl font-semibold">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{copy.description}</p>
          </div>
          <ExtensionBuiltinPage />
        </div>
      </main>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<StandaloneApp />);
