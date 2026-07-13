// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('lucide-react', () => ({
  icons: { Home: 'home-icon', Settings: 'settings-icon', Database: 'database-icon' },
}));

vi.mock('@nop-chaos/core', () => ({
  LowCodeIcon: ({ name }: { name?: string }) => (name ? <span data-icon={name} /> : null),
}));

vi.mock('@nop-chaos/ui', () => ({
  cn: (...parts: unknown[]) => parts.filter(Boolean).join(' '),
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props} />
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({
    render,
    children,
  }: {
    render: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="trigger">
      {render}
      {children}
    </div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { IconPicker } from './IconPicker';

describe('IconPicker', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('renders placeholder when there is no value', () => {
    act(() => {
      root.render(<IconPicker />);
    });

    expect(container.textContent).toContain('选择图标');
  });

  it('renders the current value inside the trigger', () => {
    act(() => {
      root.render(<IconPicker value="home" />);
    });

    expect(container.textContent).toContain('home');
    expect(container.querySelector('[data-icon="home"]')).toBeTruthy();
  });

  it('shows the lucide candidate icons in the grid', () => {
    act(() => {
      root.render(<IconPicker value="home" />);
    });

    const gridButtons = container.querySelectorAll('button[title]');
    expect(gridButtons.length).toBe(3);
  });

  it('calls onValueChange when an icon is selected', () => {
    const onValueChange = vi.fn();

    act(() => {
      root.render(<IconPicker onValueChange={onValueChange} />);
    });

    const gridButtons = container.querySelectorAll('button[title]');
    expect(gridButtons.length).toBeGreaterThan(0);

    act(() => {
      gridButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('database');
  });

  it('filters candidates by the search keyword', () => {
    act(() => {
      root.render(<IconPicker />);
    });

    expect(container.querySelectorAll('button[title]').length).toBe(3);

    const searchInput = container.querySelector('input') as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set as (v: string) => void;

    act(() => {
      valueSetter.call(searchInput, 'home');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const matched = container.querySelectorAll('button[title]');
    expect(matched.length).toBe(1);
    expect(matched[0].getAttribute('title')).toBe('home');
  });
});
