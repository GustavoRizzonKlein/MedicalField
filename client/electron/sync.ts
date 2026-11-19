import type { ActionResult, MedicationItem } from '../shared/contract';
import type { LocalRepository } from './database';
import type { ClientLogger } from './logger';
import type { NetworkMonitor } from './network';
import { OfflineError, RemoteError, type RemoteRepository } from './remote';

/** Outcomes that mean the server now has the data, so the entry can leave the Outbox. */
const SETTLED = new Set(['CREATED', 'UPDATED', 'DUPLICATE', 'KEPT_SERVER_VERSION']);

/**
 * Moves data between the device and the server.
 * Push sends the Outbox; each entry is a Command (operation id + type + payload) that the
 * server executes once, thanks to the operation id (idempotency).
 */
export class SyncService {
  private running = false;

  constructor(
    private local: LocalRepository,
    private remote: RemoteRepository,
    private network: NetworkMonitor,
    private logger: ClientLogger,
    private getDeviceId: () => string,
    private onChange: (message: string | null) => void,
  ) {
    // Observer: when the connection comes back, pending data is sent automatically.
    this.network.subscribe((online) => {
      this.logger.info(online ? 'NETWORK_ONLINE' : 'NETWORK_OFFLINE');
      if (online) {
        void this.push().then((result) => this.onChange(result.message));
      } else {
        this.onChange('Modo offline: os registros ficam na fila até a conexão voltar.');
      }
    });
  }

  isRunning(): boolean {
    return this.running;
  }

  /** Receives medications, persons, medical records and encounters from the server. */
  async pull(): Promise<ActionResult> {
    try {
      const data = await this.remote.pull();
      let kept = 0;
      this.local.transaction(() => {
        this.local.replaceMedications(data.medications as MedicationItem[]);
        for (const person of data.persons as Record<string, unknown>[]) if (!this.local.mergePerson(person)) kept++;
        for (const record of data.medicalRecords as Record<string, unknown>[]) if (!this.local.mergeMedicalRecord(record)) kept++;
        for (const encounter of data.encounters as Record<string, unknown>[]) if (!this.local.mergeEncounter(encounter)) kept++;
      });
      this.local.setSetting('lastPullAt', new Date().toISOString());
      const summary = `${data.medications.length} medicamentos, ${data.persons.length} pessoas, ${data.encounters.length} atendimentos`;
      this.logger.info('SYNC_PULL', summary);
      return { ok: true, message: `Dados recebidos do Portal: ${summary}.${kept ? ` ${kept} registro(s) local(is) pendente(s) mantido(s).` : ''}` };
    } catch (error) {
      return this.failure('SYNC_PULL_FAILED', error);
    }
  }

  /** Sends the Outbox in creation order, then the local logs. */
  async push(): Promise<ActionResult> {
    if (this.running) return { ok: false, message: 'Sincronização já em andamento.' };
    this.running = true;
    this.onChange(null);
    try {
      const operations = this.local.outboxOperations();
      let sent = 0;
      let rejected = 0;
      if (operations.length > 0) {
        const response = await this.remote.push(this.getDeviceId(), operations.map((operation) => operation.payload));
        const byId = new Map(operations.map((operation) => [operation.operationId, operation]));
        this.local.transaction(() => {
          for (const result of response.results) {
            const operation = byId.get(result.operationId);
            if (!operation) continue;
            if (SETTLED.has(result.outcome)) {
              this.local.removeFromOutbox(operation.operationId);
              this.local.markSynced(operation.type, operation.entityId);
              sent++;
            } else {
              this.local.markOutboxFailed(operation.operationId, result.message ?? result.outcome);
              rejected++;
            }
          }
        });
        this.logger.info('SYNC_PUSH', `${sent} enviada(s), ${rejected} rejeitada(s)`);
      }

      const logs = this.local.unsentLogs();
      if (logs.length > 0) {
        await this.remote.sendLogs(logs.map((log) => ({ ...log, deviceId: this.getDeviceId() })));
        this.local.markLogsSent(logs.map((log) => log.id));
      }

      this.local.setSetting('lastPushAt', new Date().toISOString());
      if (operations.length === 0) {
        return { ok: true, message: 'Nada pendente para enviar. Logs locais enviados.' };
      }
      return rejected === 0
        ? { ok: true, message: `${sent} operação(ões) enviada(s) ao Portal.` }
        : { ok: false, message: `${sent} enviada(s), ${rejected} rejeitada(s) pelo servidor. Veja a aba Pendências.` };
    } catch (error) {
      return this.failure('SYNC_PUSH_FAILED', error);
    } finally {
      this.running = false;
    }
  }

  private failure(action: string, error: unknown): ActionResult {
    if (error instanceof OfflineError) {
      return { ok: false, message: 'Offline: ligue a conectividade para sincronizar.' };
    }
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(action, message);
    if (error instanceof RemoteError && error.status === 401) {
      return { ok: false, message: 'Sessão expirada: saia e entre novamente para sincronizar.' };
    }
    return { ok: false, message };
  }
}
