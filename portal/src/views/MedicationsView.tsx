import { IconPencil, IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
import { useCallback, useState, type FormEvent } from 'react';
import { deleteJson, getJson, postJson, putJson } from '../api';
import type { ViewProps } from '../App';
import { Section, Table } from '../components/Table';
import type { Medication } from '../types';
import { useData } from '../useData';

interface FormState {
  id: string | null; // null = new medication
  name: string;
  unit: string;
  maximumDose: string;
  active: boolean;
}

const EMPTY_FORM: FormState = { id: null, name: '', unit: 'mg', maximumDose: '', active: true };

const UNITS = ['mg', 'mcg', 'g', 'mL', 'UI', 'gotas'];

/** Medication registry: create, list, edit and delete (CRUD) for administrators. */
export function MedicationsView({ search }: ViewProps) {
  const load = useCallback(() => getJson<Medication[]>('clinical', '/medications'), []);
  const { data, error, loading, reload } = useData(load);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const rows = data?.filter((row) => !search || row.name.toLowerCase().includes(search)) ?? null;

  function openNew() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setNotice(null);
  }

  function openEdit(row: Medication) {
    setForm({ id: row.id, name: row.name, unit: row.unit, maximumDose: String(row.maximumDose), active: row.active });
    setFormError(null);
    setNotice(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const maximumDose = Number(form.maximumDose.replace(',', '.'));
    if (!form.name.trim() || !form.unit.trim() || !(maximumDose > 0)) {
      setFormError('Preencha nome, unidade e uma dose máxima maior que zero.');
      return;
    }
    const body = { name: form.name.trim(), unit: form.unit.trim(), maximumDose, active: form.active };
    setSaving(true);
    setFormError(null);
    try {
      if (form.id) {
        await putJson('clinical', `/medications/${form.id}`, body);
        setNotice(`${body.name} atualizado.`);
      } else {
        await postJson('clinical', '/medications', body);
        setNotice(`${body.name} cadastrado. Os clientes recebem no próximo "Receber dados".`);
      }
      setForm(null);
      await reload();
    } catch (exception) {
      setFormError(exception instanceof Error ? exception.message : String(exception));
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Medication) {
    if (!window.confirm(`Excluir ${row.name}?`)) return;
    setNotice(null);
    try {
      const result = await deleteJson<{ outcome: 'DELETED' | 'DEACTIVATED' }>('clinical', `/medications/${row.id}`);
      setNotice(
        result.outcome === 'DELETED'
          ? `${row.name} excluído.`
          : `${row.name} já foi usado em atendimentos, então foi desativado (o histórico continua mostrando o nome).`,
      );
      if (form?.id === row.id) setForm(null);
      await reload();
    } catch (exception) {
      setNotice(null);
      window.alert(exception instanceof Error ? exception.message : String(exception));
    }
  }

  async function reactivate(row: Medication) {
    try {
      await putJson('clinical', `/medications/${row.id}`, { ...row, active: true });
      setNotice(`${row.name} reativado.`);
      await reload();
    } catch (exception) {
      window.alert(exception instanceof Error ? exception.message : String(exception));
    }
  }

  return (
    <Section
      title="Medicamentos"
      count={rows?.length}
      loading={loading}
      error={error}
      onReload={reload}
      actions={
        <button type="button" onClick={openNew}>
          <IconPlus size={16} /> Novo medicamento
        </button>
      }
    >
      {notice && <p className="notice">{notice}</p>}

      {form && (
        <form className="glass crud-form" onSubmit={save}>
          <h3>{form.id ? 'Editar medicamento' : 'Novo medicamento'}</h3>
          <div className="crud-grid">
            <label>
              Nome
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </label>
            <label>
              Unidade
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {(UNITS.includes(form.unit) ? UNITS : [form.unit, ...UNITS]).map((unit) => (
                  <option key={unit}>{unit}</option>
                ))}
              </select>
            </label>
            <label>
              Dose máxima
              <input
                inputMode="decimal"
                value={form.maximumDose}
                onChange={(e) => setForm({ ...form, maximumDose: e.target.value })}
              />
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Ativo
            </label>
          </div>
          {formError && <p className="alert">{formError}</p>}
          <div className="crud-actions">
            <button type="button" className="secondary" onClick={() => setForm(null)} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      <Table
        rows={rows}
        rowKey={(row) => row.id}
        columns={[
          { header: 'Nome', render: (row) => row.name },
          { header: 'Unidade', render: (row) => row.unit },
          { header: 'Dose máxima', render: (row) => `${row.maximumDose} ${row.unit}` },
          {
            header: 'Situação',
            render: (row) => (
              <span className="badge">
                <span className="dot" style={{ background: row.active ? '#22c55e' : '#6b7280' }} />
                {row.active ? 'Ativo' : 'Inativo'}
              </span>
            ),
          },
          {
            header: 'Ações',
            render: (row) => (
              <div className="row-actions">
                <button type="button" className="icon-btn" title="Editar" aria-label={`Editar ${row.name}`} onClick={() => openEdit(row)}>
                  <IconPencil size={16} />
                </button>
                {row.active ? (
                  <button type="button" className="icon-btn danger" title="Excluir" aria-label={`Excluir ${row.name}`} onClick={() => remove(row)}>
                    <IconTrash size={16} />
                  </button>
                ) : (
                  <button type="button" className="icon-btn" title="Reativar" aria-label={`Reativar ${row.name}`} onClick={() => reactivate(row)}>
                    <IconRefresh size={16} />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />
    </Section>
  );
}
