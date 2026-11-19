import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { BrowserWindow, app, ipcMain } from 'electron';
import type { AppState, ClientConfig, OccurrenceInput, ProfessionalInfo } from '../shared/contract';
import { LocalRepository } from './database';
import { ClientLogger } from './logger';
import { KeepPendingLocalChanges } from './merge';
import { NetworkMonitor } from './network';
import { ValidationError, registerOccurrence } from './occurrence';
import { RemoteError, RemoteRepository } from './remote';
import { SyncService } from './sync';

const DEFAULT_CONFIG: ClientConfig = {
  identityUrl: process.env.MEDICALFIELD_IDENTITY_URL ?? 'http://localhost:8081',
  clinicalUrl: process.env.MEDICALFIELD_CLINICAL_URL ?? 'http://localhost:8080',
};

let window: BrowserWindow | null = null;
let lastMessage: string | null = null;

app.whenReady().then(() => {
  // Embedded SQLite database, one file per installation (in the user's app data folder).
  const dataDir = process.env.MEDICALFIELD_DATA_DIR ?? app.getPath('userData');
  const local = new LocalRepository(join(dataDir, 'medicalfield.db'), new KeepPendingLocalChanges());
  const logger = new ClientLogger(local);
  const network = new NetworkMonitor(true);

  let deviceId = local.getSetting('deviceId');
  if (!deviceId) {
    deviceId = `device-${randomUUID().slice(0, 8)}`;
    local.setSetting('deviceId', deviceId);
  }
  const config = (): ClientConfig => ({ ...DEFAULT_CONFIG, ...JSON.parse(local.getSetting('config') ?? '{}') });
  const professional = (): ProfessionalInfo | null => JSON.parse(local.getSetting('professional') ?? 'null');

  const remote = new RemoteRepository(network, config, () => local.getSetting('token'));

  function state(): AppState {
    const outbox = local.countOutbox();
    return {
      online: network.isOnline(),
      professional: professional(),
      deviceId: deviceId!,
      pendingCount: outbox.pending,
      failedCount: outbox.failed,
      unsentLogs: local.countUnsentLogs(),
      lastPullAt: local.getSetting('lastPullAt'),
      lastPushAt: local.getSetting('lastPushAt'),
      syncing: sync.isRunning(),
      lastMessage,
    };
  }

  function broadcast(message?: string | null) {
    if (message !== undefined) lastMessage = message;
    window?.webContents.send('state-changed', state());
  }

  const sync = new SyncService(local, remote, network, logger, () => deviceId!, (message) => broadcast(message));
  network.subscribe(() => broadcast());

  ipcMain.handle('get-state', () => state());
  ipcMain.handle('get-config', () => config());
  ipcMain.handle('set-config', (_event, value: ClientConfig) => local.setSetting('config', JSON.stringify(value)));

  ipcMain.handle('login', async (_event, registryNumber: string, password: string) => {
    try {
      const response = await remote.login(registryNumber, password);
      local.setSetting('token', response.token);
      local.setSetting('professional', JSON.stringify(response.professional));
      logger.info('LOGIN', registryNumber);
      broadcast(null);
      return { ok: true, message: 'Autenticado.' };
    } catch (error) {
      const message =
        error instanceof RemoteError && error.status === 401
          ? 'Registro ou senha inválidos.'
          : error instanceof Error
            ? error.message
            : String(error);
      return { ok: false, message };
    }
  });

  ipcMain.handle('logout', () => {
    logger.info('LOGOUT');
    local.setSetting('token', null);
    local.setSetting('professional', null);
    broadcast(null);
  });

  ipcMain.handle('set-online', (_event, online: boolean) => {
    network.setOnline(online);
    return state();
  });

  ipcMain.handle('pull', async () => {
    const result = await sync.pull();
    broadcast(result.message);
    return result;
  });

  ipcMain.handle('push', async () => {
    const result = await sync.push();
    broadcast(result.message);
    return result;
  });

  ipcMain.handle('list-medications', () => local.listMedications());
  ipcMain.handle('list-patients', () => local.listPatients());
  ipcMain.handle('list-encounters', () => local.listEncounters());
  ipcMain.handle('list-outbox', () => local.listOutbox());

  ipcMain.handle('register-occurrence', async (_event, input: OccurrenceInput) => {
    const current = professional();
    if (!current) return { ok: false, message: 'Faça login primeiro.' };
    try {
      const result = registerOccurrence(input, current, local, logger);
      broadcast(result.message);
      // Online: the same Outbox is sent right away, so there is a single write path.
      if (network.isOnline()) {
        const pushed = await sync.push();
        broadcast(`${result.message} ${pushed.message}`);
        return { ok: true, message: `${result.message} ${pushed.message}` };
      }
      return { ok: true, message: `${result.message} Offline: ficará na fila até a conexão voltar.` };
    } catch (error) {
      if (error instanceof ValidationError) return { ok: false, message: error.message };
      throw error;
    }
  });

  window = new BrowserWindow({
    width: 1280,
    height: 860,
    title: 'MedicalField - Socorrista',
    webPreferences: { preload: join(__dirname, 'preload.js'), contextIsolation: true },
  });
  window.setMenuBarVisibility(false);
  void window.loadFile(join(__dirname, '..', '..', 'dist', 'index.html'));
});

app.on('window-all-closed', () => app.quit());
