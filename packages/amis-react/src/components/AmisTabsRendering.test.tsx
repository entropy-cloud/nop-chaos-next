// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';

// Mock heavy editor dep that AMIS imports dynamically
vi.mock('monaco-editor', () => ({}));

// We need to test if AMIS Tabs content renders correctly under React 19.
// This test renders a minimal AMIS schema with Tabs + form items
// and checks if the form items appear in the DOM.

describe('AMIS Tabs rendering under React 19', () => {
  it('renders tab content for simple tabs schema', async () => {
    // Dynamically import to ensure React 19 environment
    const { render: renderAmis } = await import('amis');
    const { createAmisEnv } = await import('../env');

    const page = {
      id: 'test-tabs',
      async dispatchEvent() {},
      on() {},
      off() {},
      destroy() {},
    } as any;

    const env = createAmisEnv(page) as any;

    const schema = {
      type: 'page',
      body: {
        type: 'form',
        body: {
          type: 'tabs',
          tabs: [
            {
              title: 'Tab 1',
              body: [
                { type: 'input-text', name: 'field1', label: 'Field 1' },
                { type: 'input-text', name: 'field2', label: 'Field 2' },
              ],
            },
            {
              title: 'Tab 2',
              body: [{ type: 'input-text', name: 'field3', label: 'Field 3' }],
            },
          ],
        },
      },
    };

    const container = document.createElement('div');
    document.body.appendChild(container);

    renderAmis(schema as any, { data: {} }, env);

    // Wait a tick for async rendering
    await new Promise((r) => setTimeout(r, 500));

    const inputs = container.querySelectorAll('input[name="field1"], input[name="field2"]');
    const tabText = container.textContent ?? '';

    console.log('inputs found:', inputs.length);
    console.log('has Field 1 label:', tabText.includes('Field 1'));
    console.log('has Tab 1 title:', tabText.includes('Tab 1'));

    // The key assertion: tab content should render
    expect(tabText).toContain('Tab 1');
    expect(inputs.length).toBeGreaterThan(0);

    document.body.removeChild(container);
  });

  it('renders tab content inside dialog', async () => {
    const { render: renderAmis } = await import('amis');
    const { createAmisEnv } = await import('../env');

    const page = {
      id: 'test-dialog-tabs',
      async dispatchEvent() {},
      on() {},
      off() {},
      destroy() {},
    } as any;

    const env = createAmisEnv(page) as any;

    // Simulate a CRUD dialog with tabs (like NopAuthUser)
    const schema = {
      type: 'page',
      body: {
        type: 'crud',
        api: { method: 'get', url: '/mock/api' },
        columns: [{ name: 'name', label: 'Name' }],
        dialog: {
          title: 'Add Record',
          body: {
            type: 'form',
            api: { method: 'post', url: '/mock/api' },
            body: {
              type: 'tabs',
              tabs: [
                {
                  title: 'Basic Info',
                  body: [
                    { type: 'input-text', name: 'userName', label: 'Username', required: true },
                    { type: 'input-text', name: 'nickName', label: 'Nickname' },
                  ],
                },
                {
                  title: 'Extended Info',
                  body: [
                    { type: 'input-text', name: 'email', label: 'Email' },
                  ],
                },
              ],
            },
          },
        },
      },
    };

    const container = document.createElement('div');
    document.body.appendChild(container);

    renderAmis(schema as any, { data: {} }, env);
    await new Promise((r) => setTimeout(r, 500));

    // The CRUD itself should render
    const crudText = container.textContent ?? '';
    console.log('crud has Name column:', crudText.includes('Name'));

    // Now simulate clicking the add button to open dialog
    const addButton = container.querySelector('button[class*="add"], .cxd-Button--primary');
    if (addButton) {
      (addButton as HTMLElement).click();
      await new Promise((r) => setTimeout(r, 1000));

      const dialog = document.querySelector('.cxd-Modal, .cxd-Dialog');
      const tabPanes = dialog?.querySelectorAll('.cxd-Tabs-pane');
      const formItems = dialog?.querySelectorAll('.cxd-Form-item');
      const inputs = dialog?.querySelectorAll('input[name]');

      console.log('dialog exists:', !!dialog);
      console.log('tab panes:', tabPanes?.length);
      console.log('form items:', formItems?.length);
      console.log('named inputs:', inputs?.length);
      if (inputs) {
        for (const inp of Array.from(inputs)) {
          console.log(`  input name=${inp.getAttribute('name')}`);
        }
      }

      // The key assertion: dialog tab content should have form items
      expect(formItems?.length ?? 0).toBeGreaterThan(0);
    }

    document.body.removeChild(container);
  });
});
