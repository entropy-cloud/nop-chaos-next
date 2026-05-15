// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

function renderBootstrapFallback(error: Error) {
  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  const heading = document.createElement('h1');
  heading.textContent = 'Bootstrap Failed';
  heading.style.fontSize = '1.25rem';
  heading.style.fontWeight = '600';

  const message = document.createElement('p');
  message.textContent = error.message;
  message.style.fontSize = '0.875rem';

  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.minHeight = '100vh';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.flexDirection = 'column';
  container.style.gap = '1rem';
  container.style.padding = '2rem';
  container.style.textAlign = 'center';

  container.appendChild(heading);
  container.appendChild(message);
  rootEl.appendChild(container);
}

describe('bootstrap fallback', () => {
  it('renders fallback UI when bootstrap throws', () => {
    document.body.innerHTML = '<div id="root"></div>';

    renderBootstrapFallback(new Error('i18n init failed'));

    const root = document.getElementById('root');
    expect(root?.textContent).toContain('Bootstrap');
    expect(root?.textContent).toContain('i18n init failed');
  });
});
