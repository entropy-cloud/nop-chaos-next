export function cleanupXProps(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(cleanupXProps);
  }
  if (typeof node === 'object' && node !== null) {
    const obj = node as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      if (key.startsWith('x:')) continue;
      result[key] = cleanupXProps(obj[key]);
    }
    return result;
  }
  return node;
}
