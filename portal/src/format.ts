export const MANCHESTER: Record<string, { label: string; color: string }> = {
  RED: { label: 'Vermelho - emergência', color: '#d32f2f' },
  ORANGE: { label: 'Laranja - muito urgente', color: '#ef6c00' },
  YELLOW: { label: 'Amarelo - urgente', color: '#f9a825' },
  GREEN: { label: 'Verde - pouco urgente', color: '#2e7d32' },
  BLUE: { label: 'Azul - não urgente', color: '#1565c0' },
};

export const START: Record<string, string> = {
  RED: 'Vermelho - imediato',
  YELLOW: 'Amarelo - tardio',
  GREEN: 'Verde - leve',
  BLACK: 'Preto - expectante',
};

export function dateTime(value: string | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function date(value: string | null | undefined): string {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function text(value: unknown): string {
  return value === null || value === undefined || value === '' ? '-' : String(value);
}
