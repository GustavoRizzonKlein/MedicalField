import { useCallback } from 'react';
import { getJson } from '../api';
import type { ViewProps } from '../App';
import { Section, Table } from '../components/Table';
import { date, dateTime, text } from '../format';
import type { MedicalRecord, Medication, Person, Professional } from '../types';
import { useData } from '../useData';

function matches(value: string | null | undefined, search: string) {
  return !search || (value ?? '').toLowerCase().includes(search);
}

export function MedicalRecordsView({ search }: ViewProps) {
  const load = useCallback(() => getJson<MedicalRecord[]>('clinical', '/medical-records'), []);
  const { data, error, loading, reload } = useData(load);
  const rows = data?.filter((row) => matches(row.personName, search)) ?? null;
  return (
    <Section title="Prontuários" count={rows?.length} loading={loading} error={error} onReload={reload}>
      <Table
        rows={rows}
        rowKey={(row) => row.id}
        columns={[
          { header: 'Paciente', render: (row) => text(row.personName) },
          { header: 'Tipo sanguíneo', render: (row) => text(row.bloodType) },
          { header: 'Alergias', render: (row) => (row.allergies ? <span className="error">{row.allergies}</span> : '-') },
          { header: 'Condições crônicas', render: (row) => text(row.chronicConditions) },
          { header: 'Medicamentos contínuos', render: (row) => text(row.continuousMedications) },
          { header: 'Atualizado em', render: (row) => dateTime(row.updatedAt) },
          { header: 'Sincronizado em', render: (row) => dateTime(row.syncedAt) },
        ]}
      />
    </Section>
  );
}

export function PersonsView({ search }: ViewProps) {
  const load = useCallback(() => getJson<Person[]>('clinical', '/persons'), []);
  const { data, error, loading, reload } = useData(load);
  const rows = data?.filter((row) => matches(row.fullName, search)) ?? null;
  return (
    <Section title="Pessoas" count={rows?.length} loading={loading} error={error} onReload={reload}>
      <Table
        rows={rows}
        rowKey={(row) => row.id}
        columns={[
          { header: 'Nome', render: (row) => row.fullName },
          { header: 'Nascimento', render: (row) => date(row.birthDate) },
          { header: 'Sexo', render: (row) => text(row.sex) },
          { header: 'Documento', render: (row) => text(row.documentNumber) },
          { header: 'Telefone', render: (row) => text(row.phone) },
          { header: 'E-mail', render: (row) => text(row.email) },
          { header: 'Sincronizado em', render: (row) => dateTime(row.syncedAt) },
        ]}
      />
    </Section>
  );
}

export function MedicationsView({ search }: ViewProps) {
  const load = useCallback(() => getJson<Medication[]>('clinical', '/medications'), []);
  const { data, error, loading, reload } = useData(load);
  const rows = data?.filter((row) => matches(row.name, search)) ?? null;
  return (
    <Section title="Medicamentos" count={rows?.length} loading={loading} error={error} onReload={reload}>
      <p className="muted" style={{ marginTop: 0 }}>
        Novos medicamentos são inseridos diretamente no banco (tabela medication).
      </p>
      <Table
        rows={rows}
        rowKey={(row) => row.id}
        columns={[
          { header: 'Nome', render: (row) => row.name },
          { header: 'Unidade', render: (row) => row.unit },
          { header: 'Dose máxima', render: (row) => `${row.maximumDose} ${row.unit}` },
        ]}
      />
    </Section>
  );
}

const REGISTRY_TYPES: Record<string, string> = { CRM: 'CRM', COREN: 'COREN', RESPONDER: 'Socorrista' };

export function ProfessionalsView({ search }: ViewProps) {
  const load = useCallback(() => getJson<Professional[]>('identity', '/professionals'), []);
  const { data, error, loading, reload } = useData(load);
  const rows = data?.filter((row) => matches(row.fullName, search)) ?? null;
  return (
    <Section title="Profissionais" count={rows?.length} loading={loading} error={error} onReload={reload}>
      <Table
        rows={rows}
        rowKey={(row) => row.id}
        columns={[
          { header: 'Nome', render: (row) => row.fullName },
          { header: 'Tipo', render: (row) => REGISTRY_TYPES[row.registryType] ?? row.registryType },
          { header: 'Registro', render: (row) => row.registryNumber },
          { header: 'Perfil', render: (row) => (row.role === 'ADMIN' ? 'Administrador' : 'Socorrista') },
        ]}
      />
    </Section>
  );
}
