export const MANCHESTER: Record<string, { label: string; color: string }> = {
  RED: { label: 'Vermelho', color: '#e5484d' },
  ORANGE: { label: 'Laranja', color: '#f97316' },
  YELLOW: { label: 'Amarelo', color: '#f5a524' },
  GREEN: { label: 'Verde', color: '#22c55e' },
  BLUE: { label: 'Azul', color: '#3b82f6' },
};

export const MANCHESTER_DESCRIPTION: Record<string, string> = {
  RED: 'Emergência',
  ORANGE: 'Muito urgente',
  YELLOW: 'Urgente',
  GREEN: 'Pouco urgente',
  BLUE: 'Não urgente',
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

export function time(value: string): string {
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function date(value: string | null | undefined): string {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function text(value: unknown): string {
  return value === null || value === undefined || value === '' ? '-' : String(value);
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}
