import type { Page as PlaywrightPage, Locator } from '@playwright/test';
import type { EngineAdapter } from './types';

export class FormDialog {
  constructor(
    private page: PlaywrightPage,
    private engine: EngineAdapter,
  ) {}

  get dialog() {
    return this.engine.dialog(this.page);
  }

  async waitForVisible(): Promise<void> {
    await this.dialog.waitFor({ state: 'visible' });
  }

  async waitForHidden(): Promise<void> {
    await this.dialog.waitFor({ state: 'hidden' });
  }

  async setField(name: string, value: string): Promise<void> {
    const field = this.engine.formField(this.dialog, name);
    await field.fill(value);
  }

  async getField(name: string): Promise<string> {
    const field = this.engine.formField(this.dialog, name);
    const count = await field.count();
    if (count > 0) {
      try {
        return (await field.first().inputValue()) ?? '';
      } catch {
        // fallback: read text content (for AMIS static/read-only fields)
        return (await field.first().textContent()) ?? '';
      }
    }
    // No input field found — try reading from static display (e.g. .cxd-Form-static)
    const staticField = this.dialog.locator(`.cxd-Form-item:has(label:text-is("${name}")) .cxd-Form-static`);
    const staticCount = await staticField.count();
    if (staticCount > 0) {
      return (await staticField.first().textContent()) ?? '';
    }
    // Fallback: label-adjacent value
    const labelField = this.dialog.locator(`label`).filter({ hasText: name }).first();
    if (await labelField.isVisible().catch(() => false)) {
      const labelText = await labelField.textContent();
      const parent = labelField.locator('..');
      const parentText = await parent.textContent();
      if (labelText && parentText) {
        return parentText.replace(labelText, '').trim();
      }
      return '';
    }
    return '';
  }

  async selectOption(fieldLabels: string[], optionTexts: string[]): Promise<void> {
    await this.engine.selectOption(this.dialog, fieldLabels, optionTexts);
  }

  async submit(): Promise<void> {
    await this.engine.submitButton(this.dialog).click();
    await this.waitForHidden();
  }
}
