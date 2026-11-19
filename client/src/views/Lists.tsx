import { type ReactNode, useEffect, useState } from 'react';
import type { EncounterItem, MedicationItem, OutboxItem, PatientItem } from '../../shared/contract';
import { MANCHESTER } from '../clinical';

function useList<T>(load: () => Promise<T[]>, version: number) {
  const [rows, setRows] = useState<T[] | null>(null);
  useEffect(() => {
    void load().then(setRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
  return rows;
}

function dateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function SyncBadge({ status }: { status: 'SYNCED' | 'PENDING' }) {
  return <span className={`badge ${status === 'SYNCED' ? 'synced' : 'pending'}`}>{status === 'SYNCED' ? 'Sincronizado' : 'Pendente'}</span>;
}

function Panel({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="panel">
      <h2>
        {title}
        {count !== undefined && <span className="count">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  if (rows.length === 0) return <p className="muted">Nenhum registro.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, index) => (
            <tr key={index}>
              {cells.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PatientsList({ version }: { version: number }) {
  const rows = useList<PatientItem>(() => window.medicalField.listPatients(), version);
  if (!rows) return null;
  return (
    <Panel title="Pacientes neste dispositivo" count={rows.length}>
      <Table
        headers={['Nome', 'Nascimento', 'Tipo sanguíneo', 'Alergias', 'Condições crônicas', 'Situação']}
        rows={rows.map((row) => [
          row.fullName,
          row.birthDate ?? '-',
          row.bloodType ?? '-',
          row.allergies ? <b className="error">{row.allergies}</b> : '-',
          row.chronicConditions ?? '-',
          <SyncBadge status={row.syncStatus} />,
        ])}
      />
    </Panel>
  );
}

export function EncountersList({ version }: { version: number }) {
  const rows = useList<EncounterItem>(() => window.medicalField.listEncounters(), version);
  if (!rows) return null;
  return (
    <Panel title="Atendimentos neste dispositivo" count={rows.length}>
      <Table
        headers={['Data/hora', 'Paciente', 'Queixa', 'Manchester', 'Glasgow', 'Profissional', 'Situação']}
        rows={rows.map((row) => [
          dateTime(row.occurredAt),
          row.personName ?? '-',
          row.chiefComplaint,
          <span className="badge" style={{ background: MANCHESTER[row.manchesterPriority]?.color }}>
            {MANCHESTER[row.manchesterPriority]?.label ?? row.manchesterPriority}
          </span>,
          row.glasgowTotal,
          row.professionalName ?? '-',
          <SyncBadge status={row.syncStatus} />,
        ])}
      />
    </Panel>
  );
}

const OPERATION_LABELS: Record<string, string> = {
  PERSON_UPSERT: 'Pessoa',
  MEDICAL_RECORD_UPSERT: 'Prontuário',
  ENCOUNTER_CREATE: 'Atendimento',
};

export function OutboxList({ version }: { version: number }) {
  const rows = useList<OutboxItem>(() => window.medicalField.listOutbox(), version);
  if (!rows) return null;
  return (
    <Panel title="Fila de sincronização (Outbox)" count={rows.length}>
      <p className="muted">
        Cada item é enviado em ordem quando a conexão está disponível. O identificador da operação evita que o servidor grave o mesmo
        registro duas vezes.
      </p>
      <Table
        headers={['Criado em', 'Tipo', 'Descrição', 'Tentativas', 'Situação']}
        rows={rows.map((row) => [
          dateTime(row.createdAt),
          OPERATION_LABELS[row.type] ?? row.type,
          row.label,
          row.attempts,
          row.status === 'FAILED' ? <span className="error">Erro: {row.lastError}</span> : 'Aguardando envio',
        ])}
      />
    </Panel>
  );
}

export function MedicationsList({ version }: { version: number }) {
  const rows = useList<MedicationItem>(() => window.medicalField.listMedications(), version);
  if (!rows) return null;
  return (
    <Panel title="Medicamentos (recebidos do Portal)" count={rows.length}>
      <Table
        headers={['Nome', 'Unidade', 'Dose máxima']}
        rows={rows.map((row) => [row.name, row.unit, `${row.maximumDose} ${row.unit}`])}
      />
    </Panel>
  );
}
