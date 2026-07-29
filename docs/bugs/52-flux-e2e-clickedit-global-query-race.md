# 52 Flux E2E clickEdit Global `document.querySelector` Race Condition

## Problem

Flux mode CRUD 编辑测试（User "编辑用户"、Role "编辑角色"）静默失败：修改后的字段值不生效，提交后后端收到的还是原始值。

**所处位置**：`nop-entropy-e2e/packages/e2e-shared/src/CrudListPage.ts` 的 `clickEdit` 方法，以及 `nop-entropy-e2e/packages/nop-auth-e2e/tests/auth-user.spec.ts` 等浏览器编辑测试。

**最小重现**：编辑用户 nickName 后保存，重新查询发现 nickName 未改变。

## Diagnostic Method

**诊断难度**：高。测试不报错、不超时，所有操作看起来正常执行，唯一症状是编辑无效。

**调查路径**：

1. 先怀疑后端——截图浏览器 Network 面板，对比 loadAction（获取原始数据）和 submit（保存修改）的 payload。发现 submit 的 `nickName` 已经是原始值，不是用户修改的值。
2. 给 `fillEditForm` 前后加 `page.evaluate` 日志，确认 `fillEditForm` 确实执行了 `fill('新值')`。
3. 缩小到 `clickEdit` → `fillEditForm` → `clickSave` 的时序问题。怀疑 loadAction 响应在 `fillEditForm` 之后到达。
4. 检查 `clickEdit` 里有一个 `waitForFunction`，意图是等待 loadAction 填充表单后再让 `fillEditForm` 写入新值。
5. 发现该 `waitForFunction` 使用 `document.querySelector` 全局查询任意非隐藏 input——在 User 页面上，之前 `searchUser` 调用留下的 `filter_userName` 搜索框正好有非空值，导致 waitForFunction 立即返回。
6. `fillEditForm` 写入新值 → loadAction 响应到达 → 所有字段被覆盖回原始值。

**被排除的假设**：

- 后端 API 没问题（RPC 直接调用的编辑测试全部通过 ✅）
- `setFieldValue` 没问题（创建测试中字段填充正常 ✅）
- 对话框 submit 没问题（创建测试保存正常 ✅）

**决定性证据**：在 waitForFunction 前后添加 `page.evaluate` 打印 dialog 内第一个 input 的值，发现在 waitForFunction "通过" 后，dialog 内的 input 值仍为空——说明 waitForFunction 匹配的是页面上其他 input，不是 dialog 内的。

## Root Cause

`CrudListPage.clickEdit` 第 155-156 行的 `waitForFunction` 使用 `document.querySelector` 在整个 document 中搜索：

```typescript
const input = document.querySelector('input[name="roleName"], input:not([type="hidden"])');
```

- `input[name="roleName"]`：在用户编辑对话框（只有 `userName`/`nickName` 等字段）中不存在，fall through
- `input:not([type="hidden"])`：**全局匹配**页面上的任意非隐藏 input，包括搜索栏中残留的 `filter_userName` 输入框

搜索框的值来自测试中前一步的 `searchUser(data.userName)`，始终非空。因此 waitForFunction 在 loadAction 响应用到 dialog 之前就 resolve 了。

## Fix

将 waitForFunction 从 `document.querySelector` 全局查询改为 `dialog.evaluate` 限定在对话框 DOM 内轮询：

```typescript
// Before: 全局查询，会被搜索框值干扰
await this.page.waitForFunction(() => {
  const input = document.querySelector('input[name="roleName"], input:not([type="hidden"])');
  return input && (input as HTMLInputElement).value !== '';
});

// After: 限定在 dialog 内查询
await dialog.evaluate((el) => {
  const dialogEl = el as HTMLElement;
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout')), 10_000);
    const check = () => {
      const input = dialogEl.querySelector<HTMLInputElement>('input:not([type="hidden"])');
      if (input && input.value !== '') {
        clearTimeout(timeout);
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });
});
```

同时副带修复：
- `FluxAdapter.setFieldValue` 增加 disabled/readOnly 检查，跳过不可编辑输入框
- `FluxAdapter.confirmDialogAction` 改用 `page.evaluate` 原生 DOM click，修复 `position: fixed` 弹窗 Playwright click 静默失败问题
- `auth-user.spec.ts` afterEach 添加 `loginRpc` 防止 401 cleanup 失败
- `role.po.ts` `createRole` 添加 flux 模式 goto 刷新（同 UserPO 模式）

## Tests

无新增独立测试。修复覆盖由以下 E2E 浏览器测试验证：

- `auth-user.spec.ts` "浏览器: 编辑用户" — 验证修改用户 nickName 后值正确更新
- `auth-role.spec.ts` "浏览器: 编辑角色" — 验证修改角色名后值正确更新
- `auth-user.spec.ts` "浏览器: 删除用户" — 验证删除操作后实体不在列表中
- `auth-role.spec.ts` "浏览器: 创建新角色" — 验证创建角色后表格刷新显示新数据

## Affected Files

- `nop-entropy-e2e/packages/e2e-shared/src/CrudListPage.ts` — `clickEdit` waitForFunction scope fix
- `nop-entropy-e2e/packages/e2e-shared/src/FluxAdapter.ts` — `setFieldValue` disabled check + `confirmDialogAction` evaluate
- `nop-entropy-e2e/packages/nop-auth-e2e/tests/auth-user.spec.ts` — afterEach loginRpc
- `nop-entropy-e2e/packages/nop-auth-e2e/tests/page-objects/role.po.ts` — createRole flux goto

## Notes For Future Refactors

1. 所有浏览器内 `document.querySelector` 的 waitForFunction/check 必须限定作用域——永远不要用全局查询判断局部 DOM 状态。
2. `FormDialog.submit()` 的 Escape fallback 隐式依赖 dialog 可被 Escape 关闭的 flux 行为——如果 flux 改变关闭机制，需同步更新。
3. `cellValue` 的 column index 逻辑依赖 columnHeaders 格式约定（`''` 占位符表示非数据列）——改 columnHeaders 时需同步验证 table cell 读取。
