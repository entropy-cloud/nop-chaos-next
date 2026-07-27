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
): NopRpcResolution | null {
  const nopMatch = rawUrl.match(/^@[a-zA-Z]+:([^/?]+)(?:\/([^?]+))?/);
  if (!nopMatch) return null;

  const prefix = rawUrl.substring(0, rawUrl.indexOf(':'));
  const operationName = nopMatch[1];
  const selectionPath = nopMatch[2];

  let url = '/r/' + operationName;
  let data = rawData;

  // @mutation 操作需要把数据包裹为 {data: originalData}
  if (prefix === '@mutation' && data != null) {
    data = { data };
  }

  // 从 URL 路径中提取 selection（@query:DictProvider__getDict/options 中的 /options 部分）
  if (selectionPath) {
    url += '?@selection=' + encodeURIComponent(selectionPath);
  }

  return {
    url,
    method: 'POST',
    data,
    operationName,
    selection: selectionPath,
  };
}
