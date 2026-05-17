import { describe, expect, it } from 'vitest';
import type { AmisSchemaRecord } from '../types';
import {
  clearXuiComponentRegistry,
  registerXuiComponent,
  resolveXuiComponent,
  unregisterXuiComponent,
} from './registry';

describe('registry', () => {
  it('registerXuiComponent and resolveXuiComponent round-trip', async () => {
    clearXuiComponentRegistry();
    const transform = (schema: AmisSchemaRecord) => ({ ...schema, processed: true });
    registerXuiComponent('my-widget', transform);

    const result = await resolveXuiComponent('my-widget', { type: 'test' });
    expect(result).toEqual({ type: 'test', processed: true });
  });

  it('resolveXuiComponent throws for unknown type', async () => {
    clearXuiComponentRegistry();
    await expect(resolveXuiComponent('nonexistent', {})).rejects.toThrow(
      'Unknown xui component: nonexistent',
    );
  });

  it('resolveXuiComponent supports async transforms', async () => {
    clearXuiComponentRegistry();
    registerXuiComponent('async-widget', async (schema) => ({ ...schema, async: true }));

    const result = await resolveXuiComponent('async-widget', { type: 'test' });
    expect(result).toEqual({ type: 'test', async: true });
  });

  it('unregisterXuiComponent removes a registered component', async () => {
    clearXuiComponentRegistry();
    registerXuiComponent('temp-widget', (s) => s);
    unregisterXuiComponent('temp-widget');

    await expect(resolveXuiComponent('temp-widget', {})).rejects.toThrow(
      'Unknown xui component: temp-widget',
    );
  });

  it('clearXuiComponentRegistry removes all components', async () => {
    registerXuiComponent('a', (s) => s);
    registerXuiComponent('b', (s) => s);
    clearXuiComponentRegistry();

    await expect(resolveXuiComponent('a', {})).rejects.toThrow('Unknown xui component: a');
    await expect(resolveXuiComponent('b', {})).rejects.toThrow('Unknown xui component: b');
  });

  it('registerXuiComponent overwrites existing entry', async () => {
    clearXuiComponentRegistry();
    registerXuiComponent('over', (s) => ({ ...s, v: 1 }));
    registerXuiComponent('over', (s) => ({ ...s, v: 2 }));

    const result = await resolveXuiComponent('over', { type: 't' });
    expect(result).toEqual({ type: 't', v: 2 });
  });
});
