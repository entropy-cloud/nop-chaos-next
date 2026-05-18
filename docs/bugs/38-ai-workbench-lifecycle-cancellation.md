# 38 AI Workbench Lifecycle Cancellation

## Problem

- AI Workbench 的历史加载和 mock 流式回复使用定时器模拟异步行为，但页面卸载、会话切换或用户点击 Stop 后，这些异步链路此前仍可能继续推进。
- 结果上旧会话会被后台继续补写，或者组件离开后仍有悬挂 timer 试图更新状态。

## Diagnostic Method

- 检查 `apps/main/src/pages/ai-workbench/index.tsx` 中 `loadOlderMessages()` 和 `streamAssistantReply()` 的 timer 路径，确认历史加载和流式补字都没有共享的取消机制。
- 对照用户可见交互，区分 4 类关键场景：Stop、切换会话、页面卸载、历史加载未完成即离开。
- 添加 fake-timer focused tests，而不是依赖宽泛 DOM 快照，直接证明取消后 timer 不再继续推进旧状态。

## Root Cause

- mock async 实现把定时器只当作视觉效果，没有把它们视为需要跟随组件生命周期一起清理的异步资源。
- 历史加载与流式回复各自独立实现延时链路，缺少统一的取消入口。

## Fix

- `apps/main/src/pages/ai-workbench/index.tsx` 新增 stream/history timer refs、mount flag 和共享取消逻辑。
- Stop、切换会话、新建会话、删除当前会话以及组件卸载都会触发当前流式回复取消。
- 页面卸载时会同时清理历史加载 timer 与流式回复 timer，避免继续向已卸载组件补写状态。

## Tests

- `apps/main/src/pages/ai-workbench/index.test.ts` - 验证切换会话后旧流不再继续补写。
- `apps/main/src/pages/ai-workbench/index.test.ts` - 验证 Stop 后流式回复立即停止且后续不再继续补字。
- `apps/main/src/pages/ai-workbench/index.test.ts` - 验证卸载时会清空挂起的 history / stream timers。

## Affected Files

- `apps/main/src/pages/ai-workbench/index.tsx`
- `apps/main/src/pages/ai-workbench/index.test.ts`
- `docs/design/ai-workbench.md`

## Notes For Future Refactors

- 任何 mock stream / delayed-load 逻辑都要当成真实异步资源处理，具备 stop、switch、unmount 三类取消路径。
- UI 演示页即使不接真实后端，也需要生命周期级 regression tests；否则定时器问题很容易在重构时回归。
