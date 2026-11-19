import type { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[] | null;
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  selectedKey?: string | number | null;
  empty?: string;
}

export function Table<T>({ columns, rows, rowKey, onRowClick, selectedKey, empty = 'Nenhum registro.' }: TableProps<T>) {
  if (!rows) return null;
  if (rows.length === 0) return <p className="muted">{empty}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                className={[onRowClick ? 'clickable' : '', key === selectedKey ? 'selected' : ''].join(' ')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.header}>{column.render(row)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface SectionProps {
  title: string;
  count?: number;
  loading: boolean;
  error: string | null;
  onReload: () => void;
  children: ReactNode;
}

export function Section({ title, count, loading, error, onReload, children }: SectionProps) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>
          {title}
          {count !== undefined && <span className="count">{count}</span>}
        </h2>
        <button type="button" className="secondary" onClick={onReload} disabled={loading}>
          {loading ? 'Carregando...' : 'Atualizar'}
        </button>
      </header>
      {error && <p className="error">{error}</p>}
      {children}
    </section>
  );
}

export function PriorityBadge({ priority, labels }: { priority: string | null; labels: Record<string, { label: string; color: string }> }) {
  if (!priority) return <>-</>;
  const info = labels[priority];
  return (
    <span className="badge" style={{ background: info?.color ?? '#666' }}>
      {info?.label ?? priority}
    </span>
  );
}
