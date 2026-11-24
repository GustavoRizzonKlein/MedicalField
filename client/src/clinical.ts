export const MANCHESTER: Record<string, { label: string; color: string }> = {
  RED: { label: 'Vermelho - emergência', color: '#e5484d' },
  ORANGE: { label: 'Laranja - muito urgente', color: '#f97316' },
  YELLOW: { label: 'Amarelo - urgente', color: '#f5a524' },
  GREEN: { label: 'Verde - pouco urgente', color: '#22c55e' },
  BLUE: { label: 'Azul - não urgente', color: '#3b82f6' },
};

export const START: Record<string, string> = {
  RED: 'Vermelho - imediato',
  YELLOW: 'Amarelo - tardio',
  GREEN: 'Verde - leve (deambula)',
  BLACK: 'Preto - expectante/óbito',
};

// Glasgow Coma Scale options (value -> description)
export const GLASGOW_EYE: [number, string][] = [
  [4, '4 - Espontânea'],
  [3, '3 - Ao comando verbal'],
  [2, '2 - À dor'],
  [1, '1 - Ausente'],
];

export const GLASGOW_VERBAL: [number, string][] = [
  [5, '5 - Orientado'],
  [4, '4 - Confuso'],
  [3, '3 - Palavras inapropriadas'],
  [2, '2 - Sons incompreensíveis'],
  [1, '1 - Ausente'],
];

export const GLASGOW_MOTOR: [number, string][] = [
  [6, '6 - Obedece comandos'],
  [5, '5 - Localiza a dor'],
  [4, '4 - Retirada à dor'],
  [3, '3 - Flexão anormal'],
  [2, '2 - Extensão anormal'],
  [1, '1 - Ausente'],
];

export const ROUTES = ['IV', 'IM', 'VO', 'SC', 'IO', 'Inalatória', 'Sublingual'];
