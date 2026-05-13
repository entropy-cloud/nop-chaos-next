import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactJsxRuntime from 'react/jsx-runtime';

let didInitFluxRuntime = false;

function installFluxRequireShim() {
  if (typeof globalThis.require === 'function') {
    return;
  }

  globalThis.require = ((id: string) => {
    if (id === 'react') {
      return React;
    }

    if (id === 'react-dom') {
      return ReactDOM;
    }

    if (id === 'react/jsx-runtime') {
      return ReactJsxRuntime;
    }

    throw new Error(`Unsupported Flux runtime require: ${id}`);
  }) as typeof globalThis.require;
}

export async function ensureFluxRuntime() {
  if (didInitFluxRuntime) {
    return;
  }

  installFluxRequireShim();
  await import('@nop-chaos/flux/style.css');
  didInitFluxRuntime = true;
}
