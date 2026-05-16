function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toArray(value: unknown, delimiter?: string) {
  if (typeof value === 'string') {
    return value.split(delimiter || ',');
  }

  return value;
}

export function mergeFilter(filterA: unknown, filterB: unknown) {
  if (!filterA) {
    return filterB;
  }

  if (!filterB) {
    return filterA;
  }

  return {
    $type: 'and',
    $body: [filterA, filterB],
  };
}

export function toOrderBy(value: unknown, orderDir: unknown) {
  if (value == null) {
    return undefined;
  }

  if (typeof value === 'string') {
    if (!value) {
      return undefined;
    }

    const fieldName = value.endsWith('_label') ? value.slice(0, -'_label'.length) : value;
    return [{ name: fieldName, desc: orderDir === 'desc' }];
  }

  if (isArray(value)) {
    return value;
  }

  return [value];
}

export function toFilter(
  data: Record<string, unknown>,
  options: import('../types').AmisRequestOptions,
) {
  const filterBody: Array<Record<string, unknown>> = [];

  for (const [key, rawValue] of Object.entries(data)) {
    if (!key.startsWith('filter_')) {
      continue;
    }

    let name = key.slice('filter_'.length);
    let operation = 'eq';
    const operationIndex = name.lastIndexOf('__');

    if (operationIndex > 0) {
      operation = name.slice(operationIndex + 2);
      name = name.slice(0, operationIndex);
    }

    if (rawValue == null || rawValue === '') {
      continue;
    }

    let value: unknown = rawValue;

    if (value === '__empty') {
      value = '';
    } else if (value === '__null') {
      value = null;
    }

    let min: unknown;
    let max: unknown;

    if (operation.startsWith('between') && value != null) {
      const range = toArray(value);
      min = isArray(range) ? range[0] : undefined;
      max = isArray(range) ? range[1] : undefined;
      value = undefined;
    }

    filterBody.push({
      $type: operation,
      name,
      value,
      min,
      max,
    });
  }

  if (isPlainObject(options.filter)) {
    const extraFilterType = options.filter.$type;

    if (extraFilterType === 'and' || extraFilterType === '_' || extraFilterType === 'filter') {
      const extraBody = isArray(options.filter.$body) ? options.filter.$body : [];
      filterBody.push(...extraBody.filter(isPlainObject));
    } else {
      filterBody.push(options.filter);
    }
  }

  if (filterBody.length === 0) {
    return undefined;
  }

  return {
    $type: 'and',
    $body: filterBody,
  };
}
