import { expect, test } from '@playwright/test';
import { login } from './support/auth';

test.describe.configure({ mode: 'serial' });

async function expectSemanticColors(
  locator: import('@playwright/test').Locator,
  cssValues: { background: string; foreground: string },
) {
  const styles = await locator.evaluate(
    (el, { background, foreground }) => {
      const buttonStyle = getComputedStyle(el);
      const reference = document.createElement('div');
      reference.style.color = foreground;
      reference.style.backgroundColor = background;
      reference.style.position = 'fixed';
      reference.style.opacity = '0';
      reference.style.pointerEvents = 'none';
      document.body.appendChild(reference);

      const referenceStyle = getComputedStyle(reference);
      const result = {
        color: buttonStyle.color,
        backgroundColor: buttonStyle.backgroundColor,
        expectedColor: referenceStyle.color,
        expectedBackgroundColor: referenceStyle.backgroundColor,
        className: el.className,
      };

      reference.remove();
      return result;
    },
    cssValues,
  );

  expect(styles.backgroundColor).toBe(styles.expectedBackgroundColor);
  expect(styles.color).toBe(styles.expectedColor);
  expect(styles.color).not.toBe('rgb(0, 0, 0)');
}

async function navigateToAiWorkbench(page: import('@playwright/test').Page) {
  await login(page, { username: 'admin', defaultPassword: '123456' });
  await page.getByRole('button', { name: 'AI Workbench' }).click();
  await expect(page).toHaveURL(/\/ai-workbench$/);
}

test('ai workbench regenerate button uses semantic secondary colors', async ({ page }) => {
  test.slow();
  await navigateToAiWorkbench(page);

  const regenerateButton = page.getByRole('button', { name: /Regenerate|重新生成/ });
  await expect(regenerateButton).toBeVisible();
  await expectSemanticColors(regenerateButton, {
    background: 'hsl(var(--secondary))',
    foreground: 'hsl(var(--secondary-foreground))',
  });
});

test('ai workbench generate button uses semantic primary colors', async ({ page }) => {
  test.slow();
  await navigateToAiWorkbench(page);

  const generateButton = page.getByRole('button', { name: /Generate answer|生成回答/ });
  await expect(generateButton).toBeVisible();
  await expectSemanticColors(generateButton, {
    background: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
  });
});

test('master-detail batch delete button uses semantic destructive colors', async ({ page }) => {
  test.slow();
  await login(page, { username: 'admin', defaultPassword: '123456' });
  await page.getByRole('button', { name: 'Master Detail' }).click();
  await expect(page).toHaveURL(/\/data-management\/master-detail$/);

  await page.locator('main table tbody').getByRole('checkbox').first().click({ force: true });

  const batchDeleteButton = page.locator('main').getByRole('button', { name: 'Batch delete' });
  await expect(batchDeleteButton).toBeEnabled();
  await expectSemanticColors(batchDeleteButton, {
    background: 'color-mix(in oklab, hsl(var(--danger)) 10%, transparent)',
    foreground: 'hsl(var(--danger))',
  });
});

test('ai workbench secondary button stays correct after AMIS preview loads global css', async ({ page }) => {
  test.slow();
  await login(page, { username: 'admin', defaultPassword: '123456' });

  await page.getByRole('button', { name: 'Amis Preview' }).click();
  await expect(page).toHaveURL(/\/amis\/preview$/);
  await expect(page.getByRole('button', { name: 'Trigger host toast' })).toBeVisible({ timeout: 30000 });

  await page.getByRole('button', { name: 'AI Workbench' }).click();
  await expect(page).toHaveURL(/\/ai-workbench$/);

  const regenerateButton = page.getByRole('button', { name: /Regenerate|重新生成/ });
  await expect(regenerateButton).toBeVisible();
  await expectSemanticColors(regenerateButton, {
    background: 'hsl(var(--secondary))',
    foreground: 'hsl(var(--secondary-foreground))',
  });
});
