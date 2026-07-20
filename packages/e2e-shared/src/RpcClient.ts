export interface RpcRequest {
  url?: string;
  headers?: Record<string, string>;
}

export interface RpcResponse<T> {
  data: T;
  status: number;
  errors?: Array<{ message: string }>;
}

let _authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  _authToken = token;
}

export function resetAuth(): void {
  _authToken = null;
}

export async function loginRpc(
  request: RpcRequest,
  username?: string,
  password?: string,
): Promise<string> {
  const user = username ?? process.env.E2E_USER ?? 'nop';
  const pass = password ?? process.env.E2E_PASSWORD ?? '123';
  const baseUrl = request.url ?? '';

  const res = await fetch(`${baseUrl}/r/LoginApi__login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(request.headers ?? {}),
    },
    body: JSON.stringify({ username: user, password: pass }),
  });

  const body = (await res.json()) as RpcResponse<{ accessToken: string }>;
  const token = body.data.accessToken;
  _authToken = token;
  return token;
}

export async function rpc<T>(
  request: RpcRequest,
  operation: string,
  params?: Record<string, unknown>,
): Promise<RpcResponse<T>> {
  const baseUrl = request.url ?? '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(request.headers ?? {}),
  };
  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }

  const res = await fetch(`${baseUrl}/r/${operation}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params ?? {}),
  });

  return res.json() as Promise<RpcResponse<T>>;
}

export class RpcClient {
  static loginRpc = loginRpc;
  static rpc = rpc;
  static resetAuth = resetAuth;
  static setAuthToken = setAuthToken;
}
