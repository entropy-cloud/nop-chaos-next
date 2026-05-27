const { chromium } = await import('playwright');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', (msg) => {
  console.log(`[console:${msg.type()}] ${msg.text()}`);
});

page.on('pageerror', (error) => {
  console.log(`[pageerror] ${error.stack || error.message}`);
});

try {
  await page.goto('http://127.0.0.1:4174/auth/login', { waitUntil: 'networkidle' });
  await page.fill('#login-username', 'nop');
  await page.fill('#login-password', '123');
  await page.getByRole('button', { name: /登录|login/i }).click();
  await page.waitForLoadState('networkidle');

  await page.getByRole('link', { name: '用户' }).first().click();
  await page.waitForTimeout(4000);

  console.log(`[url] ${page.url()}`);
  console.log(`[content] ${await page.locator('body').innerText()}`);
} finally {
  await browser.close();
}
