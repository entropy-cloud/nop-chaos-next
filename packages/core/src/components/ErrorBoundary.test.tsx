import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

function HappyChild() {
  return <div>happy</div>;
}

function BrokenChild(): React.ReactElement {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('renders children when no error occurs', () => {
    act(() => {
      root.render(
        <ErrorBoundary>
          <HappyChild />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toContain('happy');
  });

  it('catches rendering error and shows fallback', () => {
    const onError = vi.fn();
    act(() => {
      root.render(
        <ErrorBoundary onError={onError}>
          <BrokenChild />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toContain('boom');
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('uses custom fallback when provided', () => {
    act(() => {
      root.render(
        <ErrorBoundary fallback={<div>custom error ui</div>}>
          <BrokenChild />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toContain('custom error ui');
    expect(container.textContent).not.toContain('boom');
  });

  it('calls onError when an error is caught', () => {
    const onError = vi.fn();
    act(() => {
      root.render(
        <ErrorBoundary onError={onError}>
          <BrokenChild />
        </ErrorBoundary>,
      );
    });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
  });
});
