import type { AmisRequestOptions } from '../types'
import { splitPrefixUrl } from './url'

type OperationType = 'query' | 'mutation' | 'subscription'

interface ArgumentDefinition {
  name: string
  type: string
  builder?: (data: Record<string, unknown>, arg: ArgumentDefinition, options: AmisRequestOptions) => unknown
}

interface OperationDefinition {
  arguments: ArgumentDefinition[]
}

export interface GraphQLTransformResult {
  request: AmisRequestOptions
  operationName?: string
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isGraphQLEndpoint(url: string) {
  return url.endsWith('/graphql') || url.includes('/graphql?')
}

function isSpecialVarName(name: string) {
  return name.startsWith('__') || name.startsWith('@') || name.startsWith('v_')
}

function splitGraphQLData(data: Record<string, unknown>) {
  const body: Record<string, unknown> = {}
  const params: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('__')) {
      continue
    }

    if (key.startsWith('@') || key.startsWith('_')) {
      params[key] = value
      continue
    }

    body[key] = value
  }

  return { body, params }
}

function normalizeGraphQLData(request: AmisRequestOptions) {
  const body = isPlainObject(request.data) ? request.data : {}
  const query = isPlainObject(request.query) ? request.query : {}
  const { body: normalizedQueryBody, params } = splitGraphQLData(query)

  const nextBody: Record<string, unknown> = {
    ...filterSpecialData(body),
    ...normalizedQueryBody
  }

  return {
    data: nextBody,
    query: params
  }
}

function filterSpecialData(data: Record<string, unknown>) {
  const nextData: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('__')) {
      continue
    }

    nextData[key] = value
  }

  return nextData
}

function guessType(value: unknown) {
  if (typeof value === 'string') {
    return 'String'
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'Int' : 'Float'
  }

  if (typeof value === 'boolean') {
    return 'Boolean'
  }

  if (isPlainObject(value)) {
    return 'Map'
  }

  if (isArray(value)) {
    return '[String]'
  }

  return 'String'
}

function toArray(value: unknown, delimiter?: string) {
  if (typeof value === 'string') {
    return value.split(delimiter || ',')
  }

  return value
}

function argString(data: Record<string, unknown>, arg: ArgumentDefinition) {
  const value = data[arg.name]
  return value == null ? null : String(value)
}

function argBoolean(data: Record<string, unknown>, arg: ArgumentDefinition) {
  const value = data[arg.name]

  if (value == null) {
    return null
  }

  if (value === 'false' || value === 'n' || value === '0' || value === 'N') {
    return false
  }

  return Boolean(value)
}

function argInt(data: Record<string, unknown>, arg: ArgumentDefinition) {
  const value = data[arg.name]
  return value == null ? null : parseInt(String(value), 10)
}

function argFloat(data: Record<string, unknown>, arg: ArgumentDefinition) {
  const value = data[arg.name]
  return value == null ? null : parseFloat(String(value))
}

function argMap(data: Record<string, unknown>, arg: ArgumentDefinition) {
  return data[arg.name]
}

function argStringList(data: Record<string, unknown>, arg: ArgumentDefinition) {
  const value = data[arg.name]

  if (value == null) {
    return null
  }

  return typeof value === 'string' ? value.split(',') : value
}

function argMapList(data: Record<string, unknown>, arg: ArgumentDefinition) {
  return data[arg.name]
}

function argValue(data: Record<string, unknown>, arg: ArgumentDefinition) {
  return data[arg.name]
}

function mergeFilter(filterA: unknown, filterB: unknown) {
  if (!filterA) {
    return filterB
  }

  if (!filterB) {
    return filterA
  }

  return {
    $type: 'and',
    $body: [filterA, filterB]
  }
}

function argQuery(data: Record<string, unknown>, _arg: ArgumentDefinition, options: AmisRequestOptions) {
  const sourceQuery = isPlainObject(data.query) ? data.query : {}
  const query: Record<string, unknown> = { ...sourceQuery }

  query.limit = query.limit ?? data.limit ?? data.pageSize ?? data.perPage ?? 0

  const limit = typeof query.limit === 'number' ? query.limit : Number(query.limit || 0)
  const page = typeof data.page === 'number' ? data.page : Number(data.page || 0)

  query.offset = query.offset ?? data.offset ?? (limit > 0 && page > 0 ? limit * (page - 1) : 0)
  query.orderBy = query.orderBy ?? toOrderBy(data.orderBy ?? data.orderField, data.orderDir)
  query.filter = mergeFilter(query.filter, toFilter(data, options))
  query.cursor = query.cursor ?? data.cursor
  query.timeout = query.timeout ?? data.timeout

  return query
}

function normalizePickerLoadOptions(data: Record<string, unknown>, options: AmisRequestOptions, operationName: string) {
  if (operationName !== 'findPage' || data.op !== 'loadOptions') {
    return {
      data,
      selection: options.gqlSelection
    }
  }

  const values = toArray(data.value, options.delimiter)

  return {
    data: {
      [`filter_${options.valueField || 'id'}__in`]: values
    },
    selection: `items{${options.valueField || 'id'},${options.labelField || 'id'}}`
  }
}

function toOrderBy(value: unknown, orderDir: unknown) {
  if (value == null) {
    return undefined
  }

  if (typeof value === 'string') {
    if (!value) {
      return undefined
    }

    const fieldName = value.endsWith('_label') ? value.slice(0, -'_label'.length) : value
    return [{ name: fieldName, desc: orderDir === 'desc' }]
  }

  if (isArray(value)) {
    return value
  }

  return [value]
}

function toFilter(data: Record<string, unknown>, options: AmisRequestOptions) {
  const filterBody: Array<Record<string, unknown>> = []

  for (const [key, rawValue] of Object.entries(data)) {
    if (!key.startsWith('filter_')) {
      continue
    }

    let name = key.slice('filter_'.length)
    let operation = 'eq'
    const operationIndex = name.lastIndexOf('__')

    if (operationIndex > 0) {
      operation = name.slice(operationIndex + 2)
      name = name.slice(0, operationIndex)
    }

    if (rawValue == null || rawValue === '') {
      continue
    }

    let value: unknown = rawValue

    if (value === '__empty') {
      value = ''
    } else if (value === '__null') {
      value = null
    }

    let min: unknown
    let max: unknown

    if (operation.startsWith('between') && value != null) {
      const range = toArray(value)
      min = isArray(range) ? range[0] : undefined
      max = isArray(range) ? range[1] : undefined
      value = undefined
    }

    filterBody.push({
      $type: operation,
      name,
      value,
      min,
      max
    })
  }

  if (isPlainObject(options.filter)) {
    const extraFilterType = options.filter.$type

    if (extraFilterType === 'and' || extraFilterType === '_' || extraFilterType === 'filter') {
      const extraBody = isArray(options.filter.$body) ? options.filter.$body : []
      filterBody.push(...extraBody.filter(isPlainObject))
    } else {
      filterBody.push(options.filter)
    }
  }

  if (filterBody.length === 0) {
    return undefined
  }

  return {
    $type: 'and',
    $body: filterBody
  }
}

function argDataMap(data: Record<string, unknown>) {
  const nextValue: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (isSpecialVarName(key)) {
      continue
    }

    nextValue[key] = value
  }

  return nextValue
}

const defaultArgBuilders: Record<string, ArgumentDefinition['builder']> = {
  String: argString,
  Boolean: argBoolean,
  Int: argInt,
  Float: argFloat,
  Map: argMap,
  '[String]': argStringList,
  '[Map]': argMapList,
  QueryBeanInput: argQuery
}

const operationRegistry: Record<string, OperationDefinition> = {
  get: {
    arguments: [
      { name: 'id', type: 'String', builder: argString },
      { name: 'ignoreUnknown', type: 'Boolean', builder: argBoolean }
    ]
  },
  findPage: {
    arguments: [{ name: 'query', type: 'QueryBeanInput', builder: argQuery }]
  },
  findList: {
    arguments: [{ name: 'query', type: 'QueryBeanInput', builder: argQuery }]
  },
  findFirst: {
    arguments: [{ name: 'query', type: 'QueryBeanInput', builder: argQuery }]
  },
  update: {
    arguments: [{ name: 'data', type: 'Map', builder: argDataMap }]
  },
  save: {
    arguments: [{ name: 'data', type: 'Map', builder: argDataMap }]
  },
  saveOrUpdate: {
    arguments: [{ name: 'data', type: 'Map', builder: argDataMap }]
  },
  upsert: {
    arguments: [{ name: 'data', type: 'Map', builder: argDataMap }]
  },
  copyForNew: {
    arguments: [{ name: 'data', type: 'Map', builder: argDataMap }]
  },
  delete: {
    arguments: [{ name: 'id', type: 'String', builder: argString }]
  },
  batchGet: {
    arguments: [{ name: 'ids', type: '[String]', builder: argStringList }]
  },
  batchDelete: {
    arguments: [{ name: 'ids', type: '[String]', builder: argStringList }]
  },
  batchModify: {
    arguments: [
      { name: 'data', type: '[Map]', builder: argMapList },
      { name: 'delIds', type: '[String]', builder: argStringList }
    ]
  }
}

function guessDefinition(data: Record<string, unknown>) {
  return {
    arguments: Object.entries(data)
      .filter(([key]) => !isSpecialVarName(key))
      .map(([key, value]) => ({ name: key, type: guessType(value) }))
  }
}

function guessExtArgDefinitions(data: Record<string, unknown>) {
  return Object.entries(data)
    .filter(([key]) => key.startsWith('v_'))
    .map(([key, value]) => ({ name: key, type: guessType(value) }))
}

function getOperationName(action: string) {
  const lastSeparatorIndex = action.lastIndexOf('_')
  return lastSeparatorIndex > 0 ? action.slice(lastSeparatorIndex + 1) : action
}

function buildGraphQLQuery(opType: OperationType, action: string, selection: string | undefined, args: ArgumentDefinition[]) {
  let query = `${opType} ${action}`

  if (args.length > 0) {
    query += `(${args.map((arg) => `$${arg.name}:${arg.type}`).join(',')})`
  }

  query += `{\n${action}(`

  if (args.length > 0) {
    query += args.map((arg) => `${arg.name}:$${arg.name}`).join(',')
  }

  query += ')'

  if (selection) {
    query += `{\n${selection}\n}`
  }

  query += '\n}'
  return query
}

function buildGraphQLVariables(data: Record<string, unknown>, args: ArgumentDefinition[], options: AmisRequestOptions) {
  const variables: Record<string, unknown> = {}

  for (const arg of args) {
    const builder = arg.builder || defaultArgBuilders[arg.type] || argValue
    variables[arg.name] = builder(data, arg, options)
  }

  return variables
}

export function transformGraphQLRequest(request: AmisRequestOptions, graphqlUrl = '/graphql'): GraphQLTransformResult | null {
  const prefix = splitPrefixUrl(request.url)

  if (prefix && (prefix[0] === 'query' || prefix[0] === 'mutation' || prefix[0] === 'subscription' || prefix[0] === 'graphql')) {
    const operationType = (prefix[0] === 'graphql' ? 'query' : prefix[0]) as OperationType
    let path = prefix[1]
    const queryStartIndex = path.indexOf('?')

    if (queryStartIndex >= 0) {
      path = path.slice(0, queryStartIndex)
    }

    const selectionStartIndex = path.indexOf('/')
    const action = selectionStartIndex >= 0 ? path.slice(0, selectionStartIndex) : path
    const normalized = normalizeGraphQLData(request)
    const operationName = getOperationName(action)
    const pickerLoadOptions = normalizePickerLoadOptions(normalized.data, request, operationName)
    const selection = selectionStartIndex >= 0 ? decodeURIComponent(path.slice(selectionStartIndex + 1)) : pickerLoadOptions.selection
    const operationDefinition = operationRegistry[operationName] || guessDefinition(normalized.data)
    const args = [...operationDefinition.arguments, ...guessExtArgDefinitions(pickerLoadOptions.data)]

    return {
      operationName: action,
      request: {
        ...request,
        method: 'post',
        url: graphqlUrl,
        query: normalized.query,
        data: {
          query: buildGraphQLQuery(operationType, action, selection, args),
          variables: buildGraphQLVariables(pickerLoadOptions.data, args, request)
        }
      }
    }
  }

  if (isGraphQLEndpoint(request.url)) {
    const normalized = normalizeGraphQLData(request)
    return {
      request: {
        ...request,
        method: 'post',
        query: normalized.query,
        data: normalized.data
      }
    }
  }

  return null
}

export function normalizeGraphQLResponse(data: unknown, operationName?: string) {
  if (!isPlainObject(data)) {
    return data
  }

  const normalized = { ...data }
  const errors = isArray(normalized.errors) ? normalized.errors : []
  const extensions = isPlainObject(normalized.extensions) ? normalized.extensions : {}

  if (errors.length > 0) {
    const firstError = errors[0]
    normalized.status = Number(extensions['nop-status'] ?? -1)
    normalized.msg = isPlainObject(firstError) && typeof firstError.message === 'string' ? firstError.message : 'GraphQL request failed'
  } else {
    normalized.status = 0
    normalized.msg = typeof extensions['nop-msg'] === 'string' ? extensions['nop-msg'] : ''
  }

  if (operationName && isPlainObject(normalized.data)) {
    normalized.data = normalized.data[operationName]
  }

  return normalized
}
