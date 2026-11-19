// Exercises the client's offline-first logic (no UI) against the running services:
// pull -> register offline -> nothing on the server -> go online -> Outbox flushed automatically.
// Usage: npm run build (in client/), then: node test/offline-flow.test.cjs
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { LocalRepository } = require('../dist-electron/electron/database');
const { ClientLogger } = require('../dist-electron/electron/logger');
const { KeepPendingLocalChanges } = require('../dist-electron/electron/merge');
const { NetworkMonitor } = require('../dist-electron/electron/network');
const { registerOccurrence, ValidationError } = require('../dist-electron/electron/occurrence');
const { RemoteRepository } = require('../dist-electron/electron/remote');
const { SyncService } = require('../dist-electron/electron/sync');

const config = {
  identityUrl: process.env.IDENTITY_URL ?? 'http://localhost:8081',
  clinicalUrl: process.env.CLINICAL_URL ?? 'http://localhost:8080',
};
const USER = process.env.SMOKE_USER ?? 'SOC-0001';
const PASSWORD = process.env.SEED_PASSWORD ?? 'MedicalField@2026';

let failures = 0;
function check(name, condition, detail = '') {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${condition || !detail ? '' : `  -> ${detail}`}`);
  if (!condition) failures++;
}

async function serverEncounters(token) {
  const response = await fetch(`${config.clinicalUrl}/encounters`, { headers: { Authorization: `Bearer ${token}` } });
  return response.json();
}

(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'medicalfield-client-'));
  const local = new LocalRepository(join(dir, 'test.db'), new KeepPendingLocalChanges());
  const logger = new ClientLogger(local);
  const network = new NetworkMonitor(true);
  let token = null;
  const remote = new RemoteRepository(network, () => config, () => token);
  const messages = [];
  const sync = new SyncService(local, remote, network, logger, () => 'test-device', (message) => messages.push(message));

  // Login and pull (test script steps 5 and 6)
  const login = await remote.login(USER, PASSWORD);
  token = login.token;
  const professional = login.professional;
  check('login works through the client repository', typeof token === 'string');
  const pulled = await sync.pull();
  check('pull stores medications locally', pulled.ok && local.listMedications().length > 0, pulled.message);

  const medication = local.listMedications().find((item) => item.name.startsWith('Dipyrone'));

  // Clinical safety offline: overdose is blocked before anything is saved
  network.setOnline(false);
  let blocked = false;
  try {
    registerOccurrence(
      { newPerson: { fullName: 'Overdose Test' }, encounter: baseEncounter([{ medicationId: medication.id, dose: 5000 }]) },
      professional, local, logger,
    );
  } catch (error) {
    blocked = error instanceof ValidationError && /acima do máximo/.test(error.message);
  }
  check('dose above maximum is blocked offline', blocked);
  check('blocked occurrence left nothing in the Outbox', local.countOutbox().pending === 0);

  // Offline registration (step 12): person + medical record + encounter
  const result = registerOccurrence(
    {
      newPerson: { fullName: 'Offline Patient', sex: 'Masculino' },
      medicalRecord: { bloodType: 'O-', allergies: 'Latex' },
      encounter: baseEncounter([{ medicationId: medication.id, dose: 500, route: 'IV' }]),
    },
    professional, local, logger,
  );
  check('offline occurrence is saved on the device', result.ok, result.message);
  check('Outbox holds 3 operations (person, record, encounter)', local.countOutbox().pending === 3, JSON.stringify(local.countOutbox()));
  const offlineEncounter = local.listEncounters().find((item) => item.personName === 'Offline Patient');
  check('local encounter is PENDING', offlineEncounter?.syncStatus === 'PENDING');

  // Server does not have it yet (step 13)
  const pushWhileOffline = await sync.push();
  check('push while offline sends nothing', !pushWhileOffline.ok && local.countOutbox().pending === 3, pushWhileOffline.message);
  check('server does not show the offline encounter', !(await serverEncounters(token)).some((item) => item.id === offlineEncounter.id));

  // Back online (step 14): the Observer flushes the Outbox automatically
  network.setOnline(true);
  for (let i = 0; i < 50 && (local.countOutbox().pending > 0 || sync.isRunning()); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  check('Outbox emptied automatically when back online', local.countOutbox().pending === 0, JSON.stringify(local.listOutbox()));
  check('local encounter is SYNCED', local.listEncounters().find((item) => item.id === offlineEncounter.id)?.syncStatus === 'SYNCED');
  check('server shows the encounter (step 15)', (await serverEncounters(token)).some((item) => item.id === offlineEncounter.id));
  check('offline logs were sent', local.countUnsentLogs() === 0, String(local.countUnsentLogs()));

  local.close();
  rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
})();

function baseEncounter(medications) {
  return {
    occurredAt: new Date().toISOString(),
    location: 'Rodovia RS-130',
    chiefComplaint: 'Trauma em membro inferior',
    heartRate: 98,
    oxygenSaturation: 97,
    glasgowEye: 4,
    glasgowVerbal: 5,
    glasgowMotor: 6,
    manchesterPriority: 'YELLOW',
    startCategory: 'YELLOW',
    medications,
  };
}
