import { randomUUID } from 'node:crypto';
import type { LocalRepository } from './database';

/**
 * Records what the professional does on the device, online or offline.
 * Entries stay in SQLite until the next sync sends them with POST /logs.
 */
export class ClientLogger {
  constructor(private repository: LocalRepository) {}

  info(action: string, details?: string) {
    this.write('INFO', action, details);
  }

  warn(action: string, details?: string) {
    this.write('WARN', action, details);
  }

  private write(level: string, action: string, details?: string) {
    this.repository.addLog({
      id: randomUUID(),
      occurredAt: new Date().toISOString(),
      level,
      action,
      details: details ?? null,
    });
  }
}
