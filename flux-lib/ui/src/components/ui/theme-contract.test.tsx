import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AlertDialog } from './alert-dialog';
import { AlertDialogOverlay } from './alert-dialog';
import { Drawer } from './drawer';
import { ChartContainer } from './chart';
import { DrawerOverlay } from './drawer';
import { Slider } from './slider';
import { getTableRowClassName } from './table-row-class-name';
import { TableRow } from './table';

describe('ui theme contracts', () => {
  it('keeps subtle table rows on the shared surface-hover token', () => {
    expect(getTableRowClassName('subtle')).toBe('hover:bg-surface-hover');

    const markup = renderToStaticMarkup(
      React.createElement('table', null, React.createElement('tbody', null, React.createElement(TableRow, { variant: 'subtle' }))),
    );

    expect(markup).toContain('hover:bg-surface-hover');
  });

  it('uses semantic overlay and surface classes for interactive primitives', () => {
    const drawerOverlayMarkup = renderToStaticMarkup(
      React.createElement(Drawer, { open: true }, React.createElement(DrawerOverlay)),
    );
    const alertDialogOverlayMarkup = renderToStaticMarkup(
      React.createElement(AlertDialog, { open: true }, React.createElement(AlertDialogOverlay)),
    );
    const sliderMarkup = renderToStaticMarkup(
      React.createElement(Slider, {
        defaultValue: [25],
        max: 100,
      }),
    );

    expect(drawerOverlayMarkup).toContain('bg-surface-overlay');
    expect(drawerOverlayMarkup).not.toContain('bg-black/10');
    expect(alertDialogOverlayMarkup).toContain('bg-surface-overlay');
    expect(alertDialogOverlayMarkup).not.toContain('bg-black/10');
    expect(sliderMarkup).toContain('bg-background');
    expect(sliderMarkup).not.toContain('bg-white');
  });

  it('styles chart defaults without hard-coded light-theme color literals', () => {
    const markup = renderToStaticMarkup(
      <ChartContainer config={{}}>
        <div />
      </ChartContainer>,
    );

    expect(markup).toContain('[&amp;_.recharts-cartesian-grid_[stroke]]:stroke-border/50');
    expect(markup).toContain('[&amp;_.recharts-dot[stroke]]:stroke-background');
    expect(markup).toContain('[&amp;_.recharts-reference-line_[stroke]]:stroke-border');
    expect(markup).not.toContain('#fff');
    expect(markup).not.toContain('#ccc');
  });
});
