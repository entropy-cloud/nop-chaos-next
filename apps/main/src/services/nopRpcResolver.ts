/**
 * REST RPC 请求解析器。
 *
 * 处理 @query: / @mutation: / /r/ 前缀 URL 的参数变换。
 * 变换逻辑遵循 AMIS 的 graphqlArgs 设计模式（operationRegistry + argBuilder），
 * 但输出 REST RPC 格式（/r/OperationName）而非 GraphQL。
 *
 *   @query:NopAuthUser__findPage?page=1&perPage=10  → POST /r/NopAuthUser__findPage
 *   /r/NopAuthUser__findPage?page=1&perPage=10       → POST /r/NopAuthUser__findPage
 */

export interface NopRpcResolution {
  url: string;
  method: string;
  data: unknown;
  operationName?: string;
  selection?: string;
}

// ── 工具函数 ──

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isSpecialKey(key: string): boolean {
  return key.startsWith('__') || key.startsWith('@') || key.startsWith('v_');
}

// ── 递归过滤 __/@/v_ 前缀的键；顶层 $ 前缀为运行时系统参数（如 $form），一并过滤 ──
// 内嵌的 $ 前缀（如 query.filter 中的 TreeBean 结构键 $body/$type）是业务数据结构，不处理。

function removeSpecialKeys(data: unknown): unknown {
  return removeSpecialKeysAtLevel(data, true);
}

function removeSpecialKeysAtLevel(data: unknown, isTopLevel: boolean): unknown {
  if (Array.isArray(data)) return data.map((value) => removeSpecialKeysAtLevel(value, false));
  if (!isPlainObject(data)) return data;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (isSpecialKey(key)) continue;
    if (isTopLevel && key.startsWith('$')) continue;
    result[key] = removeSpecialKeysAtLevel(value, false);
  }
  return result;
}

// ── 标准操作名提取 ──

function getStdOpName(full: string): string {
  const idx = full.lastIndexOf('_');
  return idx > 0 ? full.slice(idx + 1) : full;
}

// ── Builder ──

type ArgBuilder = (data: Record<string, unknown>, arg: OperationArgDef) => unknown;

interface OperationArgDef {
  name: string;
  type: string;
  builder?: ArgBuilder;
}

interface OperationDef {
  arguments: OperationArgDef[];
}

const builders = {
  argString(data: Record<string, unknown>, arg: OperationArgDef): unknown {
    const v = data[arg.name];
    return v == null ? null : String(v);
  },
  argBoolean(data: Record<string, unknown>, arg: OperationArgDef): unknown {
    const v = data[arg.name];
    if (v == null) return null;
    if (v === 'false' || v === 'n' || v === '0' || v === 'N') return false;
    return Boolean(v);
  },
  argInt(data: Record<string, unknown>, arg: OperationArgDef): unknown {
    const v = data[arg.name];
    return v == null ? null : parseInt(String(v), 10);
  },
  argFloat(data: Record<string, unknown>, arg: OperationArgDef): unknown {
    const v = data[arg.name];
    return v == null ? null : parseFloat(String(v));
  },
  argMap(data: Record<string, unknown>, arg: OperationArgDef): unknown {
    return data[arg.name];
  },
  argDataMap(data: Record<string, unknown>, _arg: OperationArgDef): unknown {
    // save/update: 直接返回整个 data（特殊键已在入口统一过滤）
    return data;
  },
  argValue(data: Record<string, unknown>, arg: OperationArgDef): unknown {
    return data[arg.name];
  },
  argStringList(data: Record<string, unknown>, arg: OperationArgDef): unknown {
    const v = data[arg.name];
    if (v == null) return null;
    return typeof v === 'string' ? v.split(',') : v;
  },
};

// ── toOrderBy / toFilter / mergeFilter（同 AMIS graphqlFilter.ts 逻辑） ──

function toOrderBy(field: unknown, dir: unknown): unknown {
  if (field == null || typeof field !== 'string' || !field) return undefined;
  const name = field.endsWith('_label') ? field.slice(0, -6) : field;
  return [{ name, desc: dir === 'desc' }];
}

function toFilter(data: Record<string, unknown>): Record<string, unknown> | undefined {
  const body: Record<string, unknown>[] = [];
  for (const [key, raw] of Object.entries(data)) {
    if (!key.startsWith('filter_')) continue;
    let name = key.slice(7);
    let op = 'eq';
    const pos = name.lastIndexOf('__');
    if (pos > 0) { op = name.slice(pos + 2); name = name.slice(0, pos); }
    if (raw == null || raw === '') continue;
    let value: unknown = raw;
    if (value === '__empty') value = '';
    else if (value === '__null') value = null;
    let min: unknown; let max: unknown;
    if (op.startsWith('between') && value != null) {
      const r = Array.isArray(value) ? value : String(value).split(',');
      min = r[0]; max = r[1]; value = undefined;
    }
    body.push({ $type: op, name, value, min, max });
  }
  if (body.length === 0) return undefined;
  return { $type: 'and', $body: body };
}

function mergeFilter(a: unknown, b: unknown): unknown {
  if (!a) return b;
  if (!b) return a;
  return { $type: 'and', $body: [a, b] };
}

// ── argQuery：findPage/findList/findFirst ──

// flux 模式的 CRUD loadAction 会把 queryForm 原始字段名（filter_X__op）整体放进
// data.query（scope 投影 includeScope:'*'），与 AMIS 顶层 filter_* 等价。
// 这里对 data.query 内部嵌套的 filter_* 键做同样的 TreeBean 转换并从 query 中移除，
// 保证到达后端的结构与 AMIS 一致（query.filter + 无残留 filter_* 键）。

function normalizeNestedFilters(query: Record<string, unknown>): Record<string, unknown> | undefined {
  const nested = toFilter(query);
  if (nested) {
    for (const key of Object.keys(query)) {
      if (key.startsWith('filter_')) {
        delete query[key];
      }
    }
  }
  return nested;
}

function argQuery(data: Record<string, unknown>, _arg: OperationArgDef): unknown {
  const q: Record<string, unknown> = { ...(isPlainObject(data.query) ? data.query : {}) };
  const nestedFilter = normalizeNestedFilters(q);
  const rawLimit = q.limit ?? data.limit ?? data.pageSize ?? data.perPage ?? 0;
  q.limit = typeof rawLimit === 'number' ? rawLimit : Number(rawLimit) || 0;
  const pg = typeof data.page === 'number' ? data.page : Number(data.page || 0);
  const limit = q.limit as number;
  q.offset = q.offset ?? data.offset ?? (limit > 0 && pg > 0 ? limit * (pg - 1) : 0);
  q.orderBy = q.orderBy ?? toOrderBy(data.orderBy ?? data.orderField, data.orderDir);
  q.filter = mergeFilter(q.filter, mergeFilter(nestedFilter, toFilter(data)));
  q.cursor = q.cursor ?? data.cursor;
  q.timeout = q.timeout ?? data.timeout;
  return q;
}

// ── argDataMap：save/update/delete 等，过滤特殊键 + 递归 ──

function argDataMap(data: Record<string, unknown>, _arg: OperationArgDef): unknown {
  return removeSpecialKeys(data);
}

// ── 默认 Builder 映射表（按 arg.type 查找） ──

const defaultArgBuilders: Record<string, ArgBuilder> = {
  String: builders.argString,
  Boolean: builders.argBoolean,
  Int: builders.argInt,
  Float: builders.argFloat,
  Map: builders.argMap,
  '[String]': builders.argStringList,
  '[Map]': builders.argMap,
  QueryBeanInput: (d, a) => argQuery(d, a),
};

// ── 操作注册表 ──

const operationRegistry: Record<string, OperationDef> = {
  get:        { arguments: [{ name: 'id', type: 'String' }, { name: 'ignoreUnknown', type: 'Boolean' }] },
  findPage:   { arguments: [{ name: 'query', type: 'QueryBeanInput' }] },
  findList:   { arguments: [{ name: 'query', type: 'QueryBeanInput' }] },
  findFirst:  { arguments: [{ name: 'query', type: 'QueryBeanInput' }] },
  save:       { arguments: [{ name: 'data', type: 'Map', builder: builders.argDataMap }] },
  update:     { arguments: [{ name: 'data', type: 'Map', builder: builders.argDataMap }] },
  saveOrUpdate: { arguments: [{ name: 'data', type: 'Map', builder: builders.argDataMap }] },
  upsert:     { arguments: [{ name: 'data', type: 'Map', builder: builders.argDataMap }] },
  copyForNew: { arguments: [{ name: 'data', type: 'Map', builder: builders.argDataMap }] },
  delete:     { arguments: [{ name: 'id', type: 'String' }] },
  batchGet:   { arguments: [{ name: 'ids', type: '[String]' }] },
  batchDelete:{ arguments: [{ name: 'ids', type: '[String]' }] },
  batchModify:{ arguments: [{ name: 'data', type: '[Map]' }, { name: 'delIds', type: '[String]' }] },
  logout:    { arguments: [{ name: 'accessToken', type: 'String' }] },
};

// ── RPC 参数构建 ──

function buildRpcParams(data: Record<string, unknown>, operationName: string): Record<string, unknown> {
  const stdOp = getStdOpName(operationName);
  const def = operationRegistry[stdOp];
  if (!def) return data;

  const params: Record<string, unknown> = {};
  for (const arg of def.arguments) {
    const builder = arg.builder || defaultArgBuilders[arg.type] || builders.argValue;
    params[arg.name] = builder(data, arg);
  }
  return params;
}

// ── URL 参数提取 ──

function extractUrlParams(rawUrl: string): { params: Record<string, string>; selection: string | undefined } {
  const qIdx = rawUrl.indexOf('?');
  if (qIdx < 0) return { params: {}, selection: undefined };
  const sp = new URLSearchParams(rawUrl.slice(qIdx));
  const params: Record<string, string> = {};
  let selection: string | undefined;
  for (const [k, v] of sp) {
    if (k === '@selection') selection = v;
    else params[k] = v;
  }
  return { params, selection };
}

// ── 主入口 ──

export function resolveNopRpcUrl(
  rawUrl: string,
  rawData: unknown,
  selection?: string,
): NopRpcResolution | null {
  const nopMatch = rawUrl.match(/^@[a-zA-Z]+:([^/?]+)(?:\/([^?]+))?/);
  const rpcMatch = !nopMatch ? rawUrl.match(/^\/r\/([A-Z][A-Za-z0-9_]+)(?:\?|$)/) : null;
  if (!nopMatch && !rpcMatch) return null;

  const isQueryOrMutation = !!nopMatch;
  const prefix = nopMatch ? rawUrl.substring(0, rawUrl.indexOf(':')) : undefined;
  const operationName = nopMatch ? nopMatch[1] : rpcMatch![1];
  const urlSel = nopMatch ? nopMatch[2] : undefined;
  const { params: urlParams, selection: urlSelection } = extractUrlParams(rawUrl);

  // 合并 rawData 和 URL 查询参数
  let data = rawData;
  if (Object.keys(urlParams).length > 0) {
    data = isPlainObject(data)
      ? { ...(data as Record<string, unknown>), ...urlParams }
      : urlParams;
  }

  if (isPlainObject(data)) {
    // 统一先过滤 __/@/v_ 前缀的运行时参数（递归）
    const cleaned = removeSpecialKeys(data as Record<string, unknown>);

    if (isQueryOrMutation) {
      // @query:/@mutation: 走 operationRegistry + builder 完整变换
      data = buildRpcParams(cleaned as Record<string, unknown>, operationName);
      // @mutation 未注册操作：回退到 { data: ... }
      if (prefix === '@mutation' && !operationRegistry[getStdOpName(operationName)]) {
        data = { data: cleaned };
      }
    } else {
      // /r/ 直发路径：过滤已完成，直接使用
      data = cleaned;
    }
  }

  // 构建最终 URL（selection 优先级：显式参数 > URL path > URL ?@selection=）
  const sel = selection || urlSel || urlSelection;
  let url = '/r/' + operationName;
  if (sel) url += '?' + encodeURIComponent('@selection') + '=' + encodeURIComponent(sel);

  return { url, method: 'POST', data, operationName, selection: sel };
}
