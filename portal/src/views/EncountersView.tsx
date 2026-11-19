import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { getBlob, getJson, postJson } from '../api';
import { PriorityBadge, Section, Table } from '../components/Table';
import { MANCHESTER, START, dateTime, text } from '../format';
import type { Encounter, Person } from '../types';
import { useData } from '../useData';

export function EncountersView() {
  const load = useCallback(() => getJson<Encounter[]>('clinical', '/encounters'), []);
  const { data, error, loading, reload } = useData(load);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data?.find((encounter) => encounter.id === selectedId) ?? null;

  return (
    <div className="split">
      <Section title="Atendimentos" count={data?.length} loading={loading} error={error} onReload={reload}>
        <Table
          rows={data}
          rowKey={(row) => row.id}
          selectedKey={selectedId}
          onRowClick={(row) => setSelectedId(row.id)}
          empty="Nenhum atendimento sincronizado ainda."
          columns={[
            { header: 'Data/hora', render: (row) => dateTime(row.occurredAt) },
            { header: 'Paciente', render: (row) => text(row.personName) },
            { header: 'Queixa', render: (row) => text(row.chiefComplaint) },
            { header: 'Manchester', render: (row) => <PriorityBadge priority={row.manchesterPriority} labels={MANCHESTER} /> },
            { header: 'Glasgow', render: (row) => row.glasgowTotal },
            { header: 'Profissional', render: (row) => row.professionalName },
            { header: 'Sincronizado em', render: (row) => dateTime(row.syncedAt) },
          ]}
        />
      </Section>
      {selected && <EncounterDetail encounter={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function EncounterDetail({ encounter, onClose }: { encounter: Encounter; onClose: () => void }) {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Suggests the patient's e-mail as recipient when it was registered.
  useEffect(() => {
    setMessage(null);
    setRecipient('');
    if (encounter.personId) {
      getJson<Person>('clinical', `/persons/${encounter.personId}`)
        .then((person) => setRecipient(person.email ?? ''))
        .catch(() => setRecipient(''));
    }
  }, [encounter.id, encounter.personId]);

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

  const vitals = [
    ['Pressão arterial', encounter.systolicBp && encounter.diastolicBp ? `${encounter.systolicBp}/${encounter.diastolicBp} mmHg` : null],
    ['Freq. cardíaca', encounter.heartRate !== null ? `${encounter.heartRate} bpm` : null],
    ['Freq. respiratória', encounter.respiratoryRate !== null ? `${encounter.respiratoryRate} irpm` : null],
    ['SpO2', encounter.oxygenSaturation !== null ? `${encounter.oxygenSaturation}%` : null],
    ['Temperatura', encounter.temperature !== null ? `${encounter.temperature} °C` : null],
    ['Glicemia', encounter.bloodGlucose !== null ? `${encounter.bloodGlucose} mg/dL` : null],
  ];

  return (
    <aside className="panel detail">
      <header className="panel-header">
        <h2>Ficha de atendimento</h2>
        <button type="button" className="secondary" onClick={onClose}>
          Fechar
        </button>
      </header>
      <dl>
        <dt>Paciente</dt>
        <dd>{text(encounter.personName)}</dd>
        <dt>Data/hora</dt>
        <dd>{dateTime(encounter.occurredAt)}</dd>
        <dt>Local</dt>
        <dd>{text(encounter.location)}</dd>
        <dt>Profissional</dt>
        <dd>{encounter.professionalName}</dd>
        <dt>Queixa principal</dt>
        <dd>{encounter.chiefComplaint}</dd>
        <dt>Glasgow</dt>
        <dd>
          {encounter.glasgowTotal} (O{encounter.glasgowEye} V{encounter.glasgowVerbal} M{encounter.glasgowMotor})
        </dd>
        <dt>Manchester</dt>
        <dd>
          <PriorityBadge priority={encounter.manchesterPriority} labels={MANCHESTER} />
        </dd>
        <dt>START</dt>
        <dd>{encounter.startCategory ? START[encounter.startCategory] : '-'}</dd>
        {vitals.map(([label, value]) => (
          <div key={label} className="dl-row">
            <dt>{label}</dt>
            <dd>{text(value)}</dd>
          </div>
        ))}
        <dt>Procedimentos</dt>
        <dd>{text(encounter.procedures)}</dd>
        <dt>Destino</dt>
        <dd>{text(encounter.destination)}</dd>
        <dt>Observações</dt>
        <dd>{text(encounter.notes)}</dd>
      </dl>

      <h3>Medicamentos administrados</h3>
      {encounter.medications.length === 0 ? (
        <p className="muted">Nenhum.</p>
      ) : (
        <ul>
          {encounter.medications.map((item) => (
            <li key={item.id}>
              {item.medicationName}: {item.dose} {item.unit} {item.route ? `(${item.route})` : ''} - {dateTime(item.administeredAt)}
            </li>
          ))}
        </ul>
      )}

      <div className="actions">
        <button type="button" onClick={downloadPdf} disabled={busy}>
          Baixar ficha (PDF)
        </button>
        <form onSubmit={sendEmail} className="inline-form">
          <input
            type="email"
            placeholder="E-mail do paciente ou familiar"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            required
          />
          <button type="submit" disabled={busy}>
            Enviar por e-mail
          </button>
        </form>
      </div>
      {message && <p className={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</p>}
    </aside>
  );
}
