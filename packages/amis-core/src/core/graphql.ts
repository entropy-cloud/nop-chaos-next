import type { AmisRequestOptions } from '../types';
import { splitPrefixUrl } from './url';
import {
  buildGraphQLQuery,
  buildGraphQLVariables,
  getOperationName,
  guessDefinition,
  guessExtArgDefinitions,
  normalizePickerLoadOptions,
  operationRegistry,
} from './graphqlArgs';

type OperationType = 'query' | 'mutation' | 'subscription';

export interface GraphQLTransformResult {
  request: AmisRequestOptions;
  operationName?: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isGraphQLEndpoint(url: string) {
  return url.endsWith('/graphql') || url.includes('/graphql?');
}

function splitGraphQLData(data: Record<string, unknown>) {
  const body: Record<string, unknown> = {};
  const params: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('__')) {
      continue;
    }

    if (key.startsWith('@') || key.startsWith('_')) {
      params[key] = value;
      continue;
    }

    body[key] = value;
  }

  return { body, params };
}

function filterSpecialData(data: Record<string, unknown>) {
  const nextData: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('__')) {
      continue;
    }

    nextData[key] = value;
  }

  return nextData;
}

function normalizeGraphQLData(request: AmisRequestOptions) {
  const body = isPlainObject(request.data) ? request.data : {};
  const query = isPlainObject(request.query) ? request.query : {};
  const { body: normalizedQueryBody, params } = splitGraphQLData(query);

  const nextBody: Record<string, unknown> = {
    ...filterSpecialData(body),
    ...normalizedQueryBody,
  };

  return {
    data: nextBody,
    query: params,
  };
}

export function transformGraphQLRequest(
  request: AmisRequestOptions,
  graphqlUrl = '/graphql',
): GraphQLTransformResult | null {
  const prefix = splitPrefixUrl(request.url);

  if (
    prefix &&
    (prefix[0] === 'query' ||
      prefix[0] === 'mutation' ||
      prefix[0] === 'subscription' ||
      prefix[0] === 'graphql')
  ) {
    const operationType = (prefix[0] === 'graphql' ? 'query' : prefix[0]) as OperationType;
    let path = prefix[1];
    const queryStartIndex = path.indexOf('?');

    if (queryStartIndex >= 0) {
      path = path.slice(0, queryStartIndex);
    }

    const selectionStartIndex = path.indexOf('/');
    const action = selectionStartIndex >= 0 ? path.slice(0, selectionStartIndex) : path;
    const normalized = normalizeGraphQLData(request);
    const operationName = getOperationName(action);
    const pickerLoadOptions = normalizePickerLoadOptions(normalized.data, request, operationName);
    const selection =
      selectionStartIndex >= 0
        ? decodeURIComponent(path.slice(selectionStartIndex + 1))
        : pickerLoadOptions.selection;
    const operationDefinition =
      operationRegistry[operationName] || guessDefinition(normalized.data);
    const args = [
      ...operationDefinition.arguments,
      ...guessExtArgDefinitions(pickerLoadOptions.data),
    ];

    return {
      operationName: action,
      request: {
        ...request,
        method: 'post',
        url: graphqlUrl,
        query: normalized.query,
        data: {
          query: buildGraphQLQuery(operationType, action, selection, args),
          variables: buildGraphQLVariables(pickerLoadOptions.data, args, request),
        },
      },
    };
  }

  if (isGraphQLEndpoint(request.url)) {
    const normalized = normalizeGraphQLData(request);
    return {
      request: {
        ...request,
        method: 'post',
        query: normalized.query,
        data: normalized.data,
      },
    };
  }

  return null;
}

export function normalizeGraphQLResponse(data: unknown, operationName?: string) {
  if (!isPlainObject(data)) {
    return data;
  }

  const normalized = { ...data };
  const errors = isArray(normalized.errors) ? normalized.errors : [];
  const extensions = isPlainObject(normalized.extensions) ? normalized.extensions : {};

  if (errors.length > 0) {
    const firstError = errors[0];
    normalized.status = Number(extensions['nop-status'] ?? -1);
    normalized.msg =
      isPlainObject(firstError) && typeof firstError.message === 'string'
        ? firstError.message
        : 'GraphQL request failed';
  } else {
    normalized.status = 0;
    normalized.msg = typeof extensions['nop-msg'] === 'string' ? extensions['nop-msg'] : '';
  }

  if (operationName && isPlainObject(normalized.data)) {
    normalized.data = normalized.data[operationName];
  }

  return normalized;
}
