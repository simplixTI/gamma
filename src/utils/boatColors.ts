export interface BoatColorOption {
  value: string;
  label: string;
  hex: string;
}

export const BOAT_COLORS: readonly BoatColorOption[] = [
  { value: 'branco', label: 'Branco', hex: '#F8FAFC' },
  { value: 'azul', label: 'Azul', hex: '#1D4ED8' },
  { value: 'azul_claro', label: 'Azul claro', hex: '#38BDF8' },
  { value: 'vermelho', label: 'Vermelho', hex: '#DC2626' },
  { value: 'amarelo', label: 'Amarelo', hex: '#FACC15' },
  { value: 'verde', label: 'Verde', hex: '#16A34A' },
  { value: 'preto', label: 'Preto', hex: '#111827' },
  { value: 'cinza', label: 'Cinza', hex: '#6B7280' },
  { value: 'laranja', label: 'Laranja', hex: '#EA580C' },
  { value: 'bege', label: 'Bege', hex: '#D6BCA0' },
] as const;

export const getBoatColor = (value?: string | null): BoatColorOption | undefined => {
  if (!value) return undefined;
  return BOAT_COLORS.find((c) => c.value === value);
};
