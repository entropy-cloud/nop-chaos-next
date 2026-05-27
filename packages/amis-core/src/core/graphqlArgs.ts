import type { AmisRequestOptions } from '../types';
import { mergeFilter, toArray, toFilter, toOrderBy } from './graphqlFilter';

export interface ArgumentDefinition {
  name: string;
  type: string;
  builder?: (
    data: Record<string, unknown>,
    arg: ArgumentDefinition,
    options: AmisRequestOptions,
  ) => unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isSpecialVarName(name: string) {
  return name.startsWith('__') || name.startsWith('@') || name.startsWith('v_');
}

function getGraphQLSelection(options: AmisRequestOptions) {
  return options['gql:selection'];
}

function guessType(value: unknown) {
  if (typeof value === 'string') {
    return 'String';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'Int' : 'Float';
  }

  if (typeof value === 'boolean') {
    return 'Boolean';
  }

  if (isPlainObject(value)) {
    return 'Map';
  }

  if (isArray(value)) {
    return '[String]';
  }

  return 'String';
}

function argString(data: Record<string, unknown>, arg: ArgumentDefinition) {
  const value = data[arg.name];
  return value == null ? null : String(value);
}

function argBoolean(data: Record<string, unknown>, arg: ArgumentDefinition) {
  const value = data[arg.name];

  if (value == null) {
    return null;
  }

  if (value === 'false' || value === 'n' || value === '0' || value === 'N') {
    return false;
  }

  return Boolean(value);
}

function argInt(data: Record<string, unknown>, arg: ArgumentDefinition) {
  const value = data[arg.name];
  return value == null ? null : parseInt(String(value), 10);
}

function argFloat(data: Record<string, unknown>, arg: ArgumentDefinition) {
  const value = data[arg.name];
  return value == null ? null : parseFloat(String(value));
}

function argMap(data: Record<string, unknown>, arg: ArgumentDefinition) {
  return data[arg.name];
}

function argStringList(data: Record<string, unknown>, arg: ArgumentDefinition) {
  const value = data[arg.name];

  if (value == null) {
    return null;
  }

  return typeof value === 'string' ? value.split(',') : value;
}

function argMapList(data: Record<string, unknown>, arg: ArgumentDefinition) {
  return data[arg.name];
}

function argValue(data: Record<string, unknown>, arg: ArgumentDefinition) {
  return data[arg.name];
}

function argQuery(
  data: Record<string, unknown>,
  _arg: ArgumentDefinition,
  options: AmisRequestOptions,
) {
  const sourceQuery = isPlainObject(data.query) ? data.query : {};
  const query: Record<string, unknown> = { ...sourceQuery };

  query.limit = query.limit ?? data.limit ?? data.pageSize ?? data.perPage ?? 0;

  const limit = typeof query.limit === 'number' ? query.limit : Number(query.limit || 0);
  const page = typeof data.page === 'number' ? data.page : Number(data.page || 0);

  query.offset = query.offset ?? data.offset ?? (limit > 0 && page > 0 ? limit * (page - 1) : 0);
  query.orderBy = query.orderBy ?? toOrderBy(data.orderBy ?? data.orderField, data.orderDir);
  query.filter = mergeFilter(query.filter, toFilter(data, options));
  query.cursor = query.cursor ?? data.cursor;
  query.timeout = query.timeout ?? data.timeout;

  return query;
}

function argDataMap(
  data: Record<string, unknown>,
  _arg?: ArgumentDefinition,
  _options?: AmisRequestOptions,
) {
  const nextValue: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (isSpecialVarName(key)) {
      continue;
    }

    nextValue[key] = value;
  }

  return nextValue;
}

export const defaultArgBuilders: Record<string, ArgumentDefinition['builder']> = {
  String: argString,
  Boolean: argBoolean,
  Int: argInt,
  Float: argFloat,
  Map: argMap,
  '[String]': argStringList,
  '[Map]': argMapList,
  QueryBeanInput: argQuery,
};

export function normalizePickerLoadOptions(
  data: Record<string, unknown>,
  options: AmisRequestOptions,
  operationName: string,
) {
  if (operationName !== 'findPage' || data.op !== 'loadOptions') {
    return {
      data,
      selection: getGraphQLSelection(options),
    };
  }

  const values = toArray(data.value, options.delimiter);

  return {
    data: {
      [`filter_${options.valueField || 'id'}__in`]: values,
    },
    selection: `items{${options.valueField || 'id'},${options.labelField || 'id'}}`,
  };
}

export function guessDefinition(data: Record<string, unknown>) {
  return {
    arguments: Object.entries(data)
      .filter(([key]) => !isSpecialVarName(key))
      .map(([key, value]) => ({ name: key, type: guessType(value) })),
  };
}

export function guessExtArgDefinitions(data: Record<string, unknown>) {
  return Object.entries(data)
    .filter(([key]) => key.startsWith('v_'))
    .map(([key, value]) => ({ name: key, type: guessType(value) }));
}

export function buildGraphQLVariables(
  data: Record<string, unknown>,
  args: ArgumentDefinition[],
  options: AmisRequestOptions,
) {
  const variables: Record<string, unknown> = {};

  for (const arg of args) {
    const builder = arg.builder || defaultArgBuilders[arg.type] || argValue;
    variables[arg.name] = builder(data, arg, options);
  }

  return variables;
}

export function buildGraphQLQuery(
  opType: 'query' | 'mutation' | 'subscription',
  action: string,
  selection: string | undefined,
  args: ArgumentDefinition[],
) {
  let query = `${opType} ${action}`;

  if (args.length > 0) {
    query += `(${args.map((arg) => `$${arg.name}:${arg.type}`).join(',')})`;
  }

  query += `{\n${action}(`;

  if (args.length > 0) {
    query += args.map((arg) => `${arg.name}:$${arg.name}`).join(',');
  }

  query += ')';

  if (selection) {
    query += `{\n${selection}\n}`;
  }

  query += '\n}';
  return query;
}

export interface OperationDefinition {
  arguments: ArgumentDefinition[];
}

export const operationRegistry: Record<string, OperationDefinition> = {
  get: {
    arguments: [
      { name: 'id', type: 'String', builder: argString },
      { name: 'ignoreUnknown', type: 'Boolean', builder: argBoolean },
    ],
  },
  findPage: {
    arguments: [{ name: 'query', type: 'QueryBeanInput', builder: argQuery }],
  },
  findList: {
    arguments: [{ name: 'query', type: 'QueryBeanInput', builder: argQuery }],
  },
  findFirst: {
    arguments: [{ name: 'query', type: 'QueryBeanInput', builder: argQuery }],
  },
  update: {
    arguments: [{ name: 'data', type: 'Map', builder: argDataMap }],
  },
  save: {
    arguments: [{ name: 'data', type: 'Map', builder: argDataMap }],
  },
  saveOrUpdate: {
    arguments: [{ name: 'data', type: 'Map', builder: argDataMap }],
  },
  upsert: {
    arguments: [{ name: 'data', type: 'Map', builder: argDataMap }],
  },
  copyForNew: {
    arguments: [{ name: 'data', type: 'Map', builder: argDataMap }],
  },
  delete: {
    arguments: [{ name: 'id', type: 'String', builder: argString }],
  },
  batchGet: {
    arguments: [{ name: 'ids', type: '[String]', builder: argStringList }],
  },
  batchDelete: {
    arguments: [{ name: 'ids', type: '[String]', builder: argStringList }],
  },
  batchModify: {
    arguments: [
      { name: 'data', type: '[Map]', builder: argMapList },
      { name: 'delIds', type: '[String]', builder: argStringList },
    ],
  },
};

export function getOperationName(action: string) {
  const lastSeparatorIndex = action.lastIndexOf('_');
  return lastSeparatorIndex > 0 ? action.slice(lastSeparatorIndex + 1) : action;
}
