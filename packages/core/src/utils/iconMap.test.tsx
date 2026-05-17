import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderIcon, resolveIcon, getIconByName } from './iconMap';

describe('renderIcon', () => {
  it('renders Lucide kebab-case icons used by DMS menus', () => {
    const markup = renderToStaticMarkup(renderIcon('building-2'));

    expect(markup).toContain('<svg');
  });

  it('renders FontAwesome icon names', () => {
    const markup = renderToStaticMarkup(renderIcon('fa-credit-card'));

    expect(markup).toContain('fa-credit-card');
  });

  it('renders FontAwesome icon with base class prefix', () => {
    const markup = renderToStaticMarkup(renderIcon('fas fa-user'));

    expect(markup).toContain('fas fa-user');
  });

  it('renders unknown icon as FontAwesome fallback', () => {
    const markup = renderToStaticMarkup(renderIcon('nonexistent-icon-xyz'));

    expect(markup).toContain('fa-');
  });

  it('renders default home icon when no name is provided', () => {
    const markup = renderToStaticMarkup(renderIcon());

    expect(markup).toContain('fa-');
  });

  it('passes title prop and sets aria-label', () => {
    const markup = renderToStaticMarkup(renderIcon('home', { title: 'My Home' }));

    expect(markup).toContain('title="My Home"');
    expect(markup).toContain('aria-label="My Home"');
    expect(markup).toContain('role="img"');
  });

  it('sets aria-hidden when no title is provided', () => {
    const markup = renderToStaticMarkup(renderIcon('home'));

    expect(markup).toContain('aria-hidden="true"');
  });

  it('passes className to the wrapper span', () => {
    const markup = renderToStaticMarkup(renderIcon('home', { className: 'my-custom-class' }));

    expect(markup).toContain('my-custom-class');
  });

  it('maps fa- icon to FA class and resolves known name', () => {
    const markup = renderToStaticMarkup(renderIcon('fa-cog'));

    expect(markup).toContain('fa-cog');
  });
});

describe('resolveIcon', () => {
  it('returns a component that renders the named icon', () => {
    const Icon = resolveIcon('list');
    const markup = renderToStaticMarkup(Icon({}));

    expect(markup).toContain('<svg');
  });

  it('returns a component that renders home when no name given', () => {
    const Icon = resolveIcon();
    const markup = renderToStaticMarkup(Icon({}));

    expect(markup).toContain('fa-');
  });
});

describe('getIconByName', () => {
  it('renders Lucide icon for known kebab-case name', () => {
    const Icon = getIconByName('globe');
    const markup = renderToStaticMarkup(Icon({}));

    expect(markup).toContain('<svg');
  });

  it('renders FontAwesome icon for fa- prefixed name', () => {
    const Icon = getIconByName('fa-gear');
    const markup = renderToStaticMarkup(Icon({}));

    expect(markup).toContain('fa-gear');
  });

  it('falls back to FontAwesome for unrecognized name', () => {
    const Icon = getIconByName('totally-unknown-abc123');
    const markup = renderToStaticMarkup(Icon({}));

    expect(markup).toContain('fa fa-');
  });

  it('renders fallback icon when name is empty', () => {
    const Icon = getIconByName('');
    const markup = renderToStaticMarkup(Icon({}));

    expect(markup).toContain('fa-');
  });

  it('uses custom fallback icon name', () => {
    const Icon = getIconByName(undefined, 'database');
    const markup = renderToStaticMarkup(Icon({}));

    expect(markup).toContain('fa-');
  });

  it('handles icon name with underscores', () => {
    const Icon = getIconByName('fa_some_name');
    const markup = renderToStaticMarkup(Icon({}));

    expect(markup).toContain('fa-');
  });

  it('handles icon name with spaces', () => {
    const Icon = getIconByName('fa solid home');
    const markup = renderToStaticMarkup(Icon({}));

    expect(markup).toContain('fa');
  });

  it('renders fa-solid base class correctly', () => {
    const Icon = getIconByName('fa-solid fa-house');
    const markup = renderToStaticMarkup(Icon({}));

    expect(markup).toContain('fa-solid fa-house');
  });
});
