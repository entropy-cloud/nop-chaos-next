/**
 * REST RPC 请求解析器。
 *
 * 处理 @query: / @mutation: 前缀 URL 的转换逻辑，类似 AMIS 的 transformGraphQLRequest
 * 但直接输出 REST RPC 格式（/r/OperationName），不走 GraphQL 路径。
 *
 * @query: 操作 → POST /r/OperationName，data 直接透传
 * @mutation: 操作 → POST /r/OperationName，data 包装为 {data: originalData}
 *                   （后端 GraphQL mutation 的参数名固定为 data）
 */

function filterSpecialFields(data: unknown): unknown {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return data;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (key.startsWith('__') || key.startsWith('@') || key.startsWith('v_')) {
      continue;
    }
    result[key] = value;
  }
  return result;
}

export interface NopRpcResolution {
  url: string;
  method: string;
  data: unknown;
  operationName?: string;
  selection?: string;
}

export function resolveNopRpcUrl(
  rawUrl: string,
  rawData: unknown,
  selection?: string,
): NopRpcResolution | null {
  const nopMatch = rawUrl.match(/^@[a-zA-Z]+:([^/?]+)(?:\/([^?]+))?/);
  if (!nopMatch) return null;

  const prefix = rawUrl.substring(0, rawUrl.indexOf(':'));
  const operationName = nopMatch[1];
  const selectionPath = nopMatch[2];

  let url = '/r/' + operationName;
  let data = rawData;

  // Extract URL query params (e.g. ?id=${id}) and merge into POST body.
  // CRUD dialog forms put entity id as URL query (@query:NopAuthUser__get?id=${id}).
  // The Flux runtime resolves ${id} before reaching the fetcher; query params
  // must be forwarded as POST body so the backend receives them.
  const qmarkIdx = rawUrl.indexOf('?');
  if (qmarkIdx >= 0) {
    const params = new URLSearchParams(rawUrl.slice(qmarkIdx));
    const paramObj: Record<string, string> = {};
    for (const [k, v] of params) {
      if (k !== '@selection') {
        paramObj[k] = v;
      }
    }
    if (Object.keys(paramObj).length > 0) {
      data = typeof data === 'object' && data !== null && !Array.isArray(data)
        ? { ...(data as Record<string, unknown>), ...paramObj }
        : paramObj;
    }
  }

  // Convert CRUD pagination params for __findPage operations.
  // Flux CRUD sends {page, perPage, filter_xxx} but Nop REST RPC endpoint
  // expects {query: {offset, limit, filter_xxx, ...}}.
  if (data && typeof data === 'object' && !Array.isArray(data) && operationName.endsWith('__findPage')) {
    const obj = data as Record<string, unknown>;
    const query: Record<string, unknown> = {};
    const pageNum = obj['page'] != null ? Number(obj['page']) : NaN;
    const perPageNum = obj['perPage'] != null ? Number(obj['perPage']) : NaN;
    if (!Number.isNaN(pageNum) && !Number.isNaN(perPageNum)) {
      query.offset = (pageNum - 1) * perPageNum;
      query.limit = perPageNum;
    }
    for (const [key, val] of Object.entries(obj)) {
      if (key !== 'page' && key !== 'perPage') {
        query[key] = val;
      }
    }
    data = { query };
  }

  if (prefix === '@mutation' && data != null) {
    data = { data: filterSpecialFields(data) };
  }

  const resolvedSelection = selection || selectionPath;

  if (resolvedSelection) {
    url +=
      '?' +
      encodeURIComponent('@selection') +
      '=' +
      encodeURIComponent(resolvedSelection);
  }

  return {
    url,
    method: 'POST',
    data,
    operationName,
    selection: resolvedSelection,
  };
}
