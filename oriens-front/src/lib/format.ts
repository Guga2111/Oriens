import { moneyCents } from './money';
/**
 * Formatação monetária única do app (SPEC §11.5): toda tela que exibe dinheiro
 * passa por aqui, para que o símbolo, o separador e as casas sejam os mesmos.
 */
const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | string): string {
  if (typeof value === 'number') return brlFormatter.format(value);
  const cents = moneyCents(value), abs = cents < 0n ? -cents : cents;
  return `${cents < 0n ? '−' : ''}${brlFormatter.formatToParts(abs / 100n)
    .map(part => part.type === 'fraction' ? String(abs % 100n).padStart(2, '0') : part.value).join('')}`;
}
