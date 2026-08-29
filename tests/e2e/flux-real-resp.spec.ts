import { test, expect } from '@playwright/test';
import { writeFileSync } from 'fs';
import { mockLogin as login } from '@nop-chaos/e2e-shared';

test('host mock + 真实后端响应：edit 提交值验证', async ({ page }) => {
  const logs: string[] = [];
  page.on("console", (m) => { if (m.text().includes("TMP")) logs.push(m.text().slice(0,200)); });
  page.on('console', (m) => { if (m.text().includes('TEMP') || m.text().includes('scope')) logs.push(m.text().slice(0,300)); });
  await login(page, { mockMenuRoutes: false });
  await page.getByRole('button', { name: 'Flux Demo' }).click();
  await expect(page.getByText('Flux JSON CRUD Demo')).toBeVisible({ timeout: 15_000 });

  // 真实响应原样（从真实后端抓取）
  const realResp = {
    id: 'pe_1785625805622', roleId: 'pe_1785625805622',
    roleName: 'E2E_UI编辑_pe_1785625805622',
    childRoleIds: null, isPrimary: 0, delFlag: 0, version: 0,
    createdBy: 'nop', createTime: '2026-08-02 07:10:05',
    updatedBy: 'nop', updateTime: '2026-08-02 07:10:05', remark: null,
  };
  let updateBody: unknown = undefined;
  await page.route('**/r/NopAuthRole__get**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 0, data: realResp }) }));
  await page.route('**/r/NopAuthRole__update**', async (r) => { updateBody = r.request().postDataJSON(); await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 0, data: { id: realResp.id } }) }); });

  await page.getByRole('button', { name: 'Edit (real resp)' }).click();
  const input = page.getByLabel('Role Name');
  await expect(input).toHaveValue(realResp.roleName);
  await input.fill('EditedValueReal');
  await expect(input).toHaveValue('EditedValueReal');

  await page.getByRole('button', { name: 'OK' }).click();
  await page.waitForTimeout(1500);

  const data = (updateBody as { data?: { roleName?: string } } | undefined)?.data;
  writeFileSync('/tmp/real-resp.txt', JSON.stringify({
    domAfterFill: await input.evaluate((el) => (el as HTMLInputElement).value).catch(() => '(closed)'),
    updateRoleName: data?.roleName,
    updateBody,
  }, null, 2));
  expect(data?.roleName).toBe('EditedValueReal');
});
