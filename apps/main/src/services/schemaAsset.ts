export async function loadSchemaAsset<T>(schemaPath: string): Promise<T> {
  const response = await fetch(schemaPath, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load amis schema: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
