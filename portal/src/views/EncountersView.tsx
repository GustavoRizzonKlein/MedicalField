import {
  IconActivity,
  IconAlertTriangle,
  IconCloudUpload,
  IconDownload,
  IconMail,
  IconUrgent,
  IconX,
} from '@tabler/icons-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { getBlob, getJson, postJson } from '../api';
import type { ViewProps } from '../App';
import { PriorityBadge, Section, Table } from '../components/Table';
import { MANCHESTER, MANCHESTER_DESCRIPTION, START, dateTime, text, time } from '../format';
import type { Encounter, MedicalRecord, Person } from '../types';
import { useData } from '../useData';

// An encounter that reached the server more than a minute after it was saved on the device
// was registered offline and arrived through the client's Outbox.
const OFFLINE_THRESHOLD_MS = 60_000;

function isToday(value: string) {
  return new Date(value).toDateString() === new Date().toDateString();
}

export function EncountersView({ search }: ViewProps) {
  const load = useCallback(() => getJson<Encounter[]>('clinical', '/encounters'), []);
  const { data, error, loading, reload } = useData(load);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = data?.filter((encounter) => !search || (encounter.personName ?? '').toLowerCase().includes(search)) ?? null;
  const selected = data?.find((encounter) => encounter.id === selectedId) ?? null;

  const today = data?.filter((encounter) => isToday(encounter.occurredAt)) ?? [];
  const emergencies = today.filter((encounter) => encounter.manchesterPriority === 'RED').length;
  const averageGlasgow = data && data.length > 0 ? data.reduce((sum, encounter) => sum + encounter.glasgowTotal, 0) / data.length : null;
  const offline =
    data?.filter((encounter) => Date.parse(encounter.syncedAt) - Date.parse(encounter.createdAt) > OFFLINE_THRESHOLD_MS).length ?? 0;

  return (
    <>
      <div className="kpis">
        <div className="glass kpi">
          <div className="label">
            <IconActivity size={15} /> Atendimentos hoje
          </div>
          <div className="value">{today.length}</div>
          <div className="hint">{data?.length ?? 0} no total</div>
        </div>
        <div className="glass kpi danger">
          <div className="label">
            <IconUrgent size={15} /> Emergências hoje
          </div>
          <div className="value">{emergencies}</div>
          <div className="hint">Manchester vermelho</div>
        </div>
        <div className="glass kpi">
          <div className="label">Glasgow médio</div>
          <div className="value">{averageGlasgow === null ? '-' : averageGlasgow.toFixed(1).replace('.', ',')}</div>
          <div className="hint">escala de 3 a 15</div>
        </div>
        <div className="glass kpi">
          <div className="label">
            <IconCloudUpload size={15} /> Registrados offline
          </div>
          <div className="value" style={{ color: 'var(--violet)' }}>
            {offline}
          </div>
          <div className="hint">chegaram pela Outbox</div>
        </div>
      </div>

      <div className="split">
        <Section title="Atendimentos" count={rows?.length} loading={loading} error={error} onReload={reload}>
          <Table
            rows={rows}
            rowKey={(row) => row.id}
            selectedKey={selectedId}
            onRowClick={(row) => setSelectedId(row.id)}
            empty={search ? 'Nenhum atendimento para essa busca.' : 'Nenhum atendimento sincronizado ainda.'}
            columns={[
              { header: 'Data', render: (row) => (isToday(row.occurredAt) ? `Hoje, ${time(row.occurredAt)}` : dateTime(row.occurredAt)) },
              { header: 'Paciente', render: (row) => text(row.personName) },
              { header: 'Queixa', render: (row) => text(row.chiefComplaint) },
              { header: 'Triagem', render: (row) => <PriorityBadge priority={row.manchesterPriority} labels={MANCHESTER} /> },
              {
                header: 'GCS',
                render: (row) => <span className={row.glasgowTotal <= 8 ? 'error' : undefined}>{row.glasgowTotal}</span>,
              },
              { header: 'Profissional', render: (row) => row.professionalName },
            ]}
          />
        </Section>
        {selected && <EncounterDetail encounter={selected} onClose={() => setSelectedId(null)} />}
      </div>
    </>
  );
}

function EncounterDetail({ encounter, onClose }: { encounter: Encounter; onClose: () => void }) {
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Loads the medical record (allergies) and suggests the patient's e-mail as recipient.
  useEffect(() => {
    setMessage(null);
    setRecipient('');
    setRecord(null);
    getJson<MedicalRecord>('clinical', `/medical-records/${encounter.medicalRecordId}`)
      .then(setRecord)
      .catch(() => setRecord(null));
    if (encounter.personId) {
      getJson<Person>('clinical', `/persons/${encounter.personId}`)
        .then((person) => setRecipient(person.email ?? ''))
        .catch(() => setRecipient(''));
    }
  }, [encounter.id, encounter.medicalRecordId, encounter.personId]);

  async function downloadPdf() {
    setBusy(true);
    setMessage(null);
    try {
      const blob = await getBlob('documents', `/care-reports/${encounter.id}/pdf`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ficha-atendimento-${encounter.id.slice(0, 8)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage({ kind: 'ok', text: 'Ficha gerada.' });
    } catch (exception) {
      setMessage({ kind: 'error', text: exception instanceof Error ? exception.message : 'Falha ao gerar a ficha' });
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const result = await postJson<{ status: string; mode: string }>('documents', `/care-reports/${encounter.id}/email`, {
        to: recipient,
      });
      const where = result.mode === 'file' ? ' (modo arquivo: salvo em document-service/outbox)' : '';
      setMessage({ kind: 'ok', text: `E-mail enviado para ${recipient}${where}.` });
    } catch (exception) {
      setMessage({ kind: 'error', text: exception instanceof Error ? exception.message : 'Falha ao enviar' });
    } finally {
      setBusy(false);
    }
  }

  const triage = MANCHESTER[encounter.manchesterPriority];
  const vitals: [string, string | null][] = [
    ['PA', encounter.systolicBp && encounter.diastolicBp ? `${encounter.systolicBp}/${encounter.diastolicBp}` : null],
    ['FC', encounter.heartRate !== null ? `${encounter.heartRate} bpm` : null],
    ['FR', encounter.respiratoryRate !== null ? `${encounter.respiratoryRate} irpm` : null],
    ['SpO2', encounter.oxygenSaturation !== null ? `${encounter.oxygenSaturation}%` : null],
    ['Temp.', encounter.temperature !== null ? `${encounter.temperature} °C` : null],
    ['Glasgow', `${encounter.glasgowTotal} (O${encounter.glasgowEye} V${encounter.glasgowVerbal} M${encounter.glasgowMotor})`],
  ];

  return (
    <aside className="panel detail">
      <div className="detail-title">
        <div>
          <h2>{text(encounter.personName)}</h2>
          <span className="muted">
            {dateTime(encounter.occurredAt)} · {text(encounter.location)}
          </span>
        </div>
        <button type="button" className="secondary" onClick={onClose} aria-label="Fechar">
          <IconX size={16} />
        </button>
      </div>

      <span
        className="badge"
        style={{ background: `${triage?.color ?? '#888'}33`, borderColor: `${triage?.color ?? '#888'}99`, justifySelf: 'start' }}
      >
        <span className="dot" style={{ background: triage?.color }} />
        {triage?.label} · {MANCHESTER_DESCRIPTION[encounter.manchesterPriority]}
      </span>

      {record?.allergies && (
        <div className="alert">
          <IconAlertTriangle size={17} /> Alergia: {record.allergies}
        </div>
      )}

      <div className="vitals">
        {vitals.map(([label, value]) => (
          <div key={label} className="vital">
            <div className="label">{label}</div>
            <div className="value">{text(value)}</div>
          </div>
        ))}
      </div>

      <dl>
        <dt>Queixa</dt>
        <dd>{encounter.chiefComplaint}</dd>
        <dt>Profissional</dt>
        <dd>{encounter.professionalName}</dd>
        <dt>START</dt>
        <dd>{encounter.startCategory ? START[encounter.startCategory] : '-'}</dd>
        <dt>Tipo sanguíneo</dt>
        <dd>{text(record?.bloodType)}</dd>
        <dt>Procedimentos</dt>
        <dd>{text(encounter.procedures)}</dd>
        <dt>Destino</dt>
        <dd>{text(encounter.destination)}</dd>
        <dt>Observações</dt>
        <dd>{text(encounter.notes)}</dd>
      </dl>

      <div>
        <h3>Medicamentos administrados</h3>
        {encounter.medications.length === 0 ? (
          <p className="muted">Nenhum.</p>
        ) : (
          <ul>
            {encounter.medications.map((item) => (
              <li key={item.id}>
                {item.medicationName}: {item.dose} {item.unit} {item.route ? `(${item.route})` : ''} · {time(item.administeredAt)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="actions">
        <button type="button" onClick={downloadPdf} disabled={busy}>
          <IconDownload size={17} /> Baixar ficha (PDF)
        </button>
        <form onSubmit={sendEmail} className="inline-form">
          <input
            type="email"
            placeholder="E-mail do paciente ou familiar"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            required
          />
          <button type="submit" className="secondary" disabled={busy}>
            <IconMail size={17} /> Enviar
          </button>
        </form>
      </div>
      {message && <p className={message.kind === 'ok' ? 'notice' : 'alert'}>{message.text}</p>}
    </aside>
  );
}
