import type { ClientConfig } from '../shared/contract';
import type { NetworkMonitor } from './network';

export class OfflineError extends Error {
  constructor() {
    super('Sem conexão (simulador em modo offline)');
  }
}

export class RemoteError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Repository Pattern (remote side): the only place that talks HTTP to the services.
 * When the simulator is offline, no request leaves the device.
 */
export class RemoteRepository {
  constructor(
    private network: NetworkMonitor,
    private getConfig: () => ClientConfig,
    private getToken: () => string | null,
  ) {}

  login(registryNumber: string, password: string) {
    return this.request<{ token: string; expiresAt: string; professional: unknown }>(
      this.getConfig().identityUrl, '/auth/login', 'POST', { registryNumber, password }, false,
    );
  }

  pull() {
    return this.request<Record<string, unknown[]>>(this.getConfig().clinicalUrl, '/sync/pull', 'GET');
  }

  push(deviceId: string, operations: unknown[]) {
    return this.request<{ results: { operationId: string; entityId: string | null; outcome: string; message: string | null }[] }>(
      this.getConfig().clinicalUrl, '/sync/push', 'POST', { deviceId, operations },
    );
  }

  sendLogs(entries: unknown[]) {
    return this.request<{ received: number; accepted: number }>(this.getConfig().identityUrl, '/logs', 'POST', { entries });
  }

  private async request<T>(base: string, path: string, method: string, body?: unknown, authenticated = true): Promise<T> {
    if (!this.network.isOnline()) {
      throw new OfflineError();
    }
    const token = this.getToken();
    let response: Response;
    try {
      response = await fetch(base.replace(/\/$/, '') + path, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new RemoteError(0, `Servidor inacessível em ${base}`);
    }
    if (!response.ok) {
      let message = `Erro ${response.status}`;
      try {
        const data = await response.json();
        message = data.error ?? data.message ?? message;
      } catch {
        // body was not JSON
      }
      throw new RemoteError(response.status, message);
    }
    return response.json() as Promise<T>;
  }
}
