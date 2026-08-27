/**
 * Flux 运行时调试诊断记录器。
 *
 * 通过运行时开关 `window.__FLUX_DEBUG__ = true`（或构建期 VITE_FLUX_DEBUG=true）开启。
 * 开启后，flux env 的所有重要动作（ajax 请求/响应、monitor 错误、notify 消息）
 * 都会追加到 `window.__fluxDebug`（环形缓冲，最多 200 条），
 * e2e 测试可通过 e2e-shared 的 `dumpFluxDebug(page)` 读取。
 *
 * 设计目标：不修改 nop-chaos-flux 代码，复用其内置 monitor/notify/fetcher 钩子，
 * 为 e2e 提供一个持久化、可开关的调试诊断机制，避免每次调试临时插入代码。
 */

export interface FluxDebugEntry {
  /** request: ajax 请求发出前；response: 请求完成后；error: monitor 错误；notify: toast 消息 */
  phase: 'request' | 'response' | 'error' | 'notify';
  ts: number;
  url?: string;
  method?: string;
  /** request 的请求体（截断保护由消费方处理） */
  data?: unknown;
  /** response 的 ok 标记 */
  ok?: boolean;
  /** response 的 RPC status（非 HTTP status） */
  status?: number;
  /** error 详情 */
  error?: string;
  /** notify 级别 */
  level?: string;
  /** notify 消息 */
  message?: string;
  /** response 的数据摘要 */
  dataPreview?: string;
}

const MAX_ENTRIES = 200;

declare global {
  interface Window {
    __FLUX_DEBUG__?: boolean;
    __fluxDebug?: FluxDebugEntry[];
  }
}

export function isFluxDebugEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.__FLUX_DEBUG__ === true || import.meta.env.VITE_FLUX_DEBUG === 'true';
}

export function recordFluxDebug(entry: Omit<FluxDebugEntry, 'ts'>): void {
  if (!isFluxDebugEnabled()) {
    return;
  }
  const list = window.__fluxDebug ?? (window.__fluxDebug = []);
  list.push({ ...entry, ts: Date.now() });
  if (list.length > MAX_ENTRIES) {
    list.splice(0, list.length - MAX_ENTRIES);
  }
}

export function resetFluxDebug(): void {
  if (typeof window !== 'undefined') {
    window.__fluxDebug = [];
  }
}
