import {
  IconAlertTriangle,
  IconClipboardHeart,
  IconFileText,
  IconPlus,
  IconTrash,
  IconUser,
  IconWifi,
  IconWifiOff,
} from '@tabler/icons-react';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import type { MedicationItem, OccurrenceInput, PatientItem } from '../../shared/contract';
import { GLASGOW_EYE, GLASGOW_MOTOR, GLASGOW_VERBAL, MANCHESTER, ROUTES, START } from '../clinical';

interface MedicationRow {
  key: number;
  medicationId: string;
  dose: string;
  route: string;
}

function localNow() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

const EMPTY_PERSON = { fullName: '', birthDate: '', sex: '', documentNumber: '', phone: '', email: '' };
const EMPTY_RECORD = { bloodType: '', allergies: '', chronicConditions: '', continuousMedications: '' };
const EMPTY_ENCOUNTER = {
  occurredAt: localNow(),
  location: '',
  chiefComplaint: '',
  systolicBp: '',
  diastolicBp: '',
  heartRate: '',
  respiratoryRate: '',
  oxygenSaturation: '',
  temperature: '',
  bloodGlucose: '',
  glasgowEye: '4',
  glasgowVerbal: '5',
  glasgowMotor: '6',
  manchesterPriority: '',
  startCategory: '',
  procedures: '',
  destination: '',
  notes: '',
};

const number = (value: string) => (value.trim() === '' ? undefined : Number(value.replace(',', '.')));

export function NewOccurrence({ version, online }: { version: number; online: boolean }) {
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [existingId, setExistingId] = useState('');
  const [person, setPerson] = useState(EMPTY_PERSON);
  const [record, setRecord] = useState(EMPTY_RECORD);
  const [encounter, setEncounter] = useState(EMPTY_ENCOUNTER);
  const [rows, setRows] = useState<MedicationRow[]>([]);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void window.medicalField.listPatients().then(setPatients);
    void window.medicalField.listMedications().then(setMedications);
  }, [version]);

  const existing = patients.find((patient) => patient.personId === existingId) ?? null;
  const needsRecord = mode === 'new' || (existing !== null && existing.medicalRecordId === null);
  const glasgowTotal = Number(encounter.glasgowEye) + Number(encounter.glasgowVerbal) + Number(encounter.glasgowMotor);

  // Dose check shown while typing; the main process checks again before saving.
  const doseErrors = rows
    .map((row) => {
      const medication = medications.find((item) => item.id === row.medicationId);
      const dose = number(row.dose);
      if (!medication || dose === undefined) return null;
      return dose > medication.maximumDose
        ? `${medication.name}: ${dose} ${medication.unit} excede o máximo de ${medication.maximumDose} ${medication.unit}`
        : null;
    })
    .filter((error): error is string => error !== null);

  function updateRow(key: number, change: Partial<MedicationRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (doseErrors.length > 0) return;
    setBusy(true);
    setResult(null);
    const input: OccurrenceInput = {
      existingPersonId: mode === 'existing' ? existingId : undefined,
      newPerson: mode === 'new' ? person : undefined,
      medicalRecord: needsRecord ? record : undefined,
      encounter: {
        occurredAt: new Date(encounter.occurredAt).toISOString(),
        location: encounter.location,
        chiefComplaint: encounter.chiefComplaint,
        systolicBp: number(encounter.systolicBp),
        diastolicBp: number(encounter.diastolicBp),
        heartRate: number(encounter.heartRate),
        respiratoryRate: number(encounter.respiratoryRate),
        oxygenSaturation: number(encounter.oxygenSaturation),
        temperature: number(encounter.temperature),
        bloodGlucose: number(encounter.bloodGlucose),
        glasgowEye: Number(encounter.glasgowEye),
        glasgowVerbal: Number(encounter.glasgowVerbal),
        glasgowMotor: Number(encounter.glasgowMotor),
        manchesterPriority: encounter.manchesterPriority,
        startCategory: encounter.startCategory || undefined,
        procedures: encounter.procedures,
        destination: encounter.destination,
        notes: encounter.notes,
        medications: rows
          .filter((row) => row.medicationId)
          .map((row) => ({ medicationId: row.medicationId, dose: number(row.dose) ?? 0, route: row.route })),
      },
    };
    const response = await window.medicalField.registerOccurrence(input);
    setResult(response);
    if (response.ok) {
      setPerson(EMPTY_PERSON);
      setRecord(EMPTY_RECORD);
      setEncounter({ ...EMPTY_ENCOUNTER, occurredAt: localNow() });
      setRows([]);
      setExistingId('');
    }
    setBusy(false);
  }

  const field = (label: string, input: ReactNode, wide = false) => (
    <label className={wide ? 'wide' : undefined}>
      {label}
      {input}
    </label>
  );
  const personInput = (key: keyof typeof EMPTY_PERSON, type = 'text') => (
    <input type={type} value={person[key]} onChange={(event) => setPerson({ ...person, [key]: event.target.value })} />
  );
  const recordInput = (key: keyof typeof EMPTY_RECORD) => (
    <input value={record[key]} onChange={(event) => setRecord({ ...record, [key]: event.target.value })} />
  );
  const encounterInput = (key: keyof typeof EMPTY_ENCOUNTER, type = 'text', required = false) => (
    <input
      type={type}
      value={encounter[key]}
      required={required}
      onChange={(event) => setEncounter({ ...encounter, [key]: event.target.value })}
    />
  );

  return (
    <form className="occurrence" onSubmit={submit}>
      <div className={`mode-banner ${online ? 'online' : 'offline'}`}>
        {online ? <IconWifi size={19} /> : <IconWifiOff size={19} />}
        {online
          ? 'Online: a ocorrência é gravada no dispositivo e enviada ao Portal em seguida.'
          : 'Offline: a ocorrência é gravada no dispositivo e enviada quando a conexão voltar.'}
      </div>

      <section className="panel">
        <h2>
          <IconUser size={19} /> Paciente
        </h2>
        <div className="radio-row">
          <label className="inline">
            <input type="radio" checked={mode === 'new'} onChange={() => setMode('new')} /> Novo paciente
          </label>
          <label className="inline">
            <input type="radio" checked={mode === 'existing'} onChange={() => setMode('existing')} disabled={patients.length === 0} />{' '}
            Paciente já cadastrado
          </label>
        </div>
        {mode === 'new' ? (
          <div className="grid">
            {field('Nome completo (ou "Desconhecido")', personInput('fullName'), true)}
            {field('Nascimento', personInput('birthDate', 'date'))}
            {field(
              'Sexo',
              <select value={person.sex} onChange={(event) => setPerson({ ...person, sex: event.target.value })}>
                <option value="">-</option>
                <option>Feminino</option>
                <option>Masculino</option>
                <option>Outro</option>
              </select>,
            )}
            {field('Documento (CPF/RG)', personInput('documentNumber'))}
            {field('Telefone', personInput('phone'))}
            {field('E-mail (para envio da ficha)', personInput('email', 'email'))}
          </div>
        ) : (
          <>
            <select value={existingId} onChange={(event) => setExistingId(event.target.value)} required>
              <option value="">Selecione o paciente</option>
              {patients.map((patient) => (
                <option key={patient.personId} value={patient.personId}>
                  {patient.fullName}
                  {patient.birthDate ? ` (${patient.birthDate})` : ''}
                </option>
              ))}
            </select>
            {existing?.allergies && (
              <p className="alert">
                <IconAlertTriangle size={17} /> Alergias: {existing.allergies}
              </p>
            )}
          </>
        )}
      </section>

      {needsRecord && (
        <section className="panel">
          <h2>
            <IconFileText size={19} /> Prontuário
          </h2>
          <div className="grid">
            {field(
              'Tipo sanguíneo',
              <select value={record.bloodType} onChange={(event) => setRecord({ ...record, bloodType: event.target.value })}>
                <option value="">Desconhecido</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>,
            )}
            {field('Alergias', recordInput('allergies'), true)}
            {field('Condições crônicas', recordInput('chronicConditions'), true)}
            {field('Medicamentos de uso contínuo', recordInput('continuousMedications'), true)}
          </div>
        </section>
      )}

      <section className="panel">
        <h2>
          <IconClipboardHeart size={19} /> Atendimento
        </h2>
        <div className="grid">
          {field('Data/hora', encounterInput('occurredAt', 'datetime-local', true))}
          {field('Local', encounterInput('location'), true)}
          {field('Queixa principal', encounterInput('chiefComplaint', 'text', true), true)}
        </div>

        <h3>Sinais vitais</h3>
        <div className="grid compact">
          {field('PA sistólica (mmHg)', encounterInput('systolicBp', 'number'))}
          {field('PA diastólica (mmHg)', encounterInput('diastolicBp', 'number'))}
          {field('FC (bpm)', encounterInput('heartRate', 'number'))}
          {field('FR (irpm)', encounterInput('respiratoryRate', 'number'))}
          {field('SpO2 (%)', encounterInput('oxygenSaturation', 'number'))}
          {field('Temperatura (°C)', encounterInput('temperature'))}
          {field('Glicemia (mg/dL)', encounterInput('bloodGlucose', 'number'))}
        </div>

        <h3>
          Escala de Glasgow: <span className={glasgowTotal <= 8 ? 'glasgow-total error' : 'glasgow-total'}>{glasgowTotal}</span>
          {glasgowTotal <= 8 && <span className="error"> (grave)</span>}
        </h3>
        <div className="grid">
          {(
            [
              ['Abertura ocular', 'glasgowEye', GLASGOW_EYE],
              ['Resposta verbal', 'glasgowVerbal', GLASGOW_VERBAL],
              ['Resposta motora', 'glasgowMotor', GLASGOW_MOTOR],
            ] as const
          ).map(([label, key, options]) =>
            field(
              label,
              <select value={encounter[key]} onChange={(event) => setEncounter({ ...encounter, [key]: event.target.value })}>
                {options.map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>,
            ),
          )}
        </div>

        <h3>Triagem</h3>
        <div className="grid">
          {field(
            'Protocolo de Manchester',
            <select
              value={encounter.manchesterPriority}
              required
              onChange={(event) => setEncounter({ ...encounter, manchesterPriority: event.target.value })}
            >
              <option value="">Selecione</option>
              {Object.entries(MANCHESTER).map(([value, info]) => (
                <option key={value} value={value}>
                  {info.label}
                </option>
              ))}
            </select>,
          )}
          {field(
            'START (múltiplas vítimas)',
            <select value={encounter.startCategory} onChange={(event) => setEncounter({ ...encounter, startCategory: event.target.value })}>
              <option value="">Não se aplica</option>
              {Object.entries(START).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>,
          )}
        </div>

        <h3>Medicamentos administrados</h3>
        {medications.length === 0 && <p className="muted">Nenhum medicamento local. Use "Receber dados do Portal".</p>}
        {rows.map((row) => {
          const medication = medications.find((item) => item.id === row.medicationId);
          return (
            <div key={row.key} className="medication-row">
              <select value={row.medicationId} onChange={(event) => updateRow(row.key, { medicationId: event.target.value })} required>
                <option value="">Medicamento</option>
                {medications.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <input
                placeholder={medication ? `Dose (máx. ${medication.maximumDose} ${medication.unit})` : 'Dose'}
                value={row.dose}
                onChange={(event) => updateRow(row.key, { dose: event.target.value })}
                required
              />
              <select value={row.route} onChange={(event) => updateRow(row.key, { route: event.target.value })}>
                <option value="">Via</option>
                {ROUTES.map((route) => (
                  <option key={route}>{route}</option>
                ))}
              </select>
              <button
                type="button"
                className="secondary"
                aria-label="Remover medicamento"
                onClick={() => setRows(rows.filter((item) => item.key !== row.key))}
              >
                <IconTrash size={16} />
              </button>
            </div>
          );
        })}
        {doseErrors.map((error) => (
          <p key={error} className="alert">
            <IconAlertTriangle size={17} /> Dose bloqueada: {error}
          </p>
        ))}
        <button
          type="button"
          className="secondary"
          disabled={medications.length === 0}
          onClick={() => setRows([...rows, { key: Date.now(), medicationId: '', dose: '', route: '' }])}
        >
          <IconPlus size={16} /> Adicionar medicamento
        </button>

        <h3>Desfecho</h3>
        <div className="grid">
          {field('Procedimentos realizados', encounterInput('procedures'), true)}
          {field('Destino (hospital)', encounterInput('destination'))}
          {field('Observações', encounterInput('notes'), true)}
        </div>
      </section>

      {result && <p className={result.ok ? 'notice' : 'alert'}>{result.message}</p>}
      <button type="submit" className="primary-large" disabled={busy || doseErrors.length > 0}>
        {busy ? 'Salvando...' : 'Registrar ocorrência'}
      </button>
    </form>
  );
}
