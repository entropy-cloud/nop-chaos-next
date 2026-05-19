# 39 Master Detail Detail Form Button Submit Loop

## Problem

- `apps/main/src/pages/data-management/master-detail/[id]/index.tsx` 的物流删除操作会先弹出应用内确认框。
- 点击第一次确认框的 `Confirm` 后，还会残留一个标题为 `Confirm`、正文为空的对话框；继续点击 `Confirm` 或 `Cancel` 都不会产生业务效果。
- 在另一条交互路径上，取消第一次确认后，第二次点击删除也可能被一层不可见遮罩拦住，确认框无法再次打开。
- 该症状最容易在 `/#/data-management/master-detail/1001` 删除物流记录时复现，并已由 Playwright 稳定锁定。

## Diagnostic Method

- 先补了 `tests/e2e/master-detail-dialogs.spec.ts` 的物流删除确认用例，要求“取消后再次点击删除仍可重新打开确认框，确认后目标记录消失”。
- focused e2e 首轮稳定失败，错误不是浏览器原生 confirm，而是 Playwright 明确报出：关闭态 `alert-dialog-overlay` 仍拦截 pointer events，第二次点击删除按钮超时。
- 再回看 `ConfirmDialogHost` 与 `flux-lib/ui/src/components/ui/alert-dialog.tsx`，确认请求状态本身已清空，但 overlay 节点在 `data-closed` 动画期仍挂在 portal 中，且没有禁用指针事件。
- 用户随后补充了更直接的运行时现象：第一次确认 `Confirm` 后会出现“空 Confirm”对话框。对照 `ConfirmDialogHost` 实现可见，组件即便 `request` 已清空，仍会渲染一个 `open={false}` 的 `AlertDialog` 和空 `AlertDialogContent`，这解释了“标题还在、正文为空、按钮还在”的残留 UI。
- 详情页内缺少按钮 `type` 的问题仍然存在并已一起修掉，但最终锁定到的根因分成两层：UI 层 alert-dialog overlay 的关闭态交互泄漏，以及 `ConfirmDialogHost` 对空 request 的残留渲染。

## Root Cause

- `master-detail/[id]` 详情页把整页包在 `<form>` 中，子区块里的非提交按钮之前没有显式 `type="button"`，这是删除链路的一个风险放大器，已一并修正。
- 更直接的复现根因在 `@nop-chaos/ui` 的 `AlertDialogOverlay`：组件关闭后仍保留在 portal 中执行 `data-closed` 动画，但关闭态没有禁用 pointer events。
- 结果是用户点击取消后，视觉上 dialog 消失了，实际却还有一层不可见 overlay 挡住页面，导致第二次删除无法触发新的 confirm。
- `apps/main/src/components/common/ConfirmDialogHost.tsx` 还存在一个独立问题：即使 `request` 已经是 `null`，组件仍继续渲染 `AlertDialog` 和 `AlertDialogContent`，只是把 `open` 设成 `false`，因此会留下一个标题默认回退成 `Confirm`、正文为空的残留 dialog 外壳。

## Fix

- 在 `flux-lib/ui/src/components/ui/alert-dialog.tsx` 为 overlay 增加 `data-closed:pointer-events-none`，让关闭动画仍保留时不会继续拦截页面点击。
- 在 `apps/main/src/pages/data-management/master-detail/[id]/index.tsx` 与相关 section/dialog 组件中继续保留按钮类型修正：非提交按钮显式 `type="button"`，页面主保存按钮为 `type="submit"`。
- 进一步补齐 `apps/main/src/pages/data-management/master-detail/[id]/components/FilterToolbar.tsx` 中漏掉的 `Clear filters` 按钮 `type="button"`，避免该详情表单内残留的默认 submit 行为再次触发意外离开确认。
- 在 `apps/main/src/components/common/ConfirmDialogHost.tsx` 中把空 request 分支改成直接 `return null`，只在存在真实 request 时才渲染 `AlertDialog`，从根上消除空白 `Confirm` 残留。
- 这样删除物流的取消/再次删除/确认链路都能回到单一的应用内 confirm，不会再被关闭态 overlay、空 request dialog 残留或表单默认行为干扰。

## Tests

- `tests/e2e/master-detail-dialogs.spec.ts` - 新增删除物流回归用例，验证取消后可以再次点击删除重新打开确认框，确认后只删除目标物流记录。
- `tests/e2e/master-detail-dialogs.spec.ts` - 额外监听 Playwright `page.on('dialog')`，确保删除物流 focused 链路和整份 dialogs spec 都不会再触发浏览器原生空 confirm / beforeunload dialog。
- `tests/e2e/master-detail-dialogs.spec.ts` - 确认删除用例额外断言页面中不允许残留标题为 `Confirm` 的空对话框。

## Affected Files

- `flux-lib/ui/src/components/ui/alert-dialog.tsx`
- `apps/main/src/components/common/ConfirmDialogHost.tsx`
- `apps/main/src/pages/data-management/master-detail/[id]/index.tsx`
- `apps/main/src/pages/data-management/master-detail/[id]/components/ItemsSection.tsx`
- `apps/main/src/pages/data-management/master-detail/[id]/components/AddressesSection.tsx`
- `apps/main/src/pages/data-management/master-detail/[id]/components/LogisticsSection.tsx`
- `apps/main/src/pages/data-management/master-detail/[id]/components/AddressDialog.tsx`
- `apps/main/src/pages/data-management/master-detail/[id]/components/LogisticsDrawer.tsx`
- `tests/e2e/master-detail-dialogs.spec.ts`

## Notes For Future Refactors

- 只要页面根节点继续使用 `<form>`，区块级操作按钮都必须显式区分 `type="button"` 和 `type="submit"`。
- 不要假设 UI Button 组件会替业务层自动处理表单语义；跨层组合时要检查浏览器原生默认行为。
- 带 portal/overlay 的 UI 组件在关闭动画阶段也要检查 pointer-events 语义，否则“视觉已关闭但交互仍被遮住”的问题很容易漏掉。
- 订阅外部 confirm store 的 host 组件在 store 为空时应彻底卸载 UI，而不是保留一个 `open={false}` 的空 dialog 容器。
