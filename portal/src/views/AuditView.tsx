import { useCallback } from 'react';
import { type Service, getJson } from '../api';
import { Section, Table } from '../components/Table';
import { dateTime, text } from '../format';
import { useData } from '../useData';

interface AccessLog {
  occurredAt: string;
  clientIp: string;
  professionalId: string | null;
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
}

interface ClientLog {
  id: string;
  professionalName: string | null;
  deviceId: string;
  occurredAt: string;
  level: string;
  action: string;
  details: string | null;
  receivedAt: string;
}

interface EmailLog {
  id: number;
  encounterId: string;
  recipient: string;
  status: string;
  error: string | null;
  sentAt: string;
}

export function AuditView() {
  return (
    <>
      <AccessLogs title="Logs de acesso - serviço clínico (Java)" service="clinical" path="/access-logs?limit=50" />
      <AccessLogs title="Logs de acesso - serviço de identidade (Node)" service="identity" path="/logs/access?limit=50" />
      <ClientLogs />
      <EmailLogs />
    </>
  );
}

function AccessLogs({ title, service, path }: { title: string; service: Service; path: string }) {
  const load = useCallback(() => getJson<AccessLog[]>(service, path), [service, path]);
  const { data, error, loading, reload } = useData(load);
  return (
    <Section title={title} count={data?.length} loading={loading} error={error} onReload={reload}>
      <Table
        rows={data}
        rowKey={(row) => `${row.occurredAt}-${row.route}-${row.durationMs}-${row.method}`}
        columns={[
          { header: 'Data/hora', render: (row) => dateTime(row.occurredAt) },
          { header: 'IP', render: (row) => row.clientIp },
          { header: 'Profissional', render: (row) => text(row.professionalId?.slice(0, 8)) },
          { header: 'Método', render: (row) => row.method },
          { header: 'Rota', render: (row) => row.route },
          { header: 'Status', render: (row) => row.statusCode },
          { header: 'Tempo (ms)', render: (row) => row.durationMs },
        ]}
      />
    </Section>
  );
}

function ClientLogs() {
  const load = useCallback(() => getJson<ClientLog[]>('identity', '/logs/client?limit=50'), []);
  const { data, error, loading, reload } = useData(load);
  return (
    <Section title="Logs do cliente (gravados offline)" count={data?.length} loading={loading} error={error} onReload={reload}>
      <Table
        rows={data}
        rowKey={(row) => row.id}
        columns={[
          { header: 'Ocorrido em', render: (row) => dateTime(row.occurredAt) },
          { header: 'Recebido em', render: (row) => dateTime(row.receivedAt) },
          { header: 'Profissional', render: (row) => text(row.professionalName) },
          { header: 'Dispositivo', render: (row) => row.deviceId },
          { header: 'Ação', render: (row) => row.action },
          { header: 'Detalhes', render: (row) => text(row.details) },
        ]}
      />
    </Section>
  );
}

function EmailLogs() {
  const load = useCallback(() => getJson<EmailLog[]>('documents', '/care-reports/emails?limit=50'), []);
  const { data, error, loading, reload } = useData(load);
  return (
    <Section title="Fichas enviadas por e-mail (Python)" count={data?.length} loading={loading} error={error} onReload={reload}>
      <Table
        rows={data}
        rowKey={(row) => row.id}
        columns={[
          { header: 'Enviado em', render: (row) => dateTime(row.sentAt) },
          { header: 'Destinatário', render: (row) => row.recipient },
          { header: 'Atendimento', render: (row) => row.encounterId.slice(0, 8) },
          { header: 'Status', render: (row) => (row.status === 'SENT' ? 'Enviado' : `Falhou: ${text(row.error)}`) },
        ]}
      />
    </Section>
  );
}
