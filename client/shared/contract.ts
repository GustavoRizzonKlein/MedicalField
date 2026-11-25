// Types shared by the Electron main process and the React screens.
// The screens never talk HTTP or SQL: they call window.medicalField (see preload.ts).

export type SyncStatus = 'SYNCED' | 'PENDING';

export interface ProfessionalInfo {
  id: string;
  fullName: string;
  registryType: string;
  registryNumber: string;
  role: 'ADMIN' | 'RESPONDER';
}

export interface ClientConfig {
  identityUrl: string;
  clinicalUrl: string;
}

export interface AppState {
  online: boolean;
  professional: ProfessionalInfo | null;
  deviceId: string;
  pendingCount: number;
  failedCount: number;
  unsentLogs: number;
  lastPullAt: string | null;
  lastPushAt: string | null;
  syncing: boolean;
  lastMessage: string | null;
}

export interface MedicationItem {
  id: string;
  name: string;
  unit: string;
  maximumDose: number;
  /** Sent by the server; false when the medication was deleted in the Portal. */
  active?: boolean;
}

export interface PatientItem {
  personId: string;
  fullName: string;
  birthDate: string | null;
  sex: string | null;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
  medicalRecordId: string | null;
  bloodType: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  continuousMedications: string | null;
  syncStatus: SyncStatus;
}

export interface EncounterItem {
  id: string;
  personName: string | null;
  occurredAt: string;
  chiefComplaint: string;
  manchesterPriority: string;
  glasgowTotal: number;
  professionalName: string | null;
  syncStatus: SyncStatus;
}

export interface OutboxItem {
  operationId: string;
  type: string;
  entityId: string;
  label: string;
  createdAt: string;
  attempts: number;
  status: 'PENDING' | 'FAILED';
  lastError: string | null;
}

export interface NewPersonInput {
  fullName: string;
  birthDate?: string;
  sex?: string;
  documentNumber?: string;
  phone?: string;
  email?: string;
}

export interface MedicalRecordInput {
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  continuousMedications?: string;
  notes?: string;
}

export interface AdministeredMedicationInput {
  medicationId: string;
  dose: number;
  route?: string;
}

export interface EncounterInput {
  occurredAt: string;
  location?: string;
  chiefComplaint: string;
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  temperature?: number;
  bloodGlucose?: number;
  glasgowEye: number;
  glasgowVerbal: number;
  glasgowMotor: number;
  manchesterPriority: string;
  startCategory?: string;
  procedures?: string;
  notes?: string;
  destination?: string;
  medications: AdministeredMedicationInput[];
}

/** One occurrence: a new or existing patient, the medical record when missing, and the encounter. */
export interface OccurrenceInput {
  existingPersonId?: string;
  newPerson?: NewPersonInput;
  medicalRecord?: MedicalRecordInput;
  encounter: EncounterInput;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface MedicalFieldApi {
  getState(): Promise<AppState>;
  getConfig(): Promise<ClientConfig>;
  setConfig(config: ClientConfig): Promise<void>;
  login(registryNumber: string, password: string): Promise<ActionResult>;
  logout(): Promise<void>;
  setOnline(online: boolean): Promise<AppState>;
  pull(): Promise<ActionResult>;
  push(): Promise<ActionResult>;
  listMedications(): Promise<MedicationItem[]>;
  listPatients(): Promise<PatientItem[]>;
  listEncounters(): Promise<EncounterItem[]>;
  listOutbox(): Promise<OutboxItem[]>;
  registerOccurrence(input: OccurrenceInput): Promise<ActionResult>;
  onStateChanged(listener: (state: AppState) => void): () => void;
}
