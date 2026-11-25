// All requests go through the Vite proxy (/api/<service>), see vite.config.ts.
export type Service = 'identity' | 'clinical' | 'documents';

const TOKEN_KEY = 'medicalfield.portal.token';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let onUnauthorized: () => void = () => {};

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

async function request(service: Service, path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const response = await fetch(`/api/${service}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (response.status === 401 && token) {
    onUnauthorized();
  }
  if (!response.ok) {
    let message = `Erro ${response.status}`;
    try {
      const body = await response.json();
      message = body.error ?? body.message ?? message;
    } catch {
      // body was not JSON
    }
    throw new ApiError(response.status, message);
  }
  return response;
}

export async function getJson<T>(service: Service, path: string): Promise<T> {
  return (await request(service, path)).json();
}

export async function postJson<T>(service: Service, path: string, body: unknown): Promise<T> {
  return (await request(service, path, { method: 'POST', body: JSON.stringify(body) })).json();
}

export async function getBlob(service: Service, path: string): Promise<Blob> {
  return (await request(service, path)).blob();
}

export async function putJson<T>(service: Service, path: string, body: unknown): Promise<T> {
  return (await request(service, path, { method: 'PUT', body: JSON.stringify(body) })).json();
}

export async function deleteJson<T>(service: Service, path: string): Promise<T> {
  return (await request(service, path, { method: 'DELETE' })).json();
}
