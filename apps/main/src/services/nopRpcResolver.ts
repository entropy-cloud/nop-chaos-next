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
