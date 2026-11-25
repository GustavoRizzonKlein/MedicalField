import { DatabaseSync } from 'node:sqlite';
import type {
  EncounterItem,
  MedicationItem,
  OutboxItem,
  PatientItem,
  SyncStatus,
} from '../shared/contract';
import type { MergeStrategy } from './merge';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS setting (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS medication (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  unit         TEXT NOT NULL,
  maximum_dose REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS person (
  id              TEXT PRIMARY KEY,
  full_name       TEXT NOT NULL,
  birth_date      TEXT,
  sex             TEXT,
  document_number TEXT,
  phone           TEXT,
  email           TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  sync_status     TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS medical_record (
  id                     TEXT PRIMARY KEY,
  person_id              TEXT NOT NULL UNIQUE REFERENCES person (id),
  blood_type             TEXT,
  allergies              TEXT,
  chronic_conditions     TEXT,
  continuous_medications TEXT,
  notes                  TEXT,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL,
  sync_status            TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS encounter (
  id                  TEXT PRIMARY KEY,
  medical_record_id   TEXT NOT NULL REFERENCES medical_record (id),
  occurred_at         TEXT NOT NULL,
  chief_complaint     TEXT NOT NULL,
  manchester_priority TEXT NOT NULL,
  glasgow_total       INTEGER NOT NULL,
  professional_name   TEXT,
  payload             TEXT NOT NULL,
  sync_status         TEXT NOT NULL
);
-- Outbox: operations waiting to be sent, in creation order (seq).
CREATE TABLE IF NOT EXISTS outbox (
  seq          INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_id TEXT NOT NULL UNIQUE,
  type         TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  label        TEXT NOT NULL,
  payload      TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'PENDING',
  last_error   TEXT
);
-- Local action log, sent to the server with POST /logs when online.
CREATE TABLE IF NOT EXISTS client_log (
  id          TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  level       TEXT NOT NULL,
  action      TEXT NOT NULL,
  details     TEXT,
  sent        INTEGER NOT NULL DEFAULT 0
);
`;

type Row = Record<string, unknown>;
const str = (value: unknown) => (value === null || value === undefined ? null : String(value));

export interface OutboxRow {
  operationId: string;
  type: string;
  entityId: string;
  payload: unknown;
}

export interface ClientLogRow {
  id: string;
  occurredAt: string;
  level: string;
  action: string;
  details: string | null;
}

/**
 * Repository Pattern: everything stored on the device goes through this class.
 * The screens and the sync logic never write SQL themselves.
 */
export class LocalRepository {
  private db: DatabaseSync;

  constructor(path: string, private mergeStrategy: MergeStrategy) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    this.db.exec(SCHEMA);
  }

  close(): void {
    this.db.close();
  }

  transaction<T>(work: () => T): T {
    this.db.exec('BEGIN');
    try {
      const result = work();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  // --- settings (session, device id, server URLs) ---

  getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM setting WHERE key = ?').get(key) as Row | undefined;
    return row ? String(row.value) : null;
  }

  setSetting(key: string, value: string | null): void {
    if (value === null) {
      this.db.prepare('DELETE FROM setting WHERE key = ?').run(key);
    } else {
      this.db.prepare('INSERT INTO setting (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
    }
  }

  // --- data received from the server (pull) ---

  replaceMedications(medications: MedicationItem[]): void {
    this.db.exec('DELETE FROM medication');
    const insert = this.db.prepare('INSERT INTO medication (id, name, unit, maximum_dose) VALUES (?, ?, ?, ?)');
    // Inactive medications (deleted in the Portal) are not offered for new encounters.
    for (const medication of medications.filter((item) => item.active !== false)) {
      insert.run(medication.id, medication.name, medication.unit, Number(medication.maximumDose));
    }
  }

  /** Returns true when the server version was stored. */
  mergePerson(person: Row): boolean {
    if (!this.mergeStrategy.shouldReplaceLocal(this.syncStatusOf('person', String(person.id)))) return false;
    this.db
      .prepare(
        `INSERT INTO person (id, full_name, birth_date, sex, document_number, phone, email, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED')
         ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name, birth_date = excluded.birth_date, sex = excluded.sex,
           document_number = excluded.document_number, phone = excluded.phone, email = excluded.email,
           updated_at = excluded.updated_at, sync_status = 'SYNCED'`,
      )
      .run(
        String(person.id), String(person.fullName), str(person.birthDate), str(person.sex), str(person.documentNumber),
        str(person.phone), str(person.email), String(person.createdAt), String(person.updatedAt),
      );
    return true;
  }

  mergeMedicalRecord(record: Row): boolean {
    if (!this.mergeStrategy.shouldReplaceLocal(this.syncStatusOf('medical_record', String(record.id)))) return false;
    this.db
      .prepare(
        `INSERT INTO medical_record (id, person_id, blood_type, allergies, chronic_conditions, continuous_medications, notes, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED')
         ON CONFLICT(id) DO UPDATE SET blood_type = excluded.blood_type, allergies = excluded.allergies,
           chronic_conditions = excluded.chronic_conditions, continuous_medications = excluded.continuous_medications,
           notes = excluded.notes, updated_at = excluded.updated_at, sync_status = 'SYNCED'`,
      )
      .run(
        String(record.id), String(record.personId), str(record.bloodType), str(record.allergies), str(record.chronicConditions),
        str(record.continuousMedications), str(record.notes), String(record.createdAt), String(record.updatedAt),
      );
    return true;
  }

  mergeEncounter(encounter: Row): boolean {
    if (!this.mergeStrategy.shouldReplaceLocal(this.syncStatusOf('encounter', String(encounter.id)))) return false;
    this.db
      .prepare(
        `INSERT INTO encounter (id, medical_record_id, occurred_at, chief_complaint, manchester_priority, glasgow_total, professional_name, payload, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED')
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, professional_name = excluded.professional_name, sync_status = 'SYNCED'`,
      )
      .run(
        String(encounter.id), String(encounter.medicalRecordId), String(encounter.occurredAt), String(encounter.chiefComplaint),
        String(encounter.manchesterPriority), Number(encounter.glasgowTotal), str(encounter.professionalName), JSON.stringify(encounter),
      );
    return true;
  }

  private syncStatusOf(table: 'person' | 'medical_record' | 'encounter', id: string) {
    const row = this.db.prepare(`SELECT sync_status FROM ${table} WHERE id = ?`).get(id) as Row | undefined;
    return row ? { syncStatus: row.sync_status as SyncStatus } : undefined;
  }

  // --- data created on this device (always PENDING until the server confirms) ---

  insertPerson(person: Row): void {
    this.db
      .prepare(
        `INSERT INTO person (id, full_name, birth_date, sex, document_number, phone, email, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      )
      .run(
        String(person.id), String(person.fullName), str(person.birthDate), str(person.sex), str(person.documentNumber),
        str(person.phone), str(person.email), String(person.createdAt), String(person.updatedAt),
      );
  }

  insertMedicalRecord(record: Row): void {
    this.db
      .prepare(
        `INSERT INTO medical_record (id, person_id, blood_type, allergies, chronic_conditions, continuous_medications, notes, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      )
      .run(
        String(record.id), String(record.personId), str(record.bloodType), str(record.allergies), str(record.chronicConditions),
        str(record.continuousMedications), str(record.notes), String(record.createdAt), String(record.updatedAt),
      );
  }

  insertEncounter(encounter: Row, glasgowTotal: number, professionalName: string): void {
    this.db
      .prepare(
        `INSERT INTO encounter (id, medical_record_id, occurred_at, chief_complaint, manchester_priority, glasgow_total, professional_name, payload, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      )
      .run(
        String(encounter.id), String(encounter.medicalRecordId), String(encounter.occurredAt), String(encounter.chiefComplaint),
        String(encounter.manchesterPriority), glasgowTotal, professionalName, JSON.stringify(encounter),
      );
  }

  markSynced(type: string, entityId: string): void {
    const table = { PERSON_UPSERT: 'person', MEDICAL_RECORD_UPSERT: 'medical_record', ENCOUNTER_CREATE: 'encounter' }[type];
    if (table) {
      this.db.prepare(`UPDATE ${table} SET sync_status = 'SYNCED' WHERE id = ?`).run(entityId);
    }
  }

  // --- Outbox ---

  /** Stores a sync operation; its id travels with it so the server can detect resends. */
  enqueue(operationId: string, type: string, entityId: string, label: string, payload: Record<string, unknown>): void {
    this.db
      .prepare('INSERT INTO outbox (operation_id, type, entity_id, label, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(operationId, type, entityId, label, JSON.stringify({ ...payload, operationId, type }), new Date().toISOString());
  }

  /** Failed operations are retried too: the cause may have been fixed (for example a missing parent). */
  outboxOperations(): OutboxRow[] {
    const rows = this.db.prepare('SELECT operation_id, type, entity_id, payload FROM outbox ORDER BY seq').all() as Row[];
    return rows.map((row) => ({
      operationId: String(row.operation_id),
      type: String(row.type),
      entityId: String(row.entity_id),
      payload: JSON.parse(String(row.payload)),
    }));
  }

  removeFromOutbox(operationId: string): void {
    this.db.prepare('DELETE FROM outbox WHERE operation_id = ?').run(operationId);
  }

  markOutboxFailed(operationId: string, error: string): void {
    this.db
      .prepare("UPDATE outbox SET status = 'FAILED', attempts = attempts + 1, last_error = ? WHERE operation_id = ?")
      .run(error, operationId);
  }

  listOutbox(): OutboxItem[] {
    const rows = this.db.prepare('SELECT * FROM outbox ORDER BY seq').all() as Row[];
    return rows.map((row) => ({
      operationId: String(row.operation_id),
      type: String(row.type),
      entityId: String(row.entity_id),
      label: String(row.label),
      createdAt: String(row.created_at),
      attempts: Number(row.attempts),
      status: row.status as OutboxItem['status'],
      lastError: str(row.last_error),
    }));
  }

  countOutbox(): { pending: number; failed: number } {
    const row = this.db
      .prepare("SELECT SUM(status = 'PENDING') AS pending, SUM(status = 'FAILED') AS failed FROM outbox")
      .get() as Row;
    return { pending: Number(row.pending ?? 0), failed: Number(row.failed ?? 0) };
  }

  // --- client log ---

  addLog(entry: ClientLogRow): void {
    this.db
      .prepare('INSERT INTO client_log (id, occurred_at, level, action, details) VALUES (?, ?, ?, ?, ?)')
      .run(entry.id, entry.occurredAt, entry.level, entry.action, entry.details);
  }

  unsentLogs(): ClientLogRow[] {
    const rows = this.db.prepare('SELECT * FROM client_log WHERE sent = 0 ORDER BY occurred_at LIMIT 500').all() as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      occurredAt: String(row.occurred_at),
      level: String(row.level),
      action: String(row.action),
      details: str(row.details),
    }));
  }

  markLogsSent(ids: string[]): void {
    const update = this.db.prepare('UPDATE client_log SET sent = 1 WHERE id = ?');
    for (const id of ids) update.run(id);
  }

  countUnsentLogs(): number {
    return Number((this.db.prepare('SELECT COUNT(*) AS total FROM client_log WHERE sent = 0').get() as Row).total);
  }

  // --- queries for the screens ---

  listMedications(): MedicationItem[] {
    const rows = this.db.prepare('SELECT * FROM medication ORDER BY name').all() as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      unit: String(row.unit),
      maximumDose: Number(row.maximum_dose),
    }));
  }

  getMedication(id: string): MedicationItem | null {
    return this.listMedications().find((medication) => medication.id === id) ?? null;
  }

  listPatients(): PatientItem[] {
    const rows = this.db
      .prepare(
        `SELECT p.*, r.id AS record_id, r.blood_type, r.allergies, r.chronic_conditions, r.continuous_medications,
                CASE WHEN p.sync_status = 'PENDING' OR r.sync_status = 'PENDING' THEN 'PENDING' ELSE 'SYNCED' END AS status
           FROM person p LEFT JOIN medical_record r ON r.person_id = p.id
          ORDER BY p.full_name`,
      )
      .all() as Row[];
    return rows.map((row) => ({
      personId: String(row.id),
      fullName: String(row.full_name),
      birthDate: str(row.birth_date),
      sex: str(row.sex),
      documentNumber: str(row.document_number),
      phone: str(row.phone),
      email: str(row.email),
      medicalRecordId: str(row.record_id),
      bloodType: str(row.blood_type),
      allergies: str(row.allergies),
      chronicConditions: str(row.chronic_conditions),
      continuousMedications: str(row.continuous_medications),
      syncStatus: row.status as SyncStatus,
    }));
  }

  getPatient(personId: string): PatientItem | null {
    return this.listPatients().find((patient) => patient.personId === personId) ?? null;
  }

  listEncounters(): EncounterItem[] {
    const rows = this.db
      .prepare(
        `SELECT e.*, p.full_name AS person_name
           FROM encounter e
           LEFT JOIN medical_record r ON r.id = e.medical_record_id
           LEFT JOIN person p ON p.id = r.person_id
          ORDER BY e.occurred_at DESC`,
      )
      .all() as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      personName: str(row.person_name),
      occurredAt: String(row.occurred_at),
      chiefComplaint: String(row.chief_complaint),
      manchesterPriority: String(row.manchester_priority),
      glasgowTotal: Number(row.glasgow_total),
      professionalName: str(row.professional_name),
      syncStatus: row.sync_status as SyncStatus,
    }));
  }
}
