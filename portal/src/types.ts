export interface Professional {
  id: string;
  fullName: string;
  registryType: string;
  registryNumber: string;
  role: 'ADMIN' | 'RESPONDER';
}

export interface Medication {
  id: string;
  name: string;
  unit: string;
  maximumDose: number;
  active: boolean;
}

export interface Person {
  id: string;
  fullName: string;
  birthDate: string | null;
  sex: string | null;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  syncedAt: string;
}

export interface MedicalRecord {
  id: string;
  personId: string;
  personName: string | null;
  bloodType: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  continuousMedications: string | null;
  notes: string | null;
  updatedAt: string;
  syncedAt: string;
}

export interface EncounterMedication {
  id: string;
  medicationId: string;
  medicationName: string | null;
  dose: number;
  unit: string | null;
  route: string | null;
  administeredAt: string;
}

export interface Encounter {
  id: string;
  medicalRecordId: string;
  personId: string | null;
  personName: string | null;
  professionalName: string;
  occurredAt: string;
  location: string | null;
  chiefComplaint: string;
  systolicBp: number | null;
  diastolicBp: number | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  temperature: number | null;
  bloodGlucose: number | null;
  glasgowEye: number;
  glasgowVerbal: number;
  glasgowMotor: number;
  glasgowTotal: number;
  manchesterPriority: string;
  startCategory: string | null;
  procedures: string | null;
  notes: string | null;
  destination: string | null;
  createdAt: string;
  syncedAt: string;
  medications: EncounterMedication[];
}
