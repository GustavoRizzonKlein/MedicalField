import { useCallback } from 'react';
import { getJson } from '../api';
import { Section, Table } from '../components/Table';
import { date, dateTime, text } from '../format';
import type { MedicalRecord, Medication, Person, Professional } from '../types';
import { useData } from '../useData';

export function MedicalRecordsView() {
  const load = useCallback(() => getJson<MedicalRecord[]>('clinical', '/medical-records'), []);
  const { data, error, loading, reload } = useData(load);
  return (
    <Section title="Prontuários" count={data?.length} loading={loading} error={error} onReload={reload}>
      <Table
        rows={data}
        rowKey={(row) => row.id}
        columns={[
          { header: 'Paciente', render: (row) => text(row.personName) },
          { header: 'Tipo sanguíneo', render: (row) => text(row.bloodType) },
          { header: 'Alergias', render: (row) => text(row.allergies) },
          { header: 'Condições crônicas', render: (row) => text(row.chronicConditions) },
          { header: 'Medicamentos contínuos', render: (row) => text(row.continuousMedications) },
          { header: 'Atualizado em', render: (row) => dateTime(row.updatedAt) },
          { header: 'Sincronizado em', render: (row) => dateTime(row.syncedAt) },
        ]}
      />
    </Section>
  );
}

export function PersonsView() {
  const load = useCallback(() => getJson<Person[]>('clinical', '/persons'), []);
  const { data, error, loading, reload } = useData(load);
  return (
    <Section title="Pessoas" count={data?.length} loading={loading} error={error} onReload={reload}>
      <Table
        rows={data}
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

export function MedicationsView() {
  const load = useCallback(() => getJson<Medication[]>('clinical', '/medications'), []);
  const { data, error, loading, reload } = useData(load);
  return (
    <Section title="Medicamentos" count={data?.length} loading={loading} error={error} onReload={reload}>
      <p className="muted">Novos medicamentos são inseridos diretamente no banco (tabela medication).</p>
      <Table
        rows={data}
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

export function ProfessionalsView() {
  const load = useCallback(() => getJson<Professional[]>('identity', '/professionals'), []);
  const { data, error, loading, reload } = useData(load);
  return (
    <Section title="Profissionais" count={data?.length} loading={loading} error={error} onReload={reload}>
      <Table
        rows={data}
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
