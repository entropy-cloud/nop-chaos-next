import { expect } from '@playwright/test';
import { test, mockLogin as login } from '@nop-chaos/e2e-shared';

test('flux prototype menu loads two-level navigation with CRUD pages', async ({ page }) => {
  await login(page, { username: 'proto', mockMenuRoutes: false });

  const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first();

  await expect(nav.getByRole('button', { name: '系统管理' })).toBeVisible({ timeout: 20_000 });
  await expect(nav.getByRole('button', { name: '内容管理' })).toBeVisible();

  await nav.getByRole('button', { name: '系统管理' }).click();
  await nav.getByRole('button', { name: '用户管理' }).click();

  // Flux page should render with inline data.
  await expect(page.getByText('张三')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('zhangsan@example.com')).toBeVisible();
});

test('flux prototype navigates to roles page', async ({ page }) => {
  await login(page, { username: 'proto', mockMenuRoutes: false });

  const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first();
  await nav.getByRole('button', { name: '系统管理' }).click();
  await nav.getByRole('button', { name: '角色管理' }).click();

  await expect(page.getByText('管理员')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('admin')).toBeVisible();
  await expect(page.getByText('拥有所有权限')).toBeVisible();
});

test('flux prototype second group shows articles CRUD', async ({ page }) => {
  await login(page, { username: 'proto', mockMenuRoutes: false });

  const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first();
  await expect(nav.getByRole('button', { name: '内容管理' })).toBeVisible({ timeout: 20_000 });
  await nav.getByRole('button', { name: '内容管理' }).click();
  await nav.getByRole('button', { name: '文章管理' }).click();

  await expect(page.getByText('Flux 入门指南')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('产品迭代计划')).toBeVisible();
});
