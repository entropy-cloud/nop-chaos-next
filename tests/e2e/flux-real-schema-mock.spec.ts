import { test, expect } from '@playwright/test';
import { writeFileSync } from 'fs';
import { mockLogin as login } from '@nop-chaos/e2e-shared';

test('dump real-schema page state', async ({ page }) => {
  await login(page, { mockMenuRoutes: false });
  await page.getByRole('button', { name: 'Flux Demo' }).click();
  await page.waitForTimeout(4000);
  const info = await page.evaluate(() => {
    const main = document.querySelector('#main-content, main');
    return {
      url: location.href,
      bodyText: document.body.innerText.slice(0, 400),
      mainHTML: main ? main.innerHTML.slice(0, 600) : '(no main)',
      fluxSlots: document.querySelectorAll('[data-slot]').length,
      nopCrud: document.querySelectorAll('.nop-crud').length,
      hasError: /error|失败|exception/i.test(document.body.innerText.slice(0, 2000)),
    };
  });
  writeFileSync('/tmp/real-schema-page.txt', JSON.stringify(info, null, 2));
});
