import { randomUUID } from 'node:crypto';
import type { ActionResult, OccurrenceInput, ProfessionalInfo } from '../shared/contract';
import type { LocalRepository } from './database';
import type { ClientLogger } from './logger';

const MANCHESTER = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE'];
const START = ['RED', 'YELLOW', 'GREEN', 'BLACK'];

export class ValidationError extends Error {}

function blank(value: string | undefined | null) {
  return value === undefined || value === null || value.trim() === '' ? null : value.trim();
}

function inRange(value: number | undefined, min: number, max: number, label: string, required = false) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    if (required) throw new ValidationError(`${label} é obrigatório.`);
    return;
  }
  if (value < min || value > max) throw new ValidationError(`${label} deve estar entre ${min} e ${max}.`);
}

/**
 * Registers an occurrence on the device: person (if new), medical record (if missing) and
 * encounter, plus one Outbox command for each. Everything happens in one SQLite transaction,
 * so an occurrence is never half saved. Works the same way online and offline.
 */
export function registerOccurrence(
  input: OccurrenceInput,
  professional: ProfessionalInfo,
  repository: LocalRepository,
  logger: ClientLogger,
): ActionResult {
  const now = new Date().toISOString();
  const encounter = input.encounter;

  // Clinical safety rules, checked offline (the server checks them again).
  if (!blank(encounter.chiefComplaint)) throw new ValidationError('Informe a queixa principal.');
  if (!encounter.occurredAt || Number.isNaN(Date.parse(encounter.occurredAt))) throw new ValidationError('Data/hora inválida.');
  inRange(encounter.glasgowEye, 1, 4, 'Glasgow - abertura ocular', true);
  inRange(encounter.glasgowVerbal, 1, 5, 'Glasgow - resposta verbal', true);
  inRange(encounter.glasgowMotor, 1, 6, 'Glasgow - resposta motora', true);
  if (!MANCHESTER.includes(encounter.manchesterPriority)) throw new ValidationError('Selecione a classificação de Manchester.');
  if (encounter.startCategory && !START.includes(encounter.startCategory)) throw new ValidationError('Categoria START inválida.');
  inRange(encounter.oxygenSaturation, 0, 100, 'Saturação de O2');
  inRange(encounter.heartRate, 0, 300, 'Frequência cardíaca');
  inRange(encounter.respiratoryRate, 0, 100, 'Frequência respiratória');
  inRange(encounter.systolicBp, 0, 300, 'Pressão sistólica');
  inRange(encounter.diastolicBp, 0, 200, 'Pressão diastólica');

  for (const item of encounter.medications) {
    const medication = repository.getMedication(item.medicationId);
    if (!medication) throw new ValidationError('Medicamento não encontrado. Sincronize os dados do Portal.');
    if (!(item.dose > 0)) throw new ValidationError(`Informe a dose de ${medication.name}.`);
    if (item.dose > medication.maximumDose) {
      logger.warn('DOSE_BLOCKED', `${medication.name}: ${item.dose} ${medication.unit} > ${medication.maximumDose}`);
      throw new ValidationError(
        `Dose de ${medication.name} (${item.dose} ${medication.unit}) acima do máximo permitido (${medication.maximumDose} ${medication.unit}).`,
      );
    }
  }

  return repository.transaction(() => {
    let personId = input.existingPersonId ?? null;
    let personName: string;

    if (personId) {
      const patient = repository.getPatient(personId);
      if (!patient) throw new ValidationError('Paciente não encontrado.');
      personName = patient.fullName;
    } else {
      const fullName = blank(input.newPerson?.fullName);
      if (!fullName) throw new ValidationError('Informe o nome do paciente (ou "Desconhecido").');
      personId = randomUUID();
      personName = fullName;
      const person = {
        id: personId,
        fullName,
        birthDate: blank(input.newPerson?.birthDate),
        sex: blank(input.newPerson?.sex),
        documentNumber: blank(input.newPerson?.documentNumber),
        phone: blank(input.newPerson?.phone),
        email: blank(input.newPerson?.email),
        createdAt: now,
        updatedAt: now,
      };
      repository.insertPerson(person);
      repository.enqueue(randomUUID(), 'PERSON_UPSERT', personId, `Pessoa: ${fullName}`, { person });
    }

    let medicalRecordId = repository.getPatient(personId)?.medicalRecordId ?? null;
    if (!medicalRecordId) {
      medicalRecordId = randomUUID();
      const record = {
        id: medicalRecordId,
        personId,
        bloodType: blank(input.medicalRecord?.bloodType),
        allergies: blank(input.medicalRecord?.allergies),
        chronicConditions: blank(input.medicalRecord?.chronicConditions),
        continuousMedications: blank(input.medicalRecord?.continuousMedications),
        notes: blank(input.medicalRecord?.notes),
        createdAt: now,
        updatedAt: now,
      };
      repository.insertMedicalRecord(record);
      repository.enqueue(randomUUID(), 'MEDICAL_RECORD_UPSERT', medicalRecordId, `Prontuário: ${personName}`, {
        medicalRecord: record,
      });
    }

    const encounterId = randomUUID();
    const payload = {
      id: encounterId,
      medicalRecordId,
      occurredAt: new Date(encounter.occurredAt).toISOString(),
      location: blank(encounter.location),
      chiefComplaint: encounter.chiefComplaint.trim(),
      systolicBp: encounter.systolicBp ?? null,
      diastolicBp: encounter.diastolicBp ?? null,
      heartRate: encounter.heartRate ?? null,
      respiratoryRate: encounter.respiratoryRate ?? null,
      oxygenSaturation: encounter.oxygenSaturation ?? null,
      temperature: encounter.temperature ?? null,
      bloodGlucose: encounter.bloodGlucose ?? null,
      glasgowEye: encounter.glasgowEye,
      glasgowVerbal: encounter.glasgowVerbal,
      glasgowMotor: encounter.glasgowMotor,
      manchesterPriority: encounter.manchesterPriority,
      startCategory: blank(encounter.startCategory),
      procedures: blank(encounter.procedures),
      notes: blank(encounter.notes),
      destination: blank(encounter.destination),
      createdAt: now,
      medications: encounter.medications.map((item) => ({
        id: randomUUID(),
        medicationId: item.medicationId,
        dose: item.dose,
        route: blank(item.route),
        administeredAt: new Date(encounter.occurredAt).toISOString(),
      })),
    };
    const glasgowTotal = encounter.glasgowEye + encounter.glasgowVerbal + encounter.glasgowMotor;
    repository.insertEncounter(payload, glasgowTotal, professional.fullName);
    repository.enqueue(randomUUID(), 'ENCOUNTER_CREATE', encounterId, `Atendimento: ${personName}`, { encounter: payload });

    logger.info('OCCURRENCE_REGISTERED', `encounter=${encounterId} patient=${personName}`);
    return { ok: true, message: `Ocorrência de ${personName} registrada no dispositivo.` };
  });
}
