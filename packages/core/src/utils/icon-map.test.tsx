import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderIcon } from './icon-map';

describe('renderIcon', () => {
  it('renders Lucide kebab-case icons used by DMS menus', () => {
    const markup = renderToStaticMarkup(renderIcon('building-2'));

    expect(markup).toContain('<svg');
  });

  it('renders FontAwesome icon names', () => {
    const markup = renderToStaticMarkup(renderIcon('fa-credit-card'));

    expect(markup).toContain('fa-credit-card');
  });
});
